import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { paddleClientToken, paddleEnvironment, paddlePublicPrices } from '../_shared/paddle.ts';

Deno.serve((req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'GET' && req.method !== 'POST') return jsonResponse({ error: 'METHOD_NOT_ALLOWED' }, 405);

  try {
    return jsonResponse({
      provider: 'paddle',
      environment: paddleEnvironment(),
      clientToken: paddleClientToken(),
      prices: paddlePublicPrices(),
    }, 200, { 'Cache-Control': 'no-store' });
  } catch (error) {
    console.error('billing-public-config', error);
    return jsonResponse({
      error: error instanceof Error ? error.message : 'BILLING_PUBLIC_CONFIG_UNAVAILABLE',
    }, 503, { 'Cache-Control': 'no-store' });
  }
});
