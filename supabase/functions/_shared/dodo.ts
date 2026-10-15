export type DodoEnvironment = 'test_mode' | 'live_mode';
export type DodoPlanId = 'pro_monthly' | 'pro_yearly' | 'pro_lifetime';

function env(name: string): string {
  return (Deno.env.get(name) || '').trim();
}

export function dodoEnvironment(): DodoEnvironment {
  return env('DODO_PAYMENTS_ENVIRONMENT') === 'live_mode' ? 'live_mode' : 'test_mode';
}

export function dodoProviderEnvironment(): 'sandbox' | 'live' {
  return dodoEnvironment() === 'live_mode' ? 'live' : 'sandbox';
}

export function dodoWebhookSecretConfigured(): boolean {
  return Boolean(env('DODO_PAYMENTS_WEBHOOK_KEY'));
}

export function dodoBaseUrl(): string {
  return dodoEnvironment() === 'live_mode' ? 'https://live.dodopayments.com' : 'https://test.dodopayments.com';
}

export function dodoProductIdForPlan(planId: string): string | null {
  if (dodoEnvironment() === 'test_mode') {
    if (planId === 'pro_monthly') return 'pdt_0NoY4NnBfFoGh7cXs7A5Z';
    if (planId === 'pro_yearly') return 'pdt_0NoY4azL1xQAxnChvTb27';
    if (planId === 'pro_lifetime') return 'pdt_0NoY4l3NiYHtqt0a8phVA';
    return null;
  }

  if (planId === 'pro_monthly') return env('DODO_PRODUCT_MONTHLY') || null;
  if (planId === 'pro_yearly') return env('DODO_PRODUCT_YEARLY') || null;
  if (planId === 'pro_lifetime') return env('DODO_PRODUCT_LIFETIME') || null;
  return null;
}

export function dodoPlanForProductId(productId: unknown): DodoPlanId | null {
  const value = typeof productId === 'string' ? productId.trim() : '';
  if (!value) return null;
  for (const planId of ['pro_monthly', 'pro_yearly', 'pro_lifetime'] as const) {
    if (dodoProductIdForPlan(planId) === value) return planId;
  }
  return null;
}

export async function dodoRequest(path: string, init: RequestInit = {}): Promise<any> {
  const apiKey = env('DODO_PAYMENTS_API_KEY');
  if (!apiKey) throw new Error('DODO_API_KEY_NOT_CONFIGURED');

  const response = await fetch(`${dodoBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  const text = await response.text();
  let payload: any = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  if (!response.ok) {
    const message = typeof payload === 'object' && payload
      ? (payload.message || payload.error || payload.code)
      : null;
    throw new Error(message || `DODO_HTTP_${response.status}`);
  }
  return payload;
}

function base64Bytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function constantTimeEqual(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  if (aBytes.length !== bBytes.length) return false;
  let diff = 0;
  for (let i = 0; i < aBytes.length; i += 1) diff |= aBytes[i] ^ bBytes[i];
  return diff === 0;
}

export async function verifyDodoSignature(rawBody: string, headers: Headers): Promise<boolean> {
  const webhookId = headers.get('webhook-id')?.trim() || '';
  const webhookTimestamp = headers.get('webhook-timestamp')?.trim() || '';
  const signatureHeader = headers.get('webhook-signature')?.trim() || '';
  const secret = env('DODO_PAYMENTS_WEBHOOK_KEY');
  if (!webhookId || !webhookTimestamp || !signatureHeader || !secret) return false;

  const timestampSeconds = Number(webhookTimestamp);
  if (!Number.isFinite(timestampSeconds)) return false;
  const ageSeconds = Math.abs(Date.now() / 1000 - timestampSeconds);
  if (ageSeconds > 300) return false;

  const encodedSecret = secret.startsWith('whsec_') ? secret.slice('whsec_'.length) : secret;
  let keyBytes: Uint8Array;
  try {
    keyBytes = base64Bytes(encodedSecret);
  } catch {
    return false;
  }

  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody}`;
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedContent));
  const expected = bytesToBase64(new Uint8Array(digest));

  return signatureHeader
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .some((part) => {
      const [version, signature] = part.split(',', 2);
      return version === 'v1' && Boolean(signature) && constantTimeEqual(signature, expected);
    });
}
