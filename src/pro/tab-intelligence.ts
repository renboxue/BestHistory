import {
  duplicateTabsToClose,
  isDomainAutoProtected,
  isTabProtected,
  tabIsStale,
  type ManagedTab,
  type TabOrganizerSettings,
} from '@/src/tabs/tab-organizer';

export type SmartCleanupSuggestionKind = 'duplicates' | 'stale' | 'crowded';

export type SmartCleanupSuggestion = {
  id: string;
  kind: SmartCleanupSuggestionKind;
  domain: string;
  tabIds: number[];
  previewTitles: string[];
  count: number;
  staleDays: number | null;
  totalTabsAtSite: number;
};

function suggestionId(kind: SmartCleanupSuggestionKind, domain: string, tabIds: number[]) {
  return `${kind}:${domain}:${[...tabIds].sort((a, b) => a - b).join(',')}`;
}

function uniqueTabs(tabs: ManagedTab[]) {
  const seen = new Set<number>();
  return tabs.filter((tab) => {
    if (seen.has(tab.id)) return false;
    seen.add(tab.id);
    return true;
  });
}

/**
 * Conservative Pro cleanup suggestions.
 *
 * This first version is deliberately local-only: it combines exact duplicates,
 * foreground recency, site crowding, manual protection and the user's
 * "never auto-close" website list. It never auto-closes anything.
 */
export function buildSmartCleanupSuggestions(
  tabs: ManagedTab[],
  settings: TabOrganizerSettings,
  now = Date.now(),
): SmartCleanupSuggestion[] {
  const suggestions: SmartCleanupSuggestion[] = [];
  const eligible = tabs.filter((tab) => !isTabProtected(tab) && !isDomainAutoProtected(tab.domain, settings.whitelistDomains));
  const byDomain = new Map<string, ManagedTab[]>();

  for (const tab of tabs) {
    const current = byDomain.get(tab.domain) || [];
    current.push(tab);
    byDomain.set(tab.domain, current);
  }

  const duplicateCandidates = uniqueTabs(
    duplicateTabsToClose(tabs).filter((tab) => !isDomainAutoProtected(tab.domain, settings.whitelistDomains)),
  );
  const duplicateIds = new Set(duplicateCandidates.map((tab) => tab.id));

  for (const [domain, domainTabs] of byDomain) {
    const duplicateTabs = duplicateCandidates.filter((tab) => tab.domain === domain);
    if (!duplicateTabs.length) continue;
    suggestions.push({
      id: suggestionId('duplicates', domain, duplicateTabs.map((tab) => tab.id)),
      kind: 'duplicates',
      domain,
      tabIds: duplicateTabs.map((tab) => tab.id),
      previewTitles: duplicateTabs.slice(0, 3).map((tab) => tab.title),
      count: duplicateTabs.length,
      staleDays: null,
      totalTabsAtSite: domainTabs.length,
    });
  }

  for (const [domain, domainTabs] of byDomain) {
    if (isDomainAutoProtected(domain, settings.whitelistDomains)) continue;

    const domainEligible = eligible.filter((tab) => tab.domain === domain && !duplicateIds.has(tab.id));
    if (!domainEligible.length) continue;

    const stale14 = domainEligible.filter((tab) => tabIsStale(tab, 14, now));
    if (stale14.length >= 2) {
      suggestions.push({
        id: suggestionId('stale', domain, stale14.map((tab) => tab.id)),
        kind: 'stale',
        domain,
        tabIds: stale14.map((tab) => tab.id),
        previewTitles: stale14.slice(0, 3).map((tab) => tab.title),
        count: stale14.length,
        staleDays: 14,
        totalTabsAtSite: domainTabs.length,
      });
      continue;
    }

    if (domainTabs.length >= 6) {
      const stale3 = domainEligible.filter((tab) => tabIsStale(tab, 3, now));
      if (stale3.length >= 2) {
        suggestions.push({
          id: suggestionId('crowded', domain, stale3.map((tab) => tab.id)),
          kind: 'crowded',
          domain,
          tabIds: stale3.map((tab) => tab.id),
          previewTitles: stale3.slice(0, 3).map((tab) => tab.title),
          count: stale3.length,
          staleDays: 3,
          totalTabsAtSite: domainTabs.length,
        });
      }
    }
  }

  const rank: Record<SmartCleanupSuggestionKind, number> = { duplicates: 0, stale: 1, crowded: 2 };
  return suggestions
    .sort((a, b) => rank[a.kind] - rank[b.kind] || b.count - a.count || b.totalTabsAtSite - a.totalTabsAtSite || a.domain.localeCompare(b.domain))
    .slice(0, 8);
}
