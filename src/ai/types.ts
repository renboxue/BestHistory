export type AiRecallTimeHint =
  | { kind: 'none' }
  | { kind: 'recent_days'; days: number }
  | { kind: 'date_range'; from: string | null; to: string | null };

export interface AiRecallLocalHint {
  domain: string;
  title: string;
}

export interface AiRecallExpansion {
  entities: string[];
  domains: string[];
  keywords: string[];
  categories: string[];
  time: AiRecallTimeHint;
}

export interface AiRecallRequest {
  query: string;
  locale: string;
  existingTags: string[];
  localHints: AiRecallLocalHint[];
}

export interface AiRecallResult {
  recordId: string;
  url: string;
  title: string;
  domain: string;
  lastVisitTime: number;
  visitCount: number;
  score: number;
  reasons: Array<'domain' | 'keyword' | 'tag' | 'time'>;
}

export interface AiOrganizeSiteInput {
  domain: string;
  displayName: string;
  currentTags: string[];
  recentTitles: string[];
  visitCount: number;
  pageCount: number;
}

export interface AiOrganizeWebsiteSuggestion {
  domain: string;
  suggestedTags: string[];
}

export interface AiOrganizeWebsitesRequest {
  locale: string;
  existingTags: string[];
  sites: AiOrganizeSiteInput[];
}
