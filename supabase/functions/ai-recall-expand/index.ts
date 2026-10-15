import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { aiJsonRequest, requireProUser } from '../_shared/ai.ts';

type RecallBody = {
  query?: string;
  locale?: string;
  existingTags?: string[];
  localHints?: Array<{ domain?: string; title?: string }>;
};

function stringList(value: unknown, limit: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of value) {
    if (typeof raw !== 'string') continue;
    const item = raw.trim().slice(0, maxLength);
    const key = item.toLocaleLowerCase();
    if (!item || seen.has(key)) continue;
    seen.add(key); out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'METHOD_NOT_ALLOWED' }, 405);
  try {
    await requireProUser(req);
    const body = await req.json().catch(() => null) as RecallBody | null;
    const query = body?.query?.trim().slice(0, 600) || '';
    if (query.length < 2) return jsonResponse({ error: 'QUERY_TOO_SHORT' }, 400);
    const locale = body?.locale?.trim().slice(0, 20) || 'en';
    const existingTags = stringList(body?.existingTags, 60, 40);
    const localHints = Array.isArray(body?.localHints) ? body!.localHints!.slice(0, 12).map((hint) => ({
      domain: typeof hint?.domain === 'string' ? hint.domain.slice(0, 120) : '',
      title: typeof hint?.title === 'string' ? hint.title.slice(0, 180) : '',
    })).filter((hint) => hint.domain || hint.title) : [];

    const today = new Date().toISOString().slice(0, 10);
    const result = await aiJsonRequest(
      `You are the query-expansion engine for BestHistory, a private browser-history organizer.\n` +
      `The user is trying to remember a page they actually visited. You do NOT search the web and you do NOT decide the final answer.\n` +
      `Generate broad but plausible search hypotheses that BestHistory will verify against the user's LOCAL history.\n` +
      `Very important: infer concrete brands, websites, product names and likely domains when the description suggests them. For example, a vague description of an overseas subscription-payment platform may plausibly suggest Paddle, Stripe, Creem, Dodo Payments, Lemon Squeezy, etc. These are only search hypotheses.\n` +
      `Also generate multilingual keywords when useful. Prefer existing user tags when relevant, but do not depend on tags being present.\n` +
      `Interpret relative time language using today=${today}.\n` +
      `Return strict JSON only with this shape:\n` +
      `{"entities":[string],"domains":[string],"keywords":[string],"categories":[string],"time":{"kind":"none"|"recent_days"|"date_range","days"?:number,"from"?:"YYYY-MM-DD"|null,"to"?:"YYYY-MM-DD"|null}}\n` +
      `Limits: entities <= 10, domains <= 10, keywords <= 16, categories <= 8. Never invent a claim that the user visited any candidate.`,
      JSON.stringify({ locale, query, existing_tags: existingTags, local_history_hints: localHints }),
    );

    const rawTime = result?.time || {};
    let time: any = { kind: 'none' };
    if (rawTime.kind === 'recent_days') time = { kind: 'recent_days', days: Math.max(1, Math.min(3650, Number(rawTime.days) || 14)) };
    else if (rawTime.kind === 'date_range') time = {
      kind: 'date_range',
      from: typeof rawTime.from === 'string' ? rawTime.from.slice(0, 10) : null,
      to: typeof rawTime.to === 'string' ? rawTime.to.slice(0, 10) : null,
    };

    return jsonResponse({ expansion: {
      entities: stringList(result?.entities, 10, 80),
      domains: stringList(result?.domains, 10, 120),
      keywords: stringList(result?.keywords, 16, 80),
      categories: stringList(result?.categories, 8, 40),
      time,
    } });
  } catch (error) {
    console.error('ai-recall-expand', error);
    const message = error instanceof Error ? error.message : 'AI_RECALL_FAILED';
    const status = message === 'AUTH_REQUIRED' ? 401 : message === 'PRO_REQUIRED' ? 403 : message.startsWith('MISSING_ENV:') ? 503 : 500;
    return jsonResponse({ error: message }, status);
  }
});
