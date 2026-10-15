import { checkoutRefHash, pricingCorsHeaders, pricingJson, validCheckoutRef } from '../_shared/checkout-ref.ts';
import { adminClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: pricingCorsHeaders(req) });
  if (req.method !== 'POST') return pricingJson(req, { accepted: false }, 405);

  try {
    const body = await req.json().catch(() => null) as { ref?: string; transactionId?: string } | null;
    if (!validCheckoutRef(body?.ref) || !/^txn_[a-z\d]{26}$/.test(body?.transactionId || '')) {
      return pricingJson(req, { accepted: false });
    }
    const refHash = await checkoutRefHash(body.ref);
    const admin = adminClient();
    const { data, error } = await admin
      .from('billing_checkout_contexts')
      .select('id,expires_at')
      .eq('provider', 'paddle')
      .eq('ref_hash', refHash)
      .maybeSingle();
    if (error) throw error;
    if (!data || Date.parse(data.expires_at) + 2 * 60 * 60 * 1000 <= Date.now()) {
      return pricingJson(req, { accepted: false });
    }
    const { error: updateError } = await admin.from('billing_checkout_contexts').update({
      last_transaction_id: body.transactionId,
    }).eq('id', data.id);
    if (updateError) throw updateError;
    // This endpoint never grants Pro. billing-checkout-status verifies this transaction with Paddle's server API.
    return pricingJson(req, { accepted: true });
  } catch (error) {
    console.error('billing-report-checkout-completed', error);
    return pricingJson(req, { accepted: false }, 500);
  }
});
