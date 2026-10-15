export const PRICING_ORIGIN = (Deno.env.get('BH_PUBLIC_ORIGIN') || 'https://public.unconfigured.invalid').replace(/\/$/, '');
export const DEFAULT_PRICING_URL = `${PRICING_ORIGIN}/pricing/`;

export function normalizeCheckoutLocale(value: unknown): string {
  const supported = new Set(['zh-CN','zh-TW','en','ja','ko','es','pt','fr','de','it','nl','ru','ar','hi','id','tr','bn','vi']);
  const locale = typeof value === 'string' ? value.trim() : '';
  return supported.has(locale) ? locale : 'en';
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function newCheckoutRef(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

export async function checkoutRefHash(ref: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ref));
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

export function validCheckoutRef(ref: unknown): ref is string {
  return typeof ref === 'string' && /^[A-Za-z0-9_-]{40,80}$/.test(ref);
}

export function pricingCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin');
  const allowedOrigin = origin === PRICING_ORIGIN ? origin : PRICING_ORIGIN;
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
    'Cache-Control': 'no-store',
  };
}

export function pricingJson(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...pricingCorsHeaders(req), 'Content-Type': 'application/json; charset=utf-8' },
  });
}
