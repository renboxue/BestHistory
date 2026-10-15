export interface HistoryRecord {
  id: string;
  url: string;
  title: string;
  lastVisitTime: number;
  visitCount: number;
}

export interface WebsiteSummary {
  domain: string;
  url: string;
  displayName: string;
  pageCount: number;
  visitCount: number;
  lastVisitTime: number;
  sampleTitle: string;
}

const GENERIC_TITLE_PARTS = new Set([
  'home', 'homepage', 'index', 'login', 'sign in', 'dashboard', 'console', '404', '404 not found',
  '首页', '主页', '登录', '登陆', '控制台', '工作台', '详情', '列表', '小程序', '页面不存在',
]);

function cleanTitlePart(value: string): string {
  return value.replace(/^[\s\[【(（]+|[\s\]】)）]+$/g, '').replace(/\s+/g, ' ').trim();
}

function titleParts(title: string): string[] {
  return title.split(/\s+(?:[-–—|｜·•:：])\s+|\s*\|\s*|\s*[—–]\s*|(?<=\p{Script=Han})-(?=\p{Script=Han})/u).map(cleanTitlePart).filter(Boolean);
}

function isUsefulName(value: string): boolean {
  const normalized = value.toLocaleLowerCase();
  return value.length >= 2 && value.length <= 32 && !GENERIC_TITLE_PARTS.has(normalized) && !/^https?:\/\//i.test(value) && !/^\d+$/.test(value);
}

export function inferWebsiteName(domain: string, records: HistoryRecord[]): string {
  const candidates = new Map<string, { value: string; count: number; homepage: number; recent: number }>();
  const sorted = [...records].sort((a, b) => b.lastVisitTime - a.lastVisitTime);
  sorted.forEach((record, index) => {
    if (!record.title) return;
    let isHomepage = false;
    try { isHomepage = new URL(record.url).pathname.replace(/\/+$/, '') === ''; } catch { /* ignore malformed history URLs */ }
    for (const part of titleParts(record.title)) {
      if (!isUsefulName(part)) continue;
      const key = part.toLocaleLowerCase();
      const current = candidates.get(key) || { value: part, count: 0, homepage: 0, recent: index };
      current.count += 1;
      current.homepage += isHomepage ? 1 : 0;
      current.recent = Math.min(current.recent, index);
      if (part.length < current.value.length) current.value = part;
      candidates.set(key, current);
    }
  });

  const repeated = [...candidates.values()].filter((candidate) => candidate.count >= 2 || candidate.homepage > 0);
  repeated.sort((a, b) => (b.homepage * 30 + b.count * 10 - b.value.length * 0.15 - b.recent * 0.01) - (a.homepage * 30 + a.count * 10 - a.value.length * 0.15 - a.recent * 0.01));
  if (repeated[0]) return repeated[0].value;

  const domainLabel = domain.split('.')[0] || domain;
  const singleUseful = sorted.flatMap((record) => titleParts(record.title)).find(isUsefulName);
  return singleUseful || domainLabel;
}

export function getDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return null;
  }
}

export function aggregateWebsites(records: HistoryRecord[]): WebsiteSummary[] {
  const sites = new Map<string, WebsiteSummary>();
  const siteRecords = new Map<string, HistoryRecord[]>();

  for (const record of records) {
    const domain = getDomain(record.url);
    if (!domain) continue;
    siteRecords.set(domain, [...(siteRecords.get(domain) || []), record]);

    const current = sites.get(domain);
    if (!current) {
      sites.set(domain, {
        domain,
        url: record.url,
        displayName: domain.split('.')[0] || domain,
        pageCount: 1,
        visitCount: record.visitCount,
        lastVisitTime: record.lastVisitTime,
        sampleTitle: record.title || domain,
      });
      continue;
    }

    current.pageCount += 1;
    current.visitCount += record.visitCount;
    if (record.lastVisitTime > current.lastVisitTime) {
      current.lastVisitTime = record.lastVisitTime;
      current.url = record.url;
      current.sampleTitle = record.title || current.sampleTitle;
    }
  }

  for (const site of sites.values()) {
    site.displayName = inferWebsiteName(site.domain, siteRecords.get(site.domain) || []);
  }

  return [...sites.values()].sort((a, b) => b.lastVisitTime - a.lastVisitTime);
}
