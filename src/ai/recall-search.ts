import { getDomain, type HistoryRecord } from '@/src/domain/history';
import type { SiteProfileMap } from '@/src/domain/site-profile';
import type { AiRecallExpansion, AiRecallLocalHint, AiRecallResult } from '@/src/ai/types';

function normalize(value: string): string {
  return value.normalize('NFKD').toLocaleLowerCase().replace(/\p{M}/gu, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').trim();
}

function uniqueStrings(values: string[], limit = 50): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of values) {
    const value = raw.trim();
    const key = normalize(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= limit) break;
  }
  return out;
}

function rawQueryTerms(query: string): string[] {
  const normalized = normalize(query);
  const parts = normalized.split(/[\s,，;；、/|]+/u).filter((value) => value.length >= 2);
  return uniqueStrings([normalized, ...parts], 16).map(normalize);
}

export function buildRecallLocalHints(query: string, records: HistoryRecord[], limit = 12): AiRecallLocalHint[] {
  const terms = rawQueryTerms(query);
  if (!terms.length) return [];
  const scored = records.map((record) => {
    const domain = getDomain(record.url) || '';
    const text = normalize(`${domain} ${record.title}`);
    const score = terms.reduce((sum, term) => sum + (text.includes(term) ? Math.max(1, term.length) : 0), 0);
    return { record, domain, score };
  }).filter((item) => item.domain && item.score > 0)
    .sort((a, b) => b.score - a.score || b.record.lastVisitTime - a.record.lastVisitTime);

  const seen = new Set<string>();
  const hints: AiRecallLocalHint[] = [];
  for (const item of scored) {
    const key = `${item.domain}\u0000${item.record.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    hints.push({ domain: item.domain, title: item.record.title.slice(0, 180) });
    if (hints.length >= limit) break;
  }
  return hints;
}

function timeScore(timestamp: number, expansion: AiRecallExpansion): { score: number; matched: boolean } {
  const hint = expansion.time;
  if (hint.kind === 'none') return { score: 0, matched: false };
  if (hint.kind === 'recent_days') {
    const days = Math.max(1, Math.min(3650, hint.days || 1));
    const cutoff = Date.now() - days * 86_400_000;
    return timestamp >= cutoff ? { score: 18, matched: true } : { score: -4, matched: false };
  }
  const from = hint.from ? new Date(`${hint.from}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY;
  const to = hint.to ? new Date(`${hint.to}T23:59:59.999`).getTime() : Number.POSITIVE_INFINITY;
  if (!Number.isFinite(from) && !Number.isFinite(to)) return { score: 0, matched: false };
  const matched = timestamp >= from && timestamp <= to;
  return matched ? { score: 18, matched: true } : { score: -4, matched: false };
}

export function searchRecallCandidates(
  query: string,
  expansion: AiRecallExpansion,
  records: HistoryRecord[],
  profiles: SiteProfileMap,
  limit = 20,
): AiRecallResult[] {
  const entityTerms = uniqueStrings(expansion.entities || [], 20).map(normalize);
  const domainTerms = uniqueStrings(expansion.domains || [], 20).map((value) => normalize(value.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')));
  const keywordTerms = uniqueStrings(expansion.keywords || [], 30).map(normalize);
  const categoryTerms = uniqueStrings(expansion.categories || [], 20).map(normalize);
  const originalTerms = rawQueryTerms(query);

  const results: AiRecallResult[] = [];
  for (const record of records) {
    const domain = getDomain(record.url);
    if (!domain) continue;
    const profile = profiles[domain];
    const title = record.title || domain;
    const normalizedDomain = normalize(domain);
    const pageText = normalize(`${domain} ${title} ${record.url}`);
    const tagText = normalize((profile?.tags || []).join(' '));
    let score = 0;
    const reasons = new Set<AiRecallResult['reasons'][number]>();

    for (const candidate of domainTerms) {
      if (!candidate) continue;
      if (normalizedDomain === candidate || normalizedDomain.endsWith(`.${candidate}`)) { score += 100; reasons.add('domain'); }
      else if (normalizedDomain.includes(candidate) || candidate.includes(normalizedDomain)) { score += 65; reasons.add('domain'); }
    }
    for (const entity of entityTerms) {
      if (entity && pageText.includes(entity)) { score += 52; reasons.add('domain'); }
    }
    for (const keyword of keywordTerms) {
      if (keyword && pageText.includes(keyword)) { score += Math.min(28, 12 + keyword.length); reasons.add('keyword'); }
      if (keyword && tagText.includes(keyword)) { score += 24; reasons.add('tag'); }
    }
    for (const category of categoryTerms) {
      if (category && tagText.includes(category)) { score += 36; reasons.add('tag'); }
    }
    for (const term of originalTerms) {
      if (term && pageText.includes(term)) { score += Math.min(14, 4 + term.length); reasons.add('keyword'); }
    }

    const temporal = timeScore(record.lastVisitTime, expansion);
    score += temporal.score;
    if (temporal.matched) reasons.add('time');
    score += Math.min(8, Math.log2(Math.max(1, record.visitCount)) * 1.5);

    if (score > 0) results.push({
      recordId: record.id,
      url: record.url,
      title,
      domain,
      lastVisitTime: record.lastVisitTime,
      visitCount: record.visitCount,
      score,
      reasons: [...reasons],
    });
  }

  return results.sort((a, b) => b.score - a.score || b.lastVisitTime - a.lastVisitTime).slice(0, limit);
}
