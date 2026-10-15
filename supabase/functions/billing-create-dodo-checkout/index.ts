import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import {
  dodoEnvironment,
  dodoProductIdForPlan,
  dodoProviderEnvironment,
  dodoRequest,
} from '../_shared/dodo.ts';
import { adminClient, authenticatedUser } from '../_shared/supabase.ts';

const PLAN_KEYS = new Set(['pro_monthly', 'pro_yearly', 'pro_lifetime']);
const SUPPORTED_LOCALES = new Set([
  'zh-CN', 'zh-TW', 'en', 'ja', 'ko', 'es', 'pt', 'fr', 'de',
  'it', 'nl', 'ru', 'ar', 'hi', 'id', 'tr', 'bn', 'vi',
]);

function normalizeLocale(value: unknown): string {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (raw === 'pt-BR') return 'pt';
  return SUPPORTED_LOCALES.has(raw) ? raw : 'en';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'METHOD_NOT_ALLOWED' }, 405);

  try {
    const user = await authenticatedUser(req);
    if (!user) return jsonResponse({ error: 'AUTH_REQUIRED' }, 401);

    const body = await req.json().catch(() => null) as { planId?: string; locale?: string } | null;
    const planId = body?.planId || '';
    if (!PLAN_KEYS.has(planId)) return jsonResponse({ error: 'INVALID_PLAN' }, 400);

    const productId = dodoProductIdForPlan(planId);
    if (!productId) return jsonResponse({ error: 'DODO_PRODUCT_NOT_CONFIGURED' }, 503);

    const locale = normalizeLocale(body?.locale);
    const orderId = crypto.randomUUID();
    const admin = adminClient();

    // Create the local binding first. The Dodo checkout metadata then carries only
    // opaque BestHistory identifiers back through signed webhooks.
    const { error: insertError } = await admin.from('billing_orders').insert({
      id: orderId,
      user_id: user.id,
      provider: 'dodo',
      provider_environment: dodoProviderEnvironment(),
      plan_key: planId,
      status: 'created',
      metadata: {
        checkout_binding: 'server_precreated_order',
        requested_locale: locale,
        dodo_environment: dodoEnvironment(),
        dodo_product_id: productId,
      },
    });
    if (insertError) throw insertError;

    let checkout: any;
    try {
      checkout = await dodoRequest('/checkouts', {
        method: 'POST',
        body: JSON.stringify({
          product_cart: [{ product_id: productId, quantity: 1 }],
          metadata: {
            app_code: 'besthistory',
            plan_code: planId,
            besthistory_user_id: user.id,
            besthistory_order_id: orderId,
          },
          short_link: false,
        }),
      });
    } catch (error) {
      await admin.from('billing_orders').update({
        status: 'failed',
        metadata: {
          checkout_binding: 'server_precreated_order',
          requested_locale: locale,
          dodo_environment: dodoEnvironment(),
          dodo_product_id: productId,
          create_error: error instanceof Error ? error.message : String(error),
        },
      }).eq('id', orderId).eq('user_id', user.id);
      throw error;
    }

    const sessionId = typeof checkout?.session_id === 'string' ? checkout.session_id : '';
    const checkoutUrl = typeof checkout?.checkout_url === 'string' ? checkout.checkout_url : '';
    if (!sessionId || !checkoutUrl) throw new Error('DODO_CHECKOUT_SESSION_MISSING');

    const { error: updateError } = await admin.from('billing_orders').update({
      status: 'checkout_open',
      provider_order_id: sessionId,
      provider_checkout_id: sessionId,
      checkout_url: checkoutUrl,
      metadata: {
        checkout_binding: 'server_precreated_order',
        requested_locale: locale,
        dodo_environment: dodoEnvironment(),
        dodo_product_id: productId,
        dodo_session_id: sessionId,
      },
    }).eq('id', orderId).eq('user_id', user.id);
    if (updateError) throw updateError;

    return jsonResponse({
      transactionId: sessionId,
      checkoutUrl,
      planId,
      provider: 'dodo',
      environment: dodoProviderEnvironment(),
      orderId,
    });
  } catch (error) {
    console.error('billing-create-dodo-checkout', error);
    return jsonResponse({
      error: error instanceof Error ? error.message : 'DODO_CHECKOUT_CREATE_FAILED',
    }, 500);
  }
});
