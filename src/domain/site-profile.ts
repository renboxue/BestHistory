export interface SiteProfile {
  domain: string;
  customName: string;
  note: string;
  tags: string[];
  pinned: boolean;
  hidden: boolean;
  updatedAt: number;
}

export type SiteProfileMap = Record<string, SiteProfile>;

export function normalizeSiteTags(tags: string[]): string[] {
  const normalized: string[] = [];
  for (const raw of tags) {
    for (const value of raw.split(/[,，;；、\n]+/u)) {
      const tag = value.trim().slice(0, 20);
      if (tag && normalized.length < 10 && !normalized.some((item) => item.toLocaleLowerCase() === tag.toLocaleLowerCase())) normalized.push(tag);
    }
  }
  return normalized;
}

export function createSiteProfile(domain: string): SiteProfile {
  return {
    domain,
    customName: '',
    note: '',
    tags: [],
    pinned: false,
    hidden: false,
    updatedAt: Date.now(),
  };
}
