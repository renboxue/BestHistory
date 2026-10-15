import { jsonResponse } from '../_shared/cors.ts';
import {
  dodoEnvironment,
  dodoPlanForProductId,
  dodoProductIdForPlan,
  dodoProviderEnvironment,
  dodoWebhookSecretConfigured,
  verifyDodoSignature,
} from '../_shared/dodo.ts';
import { adminClient } from '../_shared/supabase.ts';

type JsonMap = Record<string, any>;
type DodoWebhookEvent = {
  business_id?: string;
  type?: string;
  timestamp?: string;
  data?: JsonMap;
};

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function metadata(data: JsonMap): JsonMap {
  return data?.metadata && typeof data.metadata === 'object' ? data.metadata : {};
}

function productIdFrom(data: JsonMap): string | null {
  const direct = text(data?.product_id);
  if (direct) return direct;
  const cart = Array.isArray(data?.product_cart) ? data.product_cart : [];
  return text(cart?.[0]?.product_id);
}

async function recomputeEntitlement(admin: any, userId: string): Promise<void> {
  const now = Date.now();
  const { data: entitlementRow, error: entitlementReadError } = await admin
    .from('entitlements')
    .select('trial_valid_until')
    .eq('user_id', userId)
    .maybeSingle();
  if (entitlementReadError) throw entitlementReadError;
  const trialUntil = text(entitlementRow?.trial_valid_until);

  const { data: lifetimeOrder, error: lifetimeError } = await admin
    .from('billing_orders')
    .select('id')
    .eq('user_id', userId)
    .eq('plan_key', 'pro_lifetime')
    .eq('status', 'paid')
    .order('paid_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lifetimeError) throw lifetimeError;

  if (lifetimeOrder) {
    const { error } = await admin.from('entitlements').upsert({
      user_id: userId,
      plan: 'pro',
      status: 'active',
      source: 'lifetime',
      valid_until: null,
      grace_until: null,
    }, { onConflict: 'user_id' });
    if (error) throw error;
    return;
  }

  const { data: subscription, error: subscriptionError } = await admin
    .from('subscriptions')
    .select('status,current_period_end')
    .eq('user_id', userId)
    .in('status', ['active', 'trialing', 'past_due'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (subscriptionError) throw subscriptionError;

  if (subscription?.status === 'active' || subscription?.status === 'trialing') {
    const { error } = await admin.from('entitlements').upsert({
      user_id: userId,
      plan: 'pro',
      status: subscription.status,
      source: 'payment',
      valid_until: subscription.current_period_end || null,
      grace_until: null,
    }, { onConflict: 'user_id' });
    if (error) throw error;
    return;
  }

  if (subscription?.status === 'past_due') {
    const endMs = subscription.current_period_end ? Date.parse(subscription.current_period_end) : NaN;
    const anchor = Number.isFinite(endMs) ? endMs : now;
    const graceUntil = new Date(anchor + 7 * 24 * 60 * 60 * 1000).toISOString();
    if (Date.parse(graceUntil) > now) {
      const { error } = await admin.from('entitlements').upsert({
        user_id: userId,
        plan: 'pro',
        status: 'past_due',
        source: 'payment',
        valid_until: subscription.current_period_end || null,
        grace_until: graceUntil,
      }, { onConflict: 'user_id' });
      if (error) throw error;
      return;
    }
  }

  if (trialUntil && Date.parse(trialUntil) > now) {
    const { error } = await admin.from('entitlements').upsert({
      user_id: userId,
      plan: 'pro',
      status: 'trialing',
      source: 'trial',
      valid_until: trialUntil,
      grace_until: null,
    }, { onConflict: 'user_id' });
    if (error) throw error;
    return;
  }

  const { error } = await admin.from('entitlements').upsert({
    user_id: userId,
    plan: 'free',
    status: 'active',
    source: 'system',
    valid_until: null,
    grace_until: null,
  }, { onConflict: 'user_id' });
  if (error) throw error;
}

async function boundOrder(admin: any, data: JsonMap): Promise<any | null> {
  const meta = metadata(data);
  const orderId = text(meta.besthistory_order_id);
  const userId = text(meta.besthistory_user_id);
  const planCode = text(meta.plan_code);

  if (orderId) {
    const { data: order, error } = await admin.from('billing_orders')
      .select('*')
      .eq('id', orderId)
      .eq('provider', 'dodo')
      .eq('provider_environment', dodoProviderEnvironment())
      .maybeSingle();
    if (error) throw error;
    if (!order) return null;
    if (userId && order.user_id !== userId) throw new Error('DODO_BINDING_USER_MISMATCH');
    if (planCode && order.plan_key !== planCode) throw new Error('DODO_BINDING_PLAN_MISMATCH');
    return order;
  }

  const subscriptionId = text(data?.subscription_id);
  if (subscriptionId) {
    const { data: order, error } = await admin.from('billing_orders')
      .select('*')
      .eq('provider', 'dodo')
      .eq('provider_environment', dodoProviderEnvironment())
      .eq('provider_subscription_id', subscriptionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (order) return order;
  }

  const customerId = text(data?.customer?.customer_id);
  const productId = productIdFrom(data);
  const planId = dodoPlanForProductId(productId);
  if (customerId && planId) {
    const { data: order, error } = await admin.from('billing_orders')
      .select('*')
      .eq('provider', 'dodo')
      .eq('provider_environment', dodoProviderEnvironment())
      .eq('provider_customer_id', customerId)
      .eq('plan_key', planId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (order) return order;
  }

  return null;
}

async function processPaymentSucceeded(admin: any, data: JsonMap): Promise<string> {
  const order = await boundOrder(admin, data);
  if (!order) return 'ignored_unbound_payment';

  const productId = productIdFrom(data);
  const expectedProductId = dodoProductIdForPlan(order.plan_key);
  if (!productId || !expectedProductId || productId !== expectedProductId) {
    throw new Error('DODO_PRODUCT_MISMATCH');
  }

  const paymentId = text(data?.payment_id);
  const checkoutId = text(data?.checkout_session_id) || order.provider_checkout_id;
  const customerId = text(data?.customer?.customer_id);
  const subscriptionId = text(data?.subscription_id);
  const paidAt = text(data?.updated_at) || text(data?.created_at) || new Date().toISOString();

  const { error } = await admin.from('billing_orders').update({
    status: 'paid',
    provider_order_id: paymentId || order.provider_order_id,
    provider_checkout_id: checkoutId,
    provider_customer_id: customerId || order.provider_customer_id,
    provider_subscription_id: subscriptionId || order.provider_subscription_id,
    currency: text(data?.currency) || order.currency,
    amount_minor: Number.isFinite(Number(data?.total_amount)) ? Number(data.total_amount) : order.amount_minor,
    paid_at: paidAt,
    metadata: {
      ...(order.metadata || {}),
      dodo_payment_id: paymentId,
      dodo_checkout_session_id: checkoutId,
      dodo_status: text(data?.status),
    },
  }).eq('id', order.id).eq('user_id', order.user_id);
  if (error) throw error;

  if (customerId) {
    const { error: customerError } = await admin.from('billing_customers').upsert({
      user_id: order.user_id,
      provider: 'dodo',
      provider_environment: dodoProviderEnvironment(),
      provider_customer_id: customerId,
    }, { onConflict: 'provider,provider_environment,provider_customer_id' });
    if (customerError) throw customerError;
  }

  await recomputeEntitlement(admin, order.user_id);
  return 'payment_paid';
}

async function processSubscription(admin: any, eventType: string, data: JsonMap): Promise<string> {
  const order = await boundOrder(admin, data);
  if (!order) return 'ignored_unbound_subscription';

  const productId = productIdFrom(data);
  const productPlan = dodoPlanForProductId(productId);
  if (productPlan && productPlan !== order.plan_key) throw new Error('DODO_SUBSCRIPTION_PLAN_MISMATCH');

  const subscriptionId = text(data?.subscription_id);
  if (!subscriptionId) throw new Error('DODO_SUBSCRIPTION_ID_MISSING');
  const customerId = text(data?.customer?.customer_id);
  const nextBillingDate = text(data?.next_billing_date);
  const createdAt = text(data?.created_at);

  let status = text(data?.status) || 'active';
  let cancelAtPeriodEnd = Boolean(data?.cancel_at_next_billing_date);
  if (eventType === 'subscription.active' || eventType === 'subscription.renewed') status = 'active';
  if (eventType === 'subscription.past_due') status = 'past_due';
  if (eventType === 'subscription.cancelled') {
    cancelAtPeriodEnd = Boolean(data?.cancel_at_next_billing_date);
    status = cancelAtPeriodEnd ? 'active' : 'canceled';
  }
  if (eventType === 'subscription.expired') status = 'expired';

  const { error: subError } = await admin.from('subscriptions').upsert({
    user_id: order.user_id,
    provider: 'dodo',
    provider_environment: dodoProviderEnvironment(),
    provider_customer_id: customerId || order.provider_customer_id,
    provider_subscription_id: subscriptionId,
    plan_key: order.plan_key,
    status,
    current_period_start: createdAt,
    current_period_end: nextBillingDate,
    cancel_at_period_end: cancelAtPeriodEnd,
  }, { onConflict: 'provider,provider_subscription_id' });
  if (subError) throw subError;

  const { error: orderError } = await admin.from('billing_orders').update({
    provider_customer_id: customerId || order.provider_customer_id,
    provider_subscription_id: subscriptionId,
  }).eq('id', order.id).eq('user_id', order.user_id);
  if (orderError) throw orderError;

  await recomputeEntitlement(admin, order.user_id);
  return `subscription_${status}`;
}

async function processRefundSucceeded(admin: any, data: JsonMap): Promise<string> {
  const paymentId = text(data?.payment_id) || text(data?.payment?.payment_id);
  if (!paymentId) return 'ignored_refund_without_payment';

  const { data: order, error } = await admin.from('billing_orders')
    .select('*')
    .eq('provider', 'dodo')
    .eq('provider_environment', dodoProviderEnvironment())
    .eq('provider_order_id', paymentId)
    .maybeSingle();
  if (error) throw error;
  if (!order) return 'ignored_unbound_refund';

  const { error: updateError } = await admin.from('billing_orders').update({
    status: 'refunded',
    refunded_at: new Date().toISOString(),
  }).eq('id', order.id).eq('user_id', order.user_id);
  if (updateError) throw updateError;

  await recomputeEntitlement(admin, order.user_id);
  return 'payment_refunded';
}

Deno.serve(async (req) => {
  if (req.method === 'GET') {
    return jsonResponse({
      ok: true,
      provider: 'dodo',
      environment: dodoEnvironment(),
      providerEnvironment: dodoProviderEnvironment(),
      webhookSecretConfigured: dodoWebhookSecretConfigured(),
      stage: 'entitlement_ready',
    });
  }
  if (req.method !== 'POST') return jsonResponse({ error: 'METHOD_NOT_ALLOWED' }, 405);

  const rawBody = await req.text();
  const webhookId = req.headers.get('webhook-id')?.trim() || '';
  try {
    if (!dodoWebhookSecretConfigured()) return jsonResponse({ error: 'DODO_WEBHOOK_SECRET_NOT_CONFIGURED' }, 503);
    if (!(await verifyDodoSignature(rawBody, req.headers))) return jsonResponse({ error: 'INVALID_SIGNATURE' }, 401);

    const event = JSON.parse(rawBody) as DodoWebhookEvent;
    if (!webhookId || !event.type || !event.data) return jsonResponse({ error: 'INVALID_EVENT' }, 400);

    const admin = adminClient();
    const { error: insertError } = await admin.from('payment_events').insert({
      provider: 'dodo',
      provider_environment: dodoProviderEnvironment(),
      event_id: webhookId,
      event_type: event.type,
      status: 'received',
      payload: event,
    });

    if (insertError?.code === '23505') {
      const { data: existing, error: existingError } = await admin.from('payment_events')
        .select('status')
        .eq('provider', 'dodo')
        .eq('event_id', webhookId)
        .maybeSingle();
      if (existingError) throw existingError;
      if (existing?.status === 'processed' || existing?.status === 'ignored') {
        return jsonResponse({ ok: true, duplicate: true, status: existing.status });
      }
    } else if (insertError) {
      throw insertError;
    }

    let result = 'ignored_event';
    if (event.type === 'payment.succeeded') {
      result = await processPaymentSucceeded(admin, event.data);
    } else if ([
      'subscription.active',
      'subscription.renewed',
      'subscription.past_due',
      'subscription.cancelled',
      'subscription.expired',
    ].includes(event.type)) {
      result = await processSubscription(admin, event.type, event.data);
    } else if (event.type === 'refund.succeeded') {
      result = await processRefundSucceeded(admin, event.data);
    }

    const eventStatus = result.startsWith('ignored_') ? 'ignored' : 'processed';
    const { error: eventUpdateError } = await admin.from('payment_events').update({
      status: eventStatus,
      processed_at: new Date().toISOString(),
    }).eq('provider', 'dodo').eq('event_id', webhookId);
    if (eventUpdateError) throw eventUpdateError;

    return jsonResponse({ ok: true, received: true, processed: eventStatus === 'processed', result, eventType: event.type });
  } catch (error) {
    console.error('billing-dodo-webhook', error);
    if (webhookId) {
      try {
        const admin = adminClient();
        await admin.from('payment_events').update({ status: 'failed' })
          .eq('provider', 'dodo').eq('event_id', webhookId);
      } catch {
        // Preserve the original failure response.
      }
    }
    return jsonResponse({ error: error instanceof Error ? error.message : 'DODO_WEBHOOK_FAILED' }, 500);
  }
});
