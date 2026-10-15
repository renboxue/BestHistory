import { adminClient, authenticatedUser } from './supabase.ts';

export function requireAiEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`MISSING_ENV:${name}`);
  return value;
}

function trimBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

export async function requireProUser(req: Request) {
  const user = await authenticatedUser(req);
  if (!user) throw new Error('AUTH_REQUIRED');
  const admin = adminClient();
  const { data, error } = await admin
    .from('entitlements')
    .select('plan,status,valid_until,grace_until')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw error;
  const now = Date.now();
  const validUntil = data?.valid_until ? new Date(data.valid_until).getTime() : null;
  const graceUntil = data?.grace_until ? new Date(data.grace_until).getTime() : null;
  const active = data?.plan === 'pro'
    && (data.status === 'active' || data.status === 'trialing')
    && (validUntil === null || validUntil > now || (graceUntil !== null && graceUntil > now));
  if (!active) throw new Error('PRO_REQUIRED');
  return user;
}

function parseJsonObject(content: string): any {
  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  try { return JSON.parse(cleaned); } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error('AI_INVALID_JSON');
  }
}

function extractResponsesText(payload: any): string {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }
  for (const item of Array.isArray(payload?.output) ? payload.output : []) {
    if (item?.type !== 'message' || !Array.isArray(item?.content)) continue;
    for (const part of item.content) {
      if (part?.type === 'output_text' && typeof part?.text === 'string' && part.text.trim()) {
        return part.text.trim();
      }
    }
  }
  throw new Error('AI_EMPTY_RESPONSE');
}

export async function aiJsonRequest(system: string, user: string): Promise<any> {
  const baseUrl = trimBaseUrl(requireAiEnv('AI_BASE_URL'));
  const apiKey = requireAiEnv('AI_API_KEY');
  const model = requireAiEnv('AI_MODEL');

  const response = await fetch(`${baseUrl}/responses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      store: false,
      thinking: { type: 'disabled' },
      input: [
        {
          type: 'message',
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: `${system}\n\nUSER_INPUT:\n${user}`,
            },
          ],
        },
      ],
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = payload?.error?.message
      || payload?.error?.code
      || payload?.message
      || `HTTP_${response.status}`;
    throw new Error(`AI_PROVIDER_ERROR:${detail}`);
  }

  return parseJsonObject(extractResponsesText(payload));
}
