import { checkoutRefHash, pricingCorsHeaders, pricingJson, validCheckoutRef } from '../_shared/checkout-ref.ts';
import { adminClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: pricingCorsHeaders(req) });
  if (req.method !== 'POST') return pricingJson(req, { valid: false }, 405);

  try {
    const body = await req.json().catch(() => null) as { ref?: string } | null;
    if (!validCheckoutRef(body?.ref)) return pricingJson(req, { valid: false });
    const refHash = await checkoutRefHash(body.ref);
    const admin = adminClient();
    const { data, error } = await admin
      .from('billing_checkout_contexts')
      .select('account_email, locale, provider_environment, expires_at, consumed_at')
      .eq('ref_hash', refHash)
      .eq('provider', 'paddle')
      .maybeSingle();
    if (error) throw error;
    if (!data) return pricingJson(req, { valid: false });

    const expiresMs = Date.parse(data.expires_at);
    const consumed = Boolean(data.consumed_at);
    if (!consumed && expiresMs <= Date.now()) return pricingJson(req, { valid: false });
    if (consumed && expiresMs + 2 * 60 * 60 * 1000 <= Date.now()) return pricingJson(req, { valid: false });

    return pricingJson(req, {
      valid: true,
      consumed,
      email: data.account_email,
      locale: data.locale,
      environment: data.provider_environment,
      expiresAt: data.expires_at,
    });
  } catch (error) {
    console.error('billing-get-checkout-context', error);
    return pricingJson(req, { valid: false }, 500);
  }
});
