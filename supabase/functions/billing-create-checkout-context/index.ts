import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { DEFAULT_PRICING_URL, checkoutRefHash, newCheckoutRef, normalizeCheckoutLocale } from '../_shared/checkout-ref.ts';
import { paddleEnvironment } from '../_shared/paddle.ts';
import { adminClient, authenticatedUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'METHOD_NOT_ALLOWED' }, 405);

  try {
    const user = await authenticatedUser(req);
    if (!user) return jsonResponse({ error: 'AUTH_REQUIRED' }, 401);
    if (!user.email) return jsonResponse({ error: 'ACCOUNT_EMAIL_REQUIRED' }, 400);

    const body = await req.json().catch(() => null) as { locale?: string } | null;
    const locale = normalizeCheckoutLocale(body?.locale);
    const checkoutRef = newCheckoutRef();
    const refHash = await checkoutRefHash(checkoutRef);
    const now = Date.now();
    const expiresAt = new Date(now + 30 * 60 * 1000).toISOString();
    const environment = paddleEnvironment();
    const admin = adminClient();

    const { error } = await admin.from('billing_checkout_contexts').insert({
      user_id: user.id,
      provider: 'paddle',
      provider_environment: environment,
      ref_hash: refHash,
      ref_prefix: checkoutRef.slice(0, 8),
      account_email: user.email,
      locale,
      expires_at: expiresAt,
    });
    if (error) throw error;

    const pricingUrl = new URL(Deno.env.get('BILLING_PRICING_URL')?.trim() || DEFAULT_PRICING_URL);
    pricingUrl.searchParams.set('ref', checkoutRef);
    pricingUrl.searchParams.set('lang', locale);

    return jsonResponse({
      checkoutRef,
      checkoutUrl: pricingUrl.toString(),
      expiresAt,
      provider: 'paddle',
      environment,
    });
  } catch (error) {
    console.error('billing-create-checkout-context', error);
    return jsonResponse({ error: error instanceof Error ? error.message : 'CHECKOUT_CONTEXT_FAILED' }, 500);
  }
});
