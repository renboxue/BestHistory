import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { paddleEnvironment, paddlePriceIdForPlan, paddleRequest } from '../_shared/paddle.ts';
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

    const priceId = paddlePriceIdForPlan(planId);
    if (!priceId) return jsonResponse({ error: 'INVALID_PLAN' }, 400);

    const locale = normalizeLocale(body?.locale);

    // First-principles purchase binding:
    // Paddle creates the transaction, then BestHistory binds txn_xxx -> authenticated user_id
    // BEFORE any checkout URL is returned to the extension.
    const paddle = await paddleRequest('/transactions', {
      method: 'POST',
      body: JSON.stringify({
        items: [{ price_id: priceId, quantity: 1 }],
      }),
    });

    const transaction = paddle?.data;
    const transactionId = typeof transaction?.id === 'string' ? transaction.id : '';
    if (!/^txn_[a-z\d]{26}$/.test(transactionId)) {
      throw new Error('PADDLE_TRANSACTION_CREATE_MISSING');
    }

    // Keep Paddle.js completely outside chrome-extension://. Stage A/B/C independently
    // verified this static HTTPS host, Paddle.js initialization, the annual Sandbox price,
    // and a completed Sandbox payment before reconnecting it to BestHistory billing.
    const checkoutPage = new URL('/checkout/', Deno.env.get('BH_PUBLIC_ORIGIN') || 'https://public.unconfigured.invalid');
    checkoutPage.searchParams.set('_ptxn', transactionId);
    checkoutPage.searchParams.set('lang', locale);
    const checkoutUrl = checkoutPage.toString();

    const admin = adminClient();
    const { error: insertError } = await admin.from('billing_orders').insert({
      user_id: user.id,
      provider: 'paddle',
      provider_environment: paddleEnvironment(),
      plan_key: planId,
      status: 'created',
      provider_order_id: transactionId,
      checkout_url: checkoutUrl,
      metadata: {
        checkout_binding: 'server_precreated_transaction',
        requested_locale: locale,
        paddle_status: transaction?.status || 'draft',
        checkout_host: 'besthistory_static_checkout',
      },
    });
    if (insertError) throw insertError;

    return jsonResponse({
      transactionId,
      checkoutUrl,
      planId,
      provider: 'paddle',
      environment: paddleEnvironment(),
    });
  } catch (error) {
    console.error('billing-create-paddle-transaction', error);
    return jsonResponse({
      error: error instanceof Error ? error.message : 'PADDLE_TRANSACTION_CREATE_FAILED',
    }, 500);
  }
});
