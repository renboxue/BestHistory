import { jsonResponse } from '../_shared/cors.ts';
import { verifyPaddleSignature, paddleEnvironment } from '../_shared/paddle.ts';
import { adminClient } from '../_shared/supabase.ts';
import { finalizePreboundPaddleTransaction, syncPaddleAdjustment, syncPaddleSubscription, syncPaddleTransaction } from '../_shared/billing-sync.ts';

type PaddleEvent = {
  event_id?: string;
  event_type?: string;
  occurred_at?: string;
  data?: Record<string, any>;
};

const SUBSCRIPTION_EVENTS = new Set([
  'subscription.created',
  'subscription.updated',
  'subscription.activated',
  'subscription.trialing',
  'subscription.past_due',
  'subscription.paused',
  'subscription.resumed',
  'subscription.canceled',
]);

Deno.serve(async (req) => {
  if (req.method !== 'POST') return jsonResponse({ error: 'METHOD_NOT_ALLOWED' }, 405);
  const rawBody = await req.text();

  try {
    const valid = await verifyPaddleSignature(rawBody, req.headers.get('Paddle-Signature'));
    if (!valid) return jsonResponse({ error: 'INVALID_SIGNATURE' }, 401);

    const event = JSON.parse(rawBody) as PaddleEvent;
    if (!event.event_id || !event.event_type || !event.data) return jsonResponse({ error: 'INVALID_EVENT' }, 400);

    const admin = adminClient();
    const environment = paddleEnvironment();
    const { error: insertError } = await admin.from('payment_events').insert({
      provider: 'paddle',
      provider_environment: environment,
      event_id: event.event_id,
      event_type: event.event_type,
      status: 'received',
      payload: event,
    });
    if (insertError?.code === '23505') return jsonResponse({ ok: true, duplicate: true });
    if (insertError) throw insertError;

    try {
      let userId: string | null = null;
      if (event.event_type === 'transaction.completed') {
        const transactionId = typeof event.data?.id === 'string' ? event.data.id : '';
        if (/^txn_[a-z\d]{26}$/.test(transactionId)) {
          const finalized = await finalizePreboundPaddleTransaction(admin, transactionId);
          userId = finalized.userId;
        } else {
          userId = await syncPaddleTransaction(admin, event.data, event.event_type);
        }
      } else if (SUBSCRIPTION_EVENTS.has(event.event_type)) {
        userId = await syncPaddleSubscription(admin, event.data);
      } else if (event.event_type === 'adjustment.created' || event.event_type === 'adjustment.updated') {
        userId = await syncPaddleAdjustment(admin, event.data);
      }

      await admin.from('payment_events').update({
        status: userId ? 'processed' : 'ignored',
        processed_at: new Date().toISOString(),
      }).eq('provider', 'paddle').eq('event_id', event.event_id);

      return jsonResponse({ ok: true, processed: Boolean(userId) });
    } catch (processingError) {
      await admin.from('payment_events').update({ status: 'failed' })
        .eq('provider', 'paddle').eq('event_id', event.event_id);
      throw processingError;
    }
  } catch (error) {
    console.error('billing-paddle-webhook', error);
    return jsonResponse({ error: error instanceof Error ? error.message : 'WEBHOOK_FAILED' }, 500);
  }
});
