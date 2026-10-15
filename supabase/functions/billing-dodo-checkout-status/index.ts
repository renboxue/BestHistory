import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { dodoProviderEnvironment } from '../_shared/dodo.ts';
import { adminClient, authenticatedUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'METHOD_NOT_ALLOWED' }, 405);

  try {
    const user = await authenticatedUser(req);
    if (!user) return jsonResponse({ error: 'AUTH_REQUIRED' }, 401);

    const body = await req.json().catch(() => null) as { transactionId?: string } | null;
    const transactionId = typeof body?.transactionId === 'string' ? body.transactionId.trim() : '';
    if (!transactionId) return jsonResponse({ error: 'TRANSACTION_REQUIRED' }, 400);

    const admin = adminClient();
    const { data: rows, error } = await admin.from('billing_orders')
      .select('id,plan_key,status,provider_order_id,provider_checkout_id,provider_subscription_id')
      .eq('user_id', user.id)
      .eq('provider', 'dodo')
      .eq('provider_environment', dodoProviderEnvironment())
      .or(`provider_order_id.eq.${transactionId},provider_checkout_id.eq.${transactionId}`)
      .order('updated_at', { ascending: false })
      .limit(1);
    if (error) throw error;

    const order = Array.isArray(rows) ? rows[0] : null;
    if (!order) return jsonResponse({ error: 'ORDER_NOT_FOUND' }, 404);

    const { data: entitlement, error: entitlementError } = await admin.from('entitlements')
      .select('plan,status,source,valid_until,grace_until')
      .eq('user_id', user.id)
      .maybeSingle();
    if (entitlementError) throw entitlementError;

    const activated = Boolean(
      entitlement?.plan === 'pro'
      && ['active', 'trialing', 'past_due'].includes(entitlement?.status || '')
    );

    return jsonResponse({
      activated,
      source: entitlement?.source || null,
      status: entitlement?.status || null,
      plan: order.plan_key || null,
      orderStatus: order.status || null,
      transactionId: order.provider_order_id || order.provider_checkout_id || transactionId,
      subscriptionId: order.provider_subscription_id || null,
    });
  } catch (error) {
    console.error('billing-dodo-checkout-status', error);
    return jsonResponse({ error: error instanceof Error ? error.message : 'DODO_STATUS_FAILED' }, 500);
  }
});
