export type PaddleEnvironment = 'sandbox' | 'live';

export function paddleEnvironment(): PaddleEnvironment {
  return Deno.env.get('PADDLE_ENV') === 'live' ? 'live' : 'sandbox';
}

export function paddleBaseUrl(): string {
  return paddleEnvironment() === 'live' ? 'https://api.paddle.com' : 'https://sandbox-api.paddle.com';
}

export function requireEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`MISSING_ENV:${name}`);
  return value;
}

function optionalEnv(name: string): string {
  return Deno.env.get(name)?.trim() || '';
}

export function paddleClientToken(): string {
  const token = requireEnv('PADDLE_CLIENT_TOKEN');
  const env = paddleEnvironment();
  if (env === 'sandbox' && !token.startsWith('test_')) throw new Error('PADDLE_CLIENT_TOKEN_ENV_MISMATCH');
  if (env === 'live' && !token.startsWith('live_')) throw new Error('PADDLE_CLIENT_TOKEN_ENV_MISMATCH');
  return token;
}

export function paddlePublicPrices(): { monthly: string; annual: string; lifetime: string } {
  const monthly = requireEnv('PADDLE_PRICE_ID_MONTHLY');
  const annual = requireEnv('PADDLE_PRICE_ID_YEARLY');
  const lifetime = requireEnv('PADDLE_PRICE_ID_LIFETIME');
  for (const value of [monthly, annual, lifetime]) {
    if (!/^pri_[a-z\d]{26}$/.test(value)) throw new Error('PADDLE_PRICE_ID_INVALID');
  }
  return { monthly, annual, lifetime };
}

export function planKeyFromBillingPlan(value: unknown): 'pro_monthly' | 'pro_yearly' | 'pro_lifetime' | null {
  if (value === 'monthly') return 'pro_monthly';
  if (value === 'annual' || value === 'yearly') return 'pro_yearly';
  if (value === 'lifetime') return 'pro_lifetime';
  return null;
}

export function planKeyFromPriceId(value: unknown): 'pro_monthly' | 'pro_yearly' | 'pro_lifetime' | null {
  const candidate = typeof value === 'string' ? value : '';
  if (!candidate) return null;
  const monthly = optionalEnv('PADDLE_PRICE_ID_MONTHLY');
  const yearly = optionalEnv('PADDLE_PRICE_ID_YEARLY');
  const lifetime = optionalEnv('PADDLE_PRICE_ID_LIFETIME');
  if (monthly && candidate === monthly) return 'pro_monthly';
  if (yearly && candidate === yearly) return 'pro_yearly';
  if (lifetime && candidate === lifetime) return 'pro_lifetime';
  return null;
}

export function paddlePriceIdForPlan(value: unknown): string | null {
  if (value === 'pro_monthly') return requireEnv('PADDLE_PRICE_ID_MONTHLY');
  if (value === 'pro_yearly') return requireEnv('PADDLE_PRICE_ID_YEARLY');
  if (value === 'pro_lifetime') return requireEnv('PADDLE_PRICE_ID_LIFETIME');
  return null;
}

export async function paddleRequest(path: string, init: RequestInit = {}): Promise<any> {
  const apiKey = requireEnv('PADDLE_API_KEY');
  const response = await fetch(`${paddleBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = payload?.error?.detail || payload?.error?.type || payload?.error?.code || `HTTP_${response.status}`;
    throw new Error(`PADDLE_API_ERROR:${detail}`);
  }
  return payload;
}

function hex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyPaddleSignature(rawBody: string, signatureHeader: string | null): Promise<boolean> {
  if (!signatureHeader) return false;
  const secret = requireEnv('PADDLE_WEBHOOK_SECRET');
  const parts = signatureHeader.split(';').map((part) => part.trim()).filter(Boolean);
  const timestamp = parts.find((part) => part.startsWith('ts='))?.slice(3);
  const signatures = parts.filter((part) => part.startsWith('h1=')).map((part) => part.slice(3));
  if (!timestamp || signatures.length === 0 || !/^\d+$/.test(timestamp)) return false;

  const configuredTolerance = Number(Deno.env.get('PADDLE_WEBHOOK_TOLERANCE_SECONDS') || '5');
  const tolerance = Number.isFinite(configuredTolerance) ? Math.max(1, Math.min(300, configuredTolerance)) : 5;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > tolerance) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}:${rawBody}`));
  const expected = hex(digest);
  return signatures.some((candidate) => constantTimeEqual(expected, candidate));
}
