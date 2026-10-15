import { browser } from 'wxt/browser';
import { supabase } from '@/src/auth/supabase-client';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/src/config/supabase';
import { withBestHistoryClientMeta } from '@/src/config/client-context';
import type { BillingCheckoutContext, BillingCheckoutStatus, BillingMembership, BillingOrder, BillingPlanId, BillingService } from '@/src/billing/types';


type SubscriptionRow = {
  provider?: string | null;
  provider_environment?: string | null;
  plan_key?: string | null;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
};

type BillingOrderRow = {
  id: string;
  provider: string;
  provider_environment?: string | null;
  plan_key: string;
  status: string;
  checkout_url: string | null;
  provider_order_id: string | null;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  created_at: string;
  updated_at: string;
};

function normalizePlan(planKey: string): BillingPlanId {
  if (planKey === 'pro_monthly') return 'pro_monthly';
  if (planKey === 'pro_lifetime') return 'pro_lifetime';
  return 'pro_yearly';
}

function normalizeOrder(row: BillingOrderRow): BillingOrder {
  return {
    id: row.id,
    provider: row.provider === 'dodo' ? 'dodo' : 'paddle',
    environment: row.provider_environment === 'live' ? 'live' : 'sandbox',
    planId: normalizePlan(row.plan_key),
    status: ['created', 'checkout_open', 'paid', 'canceled', 'failed', 'refunded', 'expired'].includes(row.status)
      ? row.status as BillingOrder['status']
      : 'failed',
    checkoutUrl: row.checkout_url,
    providerOrderId: row.provider_order_id,
    providerCustomerId: row.provider_customer_id,
    providerSubscriptionId: row.provider_subscription_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeLocale(locale: string): string {
  if (locale === 'pt-BR') return 'pt';
  return locale;
}

async function invokeAuthenticatedFunction<T>(name: string, body: unknown): Promise<T> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error('AUTH_REQUIRED');

  const response = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => null) as ({ error?: string; code?: string; message?: string } & T) | null;
  if (!response.ok) {
    throw new Error(payload?.error || payload?.code || payload?.message || `HTTP_${response.status}`);
  }
  if (!payload) throw new Error(`EMPTY_RESPONSE_${name}`);

  return payload;
}

class BestHistoryBillingService implements BillingService {
  async createCheckout(planId: BillingPlanId, locale: string): Promise<BillingCheckoutContext> {
    const payload = await invokeAuthenticatedFunction<{
      transactionId?: string;
      checkoutUrl?: string;
      planId?: BillingPlanId;
      provider?: string;
      environment?: string;
      error?: string;
    }>('billing-create-dodo-checkout', withBestHistoryClientMeta({
      planId,
      locale: normalizeLocale(locale),
    }));
    if (!payload?.transactionId || !payload.checkoutUrl || !payload.planId) {
      throw new Error(payload?.error || 'DODO_CHECKOUT_UNAVAILABLE');
    }
    return {
      transactionId: payload.transactionId,
      checkoutUrl: payload.checkoutUrl,
      planId: payload.planId,
      provider: payload.provider === 'dodo' ? 'dodo' : 'paddle',
      environment: payload.environment === 'live' ? 'live' : 'sandbox',
    };
  }

  async refreshCheckoutStatus(transactionId: string): Promise<BillingCheckoutStatus> {
    const payload = await invokeAuthenticatedFunction<BillingCheckoutStatus>(
      'billing-dodo-checkout-status',
      withBestHistoryClientMeta({ transactionId }),
    );
    if (!payload || typeof payload.activated !== 'boolean') {
      throw new Error('DODO_CHECKOUT_STATUS_UNAVAILABLE');
    }
    return payload;
  }

  async getRecentOrders(limit = 5): Promise<BillingOrder[]> {
    const safeLimit = Math.max(1, Math.min(10, Math.floor(limit)));
    const { data, error } = await supabase
      .from('billing_orders')
      .select('id, provider, provider_environment, plan_key, status, checkout_url, provider_order_id, provider_customer_id, provider_subscription_id, created_at, updated_at')
      .in('provider', ['dodo', 'paddle'])
      .order('created_at', { ascending: false })
      .limit(safeLimit);

    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') return [];
      throw error;
    }
    return Array.isArray(data) ? data.map((row) => normalizeOrder(row as BillingOrderRow)) : [];
  }

  async getLatestOrder(): Promise<BillingOrder | null> {
    return (await this.getRecentOrders(1))[0] || null;
  }

  async getMembership(): Promise<BillingMembership | null> {
    // Read both Sandbox and Live rows. The newest canonical paid/subscription record wins,
    // so switching Paddle to Live later does not require another account-UI rewrite.
    const { data: paidOrder, error: paidOrderError } = await supabase
      .from('billing_orders')
      .select('provider, plan_key, provider_environment, status, created_at')
      .in('provider', ['dodo', 'paddle'])
      .eq('status', 'paid')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (paidOrderError && paidOrderError.code !== '42P01' && paidOrderError.code !== 'PGRST205') throw paidOrderError;
    if (paidOrder?.plan_key === 'pro_lifetime') {
      return {
        planId: 'pro_lifetime',
        provider: paidOrder.provider === 'dodo' ? 'dodo' : 'paddle',
        environment: paidOrder.provider_environment === 'live' ? 'live' : 'sandbox',
        status: 'active',
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      };
    }

    const subscriptionFields = 'provider, provider_environment, plan_key, status, current_period_end, cancel_at_period_end, updated_at';
    const { data: currentSubscription, error: currentSubscriptionError } = await supabase
      .from('subscriptions')
      .select(subscriptionFields)
      .in('provider', ['dodo', 'paddle'])
      .in('status', ['active', 'trialing', 'past_due'])
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (currentSubscriptionError && currentSubscriptionError.code !== '42P01' && currentSubscriptionError.code !== 'PGRST205') throw currentSubscriptionError;

    let subscription = currentSubscription as SubscriptionRow | null;
    if (!subscription) {
      const { data: latestSubscription, error: latestSubscriptionError } = await supabase
        .from('subscriptions')
        .select(subscriptionFields)
        .in('provider', ['dodo', 'paddle'])
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latestSubscriptionError && latestSubscriptionError.code !== '42P01' && latestSubscriptionError.code !== 'PGRST205') throw latestSubscriptionError;
      subscription = latestSubscription as SubscriptionRow | null;
    }

    if (subscription && (subscription.plan_key === 'pro_monthly' || subscription.plan_key === 'pro_yearly')) {
      return {
        planId: subscription.plan_key,
        provider: subscription.provider === 'dodo' ? 'dodo' : 'paddle',
        environment: subscription.provider_environment === 'live' ? 'live' : 'sandbox',
        status: subscription.status || 'unknown',
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
      };
    }

    // Older paid rows can still tell us which plan was purchased even if subscription
    // metadata has not finished syncing. Do not let a newer unpaid checkout hide it.
    if (paidOrder?.plan_key === 'pro_monthly' || paidOrder?.plan_key === 'pro_yearly') {
      return {
        planId: paidOrder.plan_key,
        provider: paidOrder.provider === 'dodo' ? 'dodo' : 'paddle',
        environment: paidOrder.provider_environment === 'live' ? 'live' : 'sandbox',
        status: 'unknown',
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      };
    }
    return null;
  }

  async openSubscriptionPortal(): Promise<void> {
    const payload = await invokeAuthenticatedFunction<{
      portalUrl?: string;
      provider?: string;
      environment?: string;
      error?: string;
    }>('billing-create-dodo-customer-portal', withBestHistoryClientMeta({}));

    if (!payload?.portalUrl) {
      throw new Error(payload?.error || 'DODO_CUSTOMER_PORTAL_UNAVAILABLE');
    }

    const parsed = new URL(payload.portalUrl);
    const isDodoHost = parsed.hostname === 'dodopayments.com'
      || parsed.hostname.endsWith('.dodopayments.com');
    if (parsed.protocol !== 'https:' || !isDodoHost) {
      throw new Error('INVALID_CUSTOMER_PORTAL_URL');
    }

    await browser.windows.create({
      url: parsed.toString(),
      type: 'popup',
      width: 920,
      height: 820,
      focused: true,
    });
  }

  async openCheckoutPopup(checkoutUrl: string): Promise<void> {
    const parsed = new URL(checkoutUrl);
    const approvedDodoHosts = new Set(['test.checkout.dodopayments.com', 'checkout.dodopayments.com']);
    const isApprovedCheckout = parsed.protocol === 'https:' && approvedDodoHosts.has(parsed.hostname);
    if (!isApprovedCheckout) {
      throw new Error('INVALID_CHECKOUT_URL');
    }
    // Dodo hosted checkout stays outside chrome-extension://. Keep the main BestHistory
    // tab untouched and isolate the provider-hosted checkout in a normal browser popup.
    await browser.windows.create({
      url: parsed.toString(),
      type: 'popup',
      width: 760,
      height: 860,
      focused: true,
    });
  }
}

export const billingService: BillingService = new BestHistoryBillingService();
