import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { paddleRequest, paddleEnvironment } from '../_shared/paddle.ts';
import { adminClient, authenticatedUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'METHOD_NOT_ALLOWED' }, 405);

  try {
    const user = await authenticatedUser(req);
    if (!user) return jsonResponse({ error: 'AUTH_REQUIRED' }, 401);
    const admin = adminClient();

    const { data: customer, error: customerError } = await admin.from('billing_customers')
      .select('provider_customer_id')
      .eq('user_id', user.id)
      .eq('provider', 'paddle')
      .eq('provider_environment', paddleEnvironment())
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (customerError) throw customerError;

    let customerId = customer?.provider_customer_id || null;
    let subscriptionId: string | null = null;
    const { data: subscription, error: subscriptionError } = await admin.from('subscriptions')
      .select('provider_customer_id,provider_subscription_id')
      .eq('user_id', user.id)
      .eq('provider', 'paddle')
      .eq('provider_environment', paddleEnvironment())
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (subscriptionError) throw subscriptionError;
    customerId ||= subscription?.provider_customer_id || null;
    subscriptionId = subscription?.provider_subscription_id || null;

    if (!customerId) {
      const { data: order, error: orderError } = await admin.from('billing_orders')
        .select('provider_customer_id')
        .eq('user_id', user.id)
        .eq('provider', 'paddle')
        .eq('provider_environment', paddleEnvironment())
        .not('provider_customer_id', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (orderError) throw orderError;
      customerId = order?.provider_customer_id || null;
    }

    if (!customerId) return jsonResponse({ error: 'PADDLE_CUSTOMER_MISSING' }, 404);

    const paddle = await paddleRequest(`/customers/${customerId}/portal-sessions`, {
      method: 'POST',
      body: subscriptionId ? JSON.stringify({ subscription_ids: [subscriptionId] }) : undefined,
    });
    const url = paddle?.data?.urls?.general?.overview;
    if (!url) throw new Error('PADDLE_PORTAL_URL_MISSING');
    return jsonResponse({ url });
  } catch (error) {
    console.error('billing-customer-portal', error);
    return jsonResponse({ error: error instanceof Error ? error.message : 'PORTAL_FAILED' }, 500);
  }
});
