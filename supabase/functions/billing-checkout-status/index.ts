import { pricingCorsHeaders, pricingJson } from '../_shared/checkout-ref.ts';
import { adminClient } from '../_shared/supabase.ts';
import { finalizePreboundPaddleTransaction } from '../_shared/billing-sync.ts';

function validTransactionId(value: unknown): value is string {
  return typeof value === 'string' && /^txn_[a-z\d]{26}$/.test(value);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: pricingCorsHeaders(req) });
  if (req.method !== 'POST') return pricingJson(req, { activated: false }, 405);

  try {
    const body = await req.json().catch(() => null) as { transactionId?: string } | null;
    if (!validTransactionId(body?.transactionId)) return pricingJson(req, { activated: false, status: 'invalid' });

    const result = await finalizePreboundPaddleTransaction(adminClient(), body.transactionId);
    return pricingJson(req, {
      activated: result.activated,
      source: result.activated ? (result.planKey === 'pro_lifetime' ? 'lifetime' : 'payment') : null,
      status: result.stage,
      plan: result.planKey,
      orderStatus: result.orderStatus,
      paddleStatus: result.paddleStatus,
      transactionId: result.transactionId,
      subscriptionId: result.subscriptionId,
    });
  } catch (error) {
    console.error('billing-checkout-status', error);
    return pricingJson(req, {
      activated: false,
      status: 'error',
      error: error instanceof Error ? error.message : 'CHECKOUT_STATUS_FAILED',
    }, 500);
  }
});
