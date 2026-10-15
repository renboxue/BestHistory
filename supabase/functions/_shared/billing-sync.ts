import { checkoutRefHash, validCheckoutRef } from './checkout-ref.ts';
import {
  paddleEnvironment,
  paddlePriceIdForPlan,
  paddleRequest,
  planKeyFromBillingPlan,
  planKeyFromPriceId,
} from './paddle.ts';
import type { adminClient } from './supabase.ts';

type Admin = ReturnType<typeof adminClient>;
type PaddleData = Record<string, any>;
type CheckoutContext = {
  user_id: string;
  account_email: string;
  ref_hash: string;
  expires_at: string;
  consumed_at: string | null;
  last_transaction_id: string | null;
};

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function custom(data: PaddleData, key: string): string | null {
  return text(data?.custom_data?.[key]);
}

function priceId(data: PaddleData): string | null {
  const items = Array.isArray(data?.items) ? data.items : [];
  for (const item of items) {
    const id = text(item?.price?.id) || text(item?.price_id);
    if (id) return id;
  }
  return null;
}

export function planKeyForPaddleData(data: PaddleData): 'pro_monthly' | 'pro_yearly' | 'pro_lifetime' | null {
  return planKeyFromBillingPlan(custom(data, 'billing_plan')) || planKeyFromPriceId(priceId(data));
}

async function contextForRef(admin: Admin, checkoutRef: string): Promise<CheckoutContext | null> {
  if (!validCheckoutRef(checkoutRef)) return null;
  const refHash = await checkoutRefHash(checkoutRef);
  const { data, error } = await admin
    .from('billing_checkout_contexts')
    .select('user_id,account_email,ref_hash,expires_at,consumed_at,last_transaction_id')
    .eq('provider', 'paddle')
    .eq('provider_environment', paddleEnvironment())
    .eq('ref_hash', refHash)
    .maybeSingle();
  if (error) throw error;
  return data as CheckoutContext | null;
}

async function userFromExistingBilling(admin: Admin, data: PaddleData): Promise<string | null> {
  const subscriptionId = text(data?.subscription_id) || (text(data?.id)?.startsWith('sub_') ? text(data.id) : null);
  if (subscriptionId) {
    const { data: sub, error } = await admin
      .from('subscriptions')
      .select('user_id')
      .eq('provider', 'paddle')
      .eq('provider_environment', paddleEnvironment())
      .eq('provider_subscription_id', subscriptionId)
      .maybeSingle();
    if (error) throw error;
    if (sub?.user_id) return sub.user_id;

    const { data: orderBySubscription, error: orderBySubscriptionError } = await admin
      .from('billing_orders')
      .select('user_id')
      .eq('provider', 'paddle')
      .eq('provider_environment', paddleEnvironment())
      .eq('provider_subscription_id', subscriptionId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (orderBySubscriptionError) throw orderBySubscriptionError;
    if (orderBySubscription?.user_id) return orderBySubscription.user_id;
  }

  const transactionId = text(data?.transaction_id) || (text(data?.id)?.startsWith('txn_') ? text(data.id) : null);
  if (transactionId) {
    const { data: order, error } = await admin
      .from('billing_orders')
      .select('user_id')
      .eq('provider', 'paddle')
      .eq('provider_environment', paddleEnvironment())
      .eq('provider_order_id', transactionId)
      .maybeSingle();
    if (error) throw error;
    if (order?.user_id) return order.user_id;
  }
  return null;
}

export async function resolvePaddleUser(admin: Admin, data: PaddleData): Promise<{ userId: string; context: CheckoutContext | null } | null> {
  // Step 41 primary path: a trusted server already persisted txn_xxx -> user_id before checkout.
  const userId = await userFromExistingBilling(admin, data);
  if (userId) return { userId, context: null };

  // Backward-compatible fallback for the temporary Step 39/40 checkout_ref Sandbox flow.
  const checkoutRef = custom(data, 'checkout_ref');
  if (checkoutRef) {
    const context = await contextForRef(admin, checkoutRef);
    if (context) return { userId: context.user_id, context };
  }
  return null;
}

async function upsertCustomer(admin: Admin, userId: string, data: PaddleData): Promise<void> {
  const customerId = text(data?.customer_id);
  if (!customerId) return;
  const { error } = await admin.from('billing_customers').upsert({
    user_id: userId,
    provider: 'paddle',
    provider_environment: paddleEnvironment(),
    provider_customer_id: customerId,
  }, { onConflict: 'provider,provider_environment,provider_customer_id' });
  if (error) throw error;
}

function currentPeriod(data: PaddleData): { start: string | null; end: string | null } {
  return {
    start: text(data?.current_billing_period?.starts_at) || text(data?.billing_period?.starts_at),
    end: text(data?.current_billing_period?.ends_at) || text(data?.billing_period?.ends_at),
  };
}

export async function recomputeEntitlement(admin: Admin, userId: string): Promise<void> {
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
    .eq('provider', 'paddle')
    .eq('provider_environment', paddleEnvironment())
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
    .eq('provider', 'paddle')
    .eq('provider_environment', paddleEnvironment())
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

export type FinalizePaddleTransactionResult = {
  userId: string | null;
  activated: boolean;
  stage: 'unbound' | 'payment_pending' | 'subscription_pending' | 'active' | 'past_due' | 'inactive';
  planKey: 'pro_monthly' | 'pro_yearly' | 'pro_lifetime' | null;
  orderStatus: string | null;
  paddleStatus: string | null;
  transactionId: string;
  subscriptionId: string | null;
};

export async function finalizePreboundPaddleTransaction(admin: Admin, transactionId: string): Promise<FinalizePaddleTransactionResult> {
  const environment = paddleEnvironment();
  const { data: order, error: orderError } = await admin
    .from('billing_orders')
    .select('user_id,plan_key,status,provider_subscription_id')
    .eq('provider', 'paddle')
    .eq('provider_environment', environment)
    .eq('provider_order_id', transactionId)
    .maybeSingle();
  if (orderError) throw orderError;
  if (!order?.user_id) {
    return { userId: null, activated: false, stage: 'unbound', planKey: null, orderStatus: null, paddleStatus: null, transactionId, subscriptionId: null };
  }

  const planKey = order.plan_key === 'pro_monthly' || order.plan_key === 'pro_yearly' || order.plan_key === 'pro_lifetime'
    ? order.plan_key
    : null;
  if (!planKey) throw new Error('INVALID_BOUND_PLAN');

  const transactionResponse = await paddleRequest(`/transactions/${encodeURIComponent(transactionId)}`);
  const transaction = transactionResponse?.data as PaddleData | undefined;
  const paddleStatus = text(transaction?.status);
  const subscriptionId = text(transaction?.subscription_id) || text(order.provider_subscription_id);
  if (!transaction || paddleStatus !== 'completed') {
    return { userId: order.user_id, activated: false, stage: 'payment_pending', planKey, orderStatus: order.status, paddleStatus, transactionId, subscriptionId };
  }

  const expectedPriceId = paddlePriceIdForPlan(planKey);
  const transactionPriceId = priceId(transaction);
  if (!expectedPriceId || transactionPriceId !== expectedPriceId) throw new Error('PADDLE_BOUND_PLAN_MISMATCH');

  const grandTotal = text(transaction?.details?.totals?.grand_total);
  const amountMinor = grandTotal && /^\d+$/.test(grandTotal) ? Number(grandTotal) : null;
  await upsertCustomer(admin, order.user_id, transaction);
  const { error: paidOrderError } = await admin.from('billing_orders').update({
    status: 'paid',
    provider_customer_id: text(transaction?.customer_id),
    provider_subscription_id: subscriptionId,
    currency: text(transaction?.currency_code),
    amount_minor: amountMinor,
    paid_at: new Date().toISOString(),
    metadata: {
      checkout_binding: 'server_precreated_transaction',
      paddle_status: paddleStatus,
      finalized_by: 'exact_transaction',
      invoice_number: text(transaction?.invoice_number),
    },
  }).eq('provider', 'paddle')
    .eq('provider_environment', environment)
    .eq('provider_order_id', transactionId)
    .eq('user_id', order.user_id);
  if (paidOrderError) throw paidOrderError;

  if (planKey === 'pro_lifetime') {
    await recomputeEntitlement(admin, order.user_id);
    return { userId: order.user_id, activated: true, stage: 'active', planKey, orderStatus: 'paid', paddleStatus, transactionId, subscriptionId: null };
  }

  if (!subscriptionId) {
    return { userId: order.user_id, activated: false, stage: 'subscription_pending', planKey, orderStatus: 'paid', paddleStatus, transactionId, subscriptionId: null };
  }

  const subscriptionResponse = await paddleRequest(`/subscriptions/${encodeURIComponent(subscriptionId)}`);
  const subscription = subscriptionResponse?.data as PaddleData | undefined;
  if (!subscription) {
    return { userId: order.user_id, activated: false, stage: 'subscription_pending', planKey, orderStatus: 'paid', paddleStatus, transactionId, subscriptionId };
  }
  const subscriptionPlanKey = planKeyForPaddleData(subscription);
  if (subscriptionPlanKey !== planKey) throw new Error('PADDLE_SUBSCRIPTION_PLAN_MISMATCH');

  await upsertCustomer(admin, order.user_id, subscription);
  const period = currentPeriod(subscription);
  const subscriptionStatus = text(subscription?.status) || 'unknown';
  const { error: subscriptionUpsertError } = await admin.from('subscriptions').upsert({
    user_id: order.user_id,
    provider: 'paddle',
    provider_environment: environment,
    provider_customer_id: text(subscription?.customer_id),
    provider_subscription_id: subscriptionId,
    plan_key: planKey,
    status: subscriptionStatus,
    current_period_start: period.start,
    current_period_end: period.end,
    cancel_at_period_end: subscription?.scheduled_change?.action === 'cancel',
  }, { onConflict: 'provider,provider_subscription_id' });
  if (subscriptionUpsertError) throw subscriptionUpsertError;

  await recomputeEntitlement(admin, order.user_id);
  const { data: entitlement, error: entitlementError } = await admin
    .from('entitlements')
    .select('plan,status,source,valid_until,grace_until')
    .eq('user_id', order.user_id)
    .maybeSingle();
  if (entitlementError) throw entitlementError;

  const paidSource = entitlement?.source === 'payment' || entitlement?.source === 'lifetime';
  const active = entitlement?.plan === 'pro' && paidSource && (
    entitlement?.status === 'active'
    || entitlement?.status === 'trialing'
    || (entitlement?.status === 'past_due' && entitlement?.grace_until && Date.parse(entitlement.grace_until) > Date.now())
  );
  return {
    userId: order.user_id,
    activated: Boolean(active),
    stage: active ? (entitlement?.status === 'past_due' ? 'past_due' : 'active') : 'inactive',
    planKey,
    orderStatus: 'paid',
    paddleStatus,
    transactionId,
    subscriptionId,
  };
}

export async function syncPaddleTransaction(admin: Admin, data: PaddleData, eventType = 'transaction.completed'): Promise<string | null> {
  const resolution = await resolvePaddleUser(admin, data);
  if (!resolution) return null;
  const { userId, context } = resolution;
  const transactionId = text(data?.id);
  if (!transactionId || !transactionId.startsWith('txn_')) return userId;
  let planKey = planKeyForPaddleData(data);
  if (!planKey) {
    const { data: existingOrder, error: existingOrderError } = await admin
      .from('billing_orders')
      .select('plan_key')
      .eq('provider', 'paddle')
      .eq('provider_environment', paddleEnvironment())
      .eq('provider_order_id', transactionId)
      .eq('user_id', userId)
      .maybeSingle();
    if (existingOrderError) throw existingOrderError;
    planKey = existingOrder?.plan_key === 'pro_monthly'
      || existingOrder?.plan_key === 'pro_yearly'
      || existingOrder?.plan_key === 'pro_lifetime'
      ? existingOrder.plan_key
      : null;
  }
  if (!planKey) return userId;

  await upsertCustomer(admin, userId, data);

  const status = data?.status === 'completed' || eventType === 'transaction.completed' ? 'paid'
    : data?.status === 'canceled' ? 'canceled'
    : 'created';
  const grandTotal = text(data?.details?.totals?.grand_total);
  const amountMinor = grandTotal && /^\d+$/.test(grandTotal) ? Number(grandTotal) : null;

  const { error: orderError } = await admin.from('billing_orders').upsert({
    user_id: userId,
    provider: 'paddle',
    provider_environment: paddleEnvironment(),
    plan_key: planKey,
    status,
    provider_order_id: transactionId,
    provider_customer_id: text(data?.customer_id),
    provider_subscription_id: text(data?.subscription_id),
    currency: text(data?.currency_code),
    amount_minor: amountMinor,
    paid_at: status === 'paid' ? new Date().toISOString() : null,
    metadata: {
      paddle_status: data?.status || null,
      origin: data?.origin || null,
      event_type: eventType,
      checkout_ref_prefix: custom(data, 'checkout_ref')?.slice(0, 8) || null,
    },
  }, { onConflict: 'provider,provider_environment,provider_order_id' });
  if (orderError) throw orderError;

  if (context) {
    const { error } = await admin.from('billing_checkout_contexts').update({
      consumed_at: context.consumed_at || new Date().toISOString(),
      last_transaction_id: transactionId,
    }).eq('ref_hash', context.ref_hash);
    if (error) throw error;
  }

  if (planKey === 'pro_lifetime' && status === 'paid') await recomputeEntitlement(admin, userId);
  return userId;
}

export async function syncPaddleSubscription(admin: Admin, data: PaddleData): Promise<string | null> {
  const resolution = await resolvePaddleUser(admin, data);
  if (!resolution) return null;
  const { userId, context } = resolution;
  const subscriptionId = text(data?.id);
  if (!subscriptionId || !subscriptionId.startsWith('sub_')) return userId;
  let planKey = planKeyForPaddleData(data);
  if (!planKey) {
    const { data: existingOrder, error: existingOrderError } = await admin
      .from('billing_orders')
      .select('plan_key')
      .eq('provider', 'paddle')
      .eq('provider_environment', paddleEnvironment())
      .eq('provider_subscription_id', subscriptionId)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingOrderError) throw existingOrderError;
    planKey = existingOrder?.plan_key === 'pro_monthly'
      || existingOrder?.plan_key === 'pro_yearly'
      || existingOrder?.plan_key === 'pro_lifetime'
      ? existingOrder.plan_key
      : null;
  }
  const period = currentPeriod(data);

  await upsertCustomer(admin, userId, data);

  const { error } = await admin.from('subscriptions').upsert({
    user_id: userId,
    provider: 'paddle',
    provider_environment: paddleEnvironment(),
    provider_customer_id: text(data?.customer_id),
    provider_subscription_id: subscriptionId,
    plan_key: planKey,
    status: text(data?.status) || 'unknown',
    current_period_start: period.start,
    current_period_end: period.end,
    cancel_at_period_end: data?.scheduled_change?.action === 'cancel',
  }, { onConflict: 'provider,provider_subscription_id' });
  if (error) throw error;

  if (context && !context.consumed_at) {
    const { error: contextError } = await admin.from('billing_checkout_contexts')
      .update({ consumed_at: new Date().toISOString() })
      .eq('ref_hash', context.ref_hash);
    if (contextError) throw contextError;
  }

  const transactionId = text(data?.transaction_id);
  if (transactionId) {
    const { error: orderUpdateError } = await admin.from('billing_orders').update({
      provider_customer_id: text(data?.customer_id),
      provider_subscription_id: subscriptionId,
      status: 'paid',
      paid_at: new Date().toISOString(),
    }).eq('provider', 'paddle')
      .eq('provider_environment', paddleEnvironment())
      .eq('provider_order_id', transactionId)
      .eq('user_id', userId);
    if (orderUpdateError) throw orderUpdateError;
  }

  await recomputeEntitlement(admin, userId);
  return userId;
}

export async function syncPaddleAdjustment(admin: Admin, data: PaddleData): Promise<string | null> {
  const transactionId = text(data?.transaction_id);
  if (!transactionId) return null;
  const { data: order, error: orderError } = await admin.from('billing_orders')
    .select('user_id,plan_key')
    .eq('provider', 'paddle')
    .eq('provider_environment', paddleEnvironment())
    .eq('provider_order_id', transactionId)
    .maybeSingle();
  if (orderError) throw orderError;
  if (!order?.user_id) return null;

  const adjustmentId = text(data?.id);
  if (adjustmentId) {
    const { error } = await admin.from('billing_adjustments').upsert({
      user_id: order.user_id,
      provider: 'paddle',
      provider_environment: paddleEnvironment(),
      provider_adjustment_id: adjustmentId,
      provider_transaction_id: transactionId,
      provider_subscription_id: text(data?.subscription_id),
      action: text(data?.action) || 'unknown',
      adjustment_type: text(data?.type),
      status: text(data?.status) || 'unknown',
      amount_minor: /^\d+$/.test(text(data?.totals?.total) || '') ? Number(data.totals.total) : null,
      currency: text(data?.currency_code),
      payload: data,
    }, { onConflict: 'provider,provider_environment,provider_adjustment_id' });
    if (error) throw error;
  }

  const isApprovedFullRefund = data?.action === 'refund' && data?.type === 'full' && data?.status === 'approved';
  const isChargeback = data?.action === 'chargeback' && data?.status !== 'rejected';
  if ((isApprovedFullRefund || isChargeback) && order.plan_key === 'pro_lifetime') {
    const { error } = await admin.from('billing_orders').update({
      status: 'refunded',
      refunded_at: new Date().toISOString(),
    }).eq('provider', 'paddle')
      .eq('provider_environment', paddleEnvironment())
      .eq('provider_order_id', transactionId);
    if (error) throw error;
    await recomputeEntitlement(admin, order.user_id);
  }
  return order.user_id;
}

export async function reconcileCheckoutRef(admin: Admin, checkoutRef: string, accountEmail: string, transactionId?: string | null): Promise<string | null> {
  if (!validCheckoutRef(checkoutRef)) return null;

  const verifyAndSync = async (transaction: PaddleData): Promise<string | null> => {
    if (custom(transaction, 'checkout_ref') !== checkoutRef) return null;
    if (transaction?.status !== 'completed') return null;
    const userId = await syncPaddleTransaction(admin, transaction, 'transaction.completed');
    const subscriptionId = text(transaction?.subscription_id);
    if (subscriptionId) {
      const subscription = await paddleRequest(`/subscriptions/${encodeURIComponent(subscriptionId)}`);
      if (subscription?.data) await syncPaddleSubscription(admin, subscription.data);
    }
    return userId;
  };

  if (transactionId && /^txn_[a-z\d]{26}$/.test(transactionId)) {
    const transaction = await paddleRequest(`/transactions/${encodeURIComponent(transactionId)}`);
    const matched = transaction?.data ? await verifyAndSync(transaction.data) : null;
    if (matched) return matched;
  }

  const customers = await paddleRequest(`/customers?email=${encodeURIComponent(accountEmail)}&per_page=20`);
  for (const customer of Array.isArray(customers?.data) ? customers.data : []) {
    const customerId = text(customer?.id);
    if (!customerId) continue;
    const transactions = await paddleRequest(`/transactions?customer_id=${encodeURIComponent(customerId)}&status=completed&per_page=30`);
    for (const transaction of Array.isArray(transactions?.data) ? transactions.data : []) {
      const matched = await verifyAndSync(transaction);
      if (matched) return matched;
    }
  }
  return null;
}
