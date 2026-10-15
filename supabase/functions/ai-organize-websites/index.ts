import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { aiJsonRequest, requireProUser } from '../_shared/ai.ts';

type SiteInput = {
  domain?: string;
  displayName?: string;
  currentTags?: string[];
  recentTitles?: string[];
  visitCount?: number;
  pageCount?: number;
};

type OrganizeBody = { locale?: string; existingTags?: string[]; sites?: SiteInput[] };

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
    const body = await req.json().catch(() => null) as OrganizeBody | null;
    const locale = body?.locale?.trim().slice(0, 20) || 'en';
    const existingTags = stringList(body?.existingTags, 80, 40);
    const sites = Array.isArray(body?.sites) ? body!.sites!.slice(0, 40).map((site) => ({
      domain: typeof site.domain === 'string' ? site.domain.slice(0, 120) : '',
      display_name: typeof site.displayName === 'string' ? site.displayName.slice(0, 100) : '',
      current_tags: stringList(site.currentTags, 10, 40),
      recent_page_titles: stringList(site.recentTitles, 5, 180),
      visit_count: Math.max(0, Number(site.visitCount) || 0),
      page_count: Math.max(0, Number(site.pageCount) || 0),
    })).filter((site) => site.domain) : [];
    if (!sites.length) return jsonResponse({ suggestions: [] });

    const result = await aiJsonRequest(
      `You organize website classification tags for BestHistory.\n` +
      `The user already has one multi-select tag system. Do NOT invent a second taxonomy.\n` +
      `For each website, suggest 1-3 useful tags. Never remove or replace current tags.\n` +
      `Priority: (1) reuse the user's existing tags whenever they fit, (2) only then propose a small number of genuinely useful new tags. Avoid synonyms and near-duplicates. Across the whole batch, propose no more than 5 distinct new tags not already in existing_tags.\n` +
      `Use the user's locale (${locale}) for NEW tag names. Preserve existing tag spelling exactly when reusing it.\n` +
      `Use only domain, site name and recent page titles. Do not claim to know page content that is not shown.\n` +
      `Return strict JSON only: {"suggestions":[{"domain":string,"suggested_tags":[string]}]}.`,
      JSON.stringify({ existing_tags: existingTags, sites }),
    );

    const allowedDomains = new Set(sites.map((site) => site.domain));
    const suggestions = Array.isArray(result?.suggestions) ? result.suggestions.slice(0, sites.length).map((item: any) => ({
      domain: typeof item?.domain === 'string' ? item.domain.slice(0, 120).toLocaleLowerCase() : '',
      suggestedTags: stringList(item?.suggested_tags, 3, 20),
    })).filter((item: any) => allowedDomains.has(item.domain) && item.suggestedTags.length) : [];
    return jsonResponse({ suggestions });
  } catch (error) {
    console.error('ai-organize-websites', error);
    const message = error instanceof Error ? error.message : 'AI_ORGANIZE_FAILED';
    const status = message === 'AUTH_REQUIRED' ? 401 : message === 'PRO_REQUIRED' ? 403 : message.startsWith('MISSING_ENV:') ? 503 : 500;
    return jsonResponse({ error: message }, status);
  }
});
