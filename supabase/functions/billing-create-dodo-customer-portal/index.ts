import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { dodoProviderEnvironment, dodoRequest } from '../_shared/dodo.ts';
import { adminClient, authenticatedUser } from '../_shared/supabase.ts';

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'METHOD_NOT_ALLOWED' }, 405);

  try {
    const user = await authenticatedUser(req);
    if (!user) return jsonResponse({ error: 'AUTH_REQUIRED' }, 401);

    const admin = adminClient();
    const providerEnvironment = dodoProviderEnvironment();

    const { data: subscription, error: subscriptionError } = await admin
      .from('subscriptions')
      .select('provider_customer_id, provider_subscription_id, status, updated_at')
      .eq('user_id', user.id)
      .eq('provider', 'dodo')
      .eq('provider_environment', providerEnvironment)
      .not('provider_customer_id', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (subscriptionError) throw subscriptionError;

    let customerId = text(subscription?.provider_customer_id);

    if (!customerId) {
      const { data: order, error: orderError } = await admin
        .from('billing_orders')
        .select('provider_customer_id, updated_at')
        .eq('user_id', user.id)
        .eq('provider', 'dodo')
        .eq('provider_environment', providerEnvironment)
        .not('provider_customer_id', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (orderError) throw orderError;
      customerId = text(order?.provider_customer_id);
    }

    if (!customerId) {
      return jsonResponse({ error: 'DODO_CUSTOMER_NOT_FOUND' }, 409);
    }

    const portal = await dodoRequest(
      `/customers/${encodeURIComponent(customerId)}/customer-portal/session`,
      { method: 'POST' },
    );

    const portalUrl = text(portal?.link);
    if (!portalUrl) throw new Error('DODO_CUSTOMER_PORTAL_LINK_MISSING');

    return jsonResponse({
      portalUrl,
      provider: 'dodo',
      environment: providerEnvironment,
    });
  } catch (error) {
    console.error('billing-create-dodo-customer-portal', error);
    return jsonResponse({
      error: error instanceof Error ? error.message : 'DODO_CUSTOMER_PORTAL_CREATE_FAILED',
    }, 500);
  }
});
