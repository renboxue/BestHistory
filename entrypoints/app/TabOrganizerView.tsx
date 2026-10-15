import { useEffect, useMemo, useRef, useState } from 'react';
import { browser } from 'wxt/browser';
import type { SiteProfileMap } from '@/src/domain/site-profile';
import { createTranslator, type Locale } from '@/src/i18n/messages';
import { buildSmartCleanupSuggestions, type SmartCleanupSuggestion } from '@/src/pro/tab-intelligence';
import {
  DEFAULT_TAB_ORGANIZER_SETTINGS,
  closeManagedTabs,
  duplicateTabsToClose,
  findDuplicateTabs,
  isDomainAutoProtected,
  isTabProtected,
  readOpenTabs,
  readRecentlyClosedTabs,
  readTabOrganizerSettings,
  reopenClosedTab,
  saveTabOrganizerSettings,
  tabIsStale,
  type ClosedTabRecord,
  type ManagedTab,
  type TabAutoCloseDays,
  type TabOrganizerSettings,
} from '@/src/tabs/tab-organizer';

type Props = {
  locale: Locale;
  searchQuery: string;
  siteProfiles: SiteProfileMap;
  proAccess: boolean;
  proAccessLoading: boolean;
  onRequestPro: () => void;
};

type FilterMode = 'all' | 'duplicates' | 'stale1' | 'stale3' | 'stale7';
type SortMode = 'count' | 'recent' | 'oldest' | 'name';
type WindowScope = 'all' | 'current';

type Group = {
  domain: string;
  label: string;
  displayName: string;
  categories: string[];
  tabs: ManagedTab[];
};

type SortSnapshot = {
  groupOrder: string[];
  tabOrder: number[];
};

function normalizeSearch(value: string) {
  return value.normalize('NFKD').toLocaleLowerCase().replace(/\p{M}/gu, '');
}

function formatRelativeTime(timestamp: number | null, locale: Locale, unknown: string) {
  if (!timestamp) return unknown;
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(0, 'minute');
  if (diff < 60 * 60_000) return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-Math.max(1, Math.floor(diff / 60_000)), 'minute');
  if (diff < 24 * 60 * 60_000) return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-Math.max(1, Math.floor(diff / (60 * 60_000))), 'hour');
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-Math.max(1, Math.floor(diff / (24 * 60 * 60_000))), 'day');
}

function latestKnownAccess(tabs: ManagedTab[]): number {
  return Math.max(-1, ...tabs.map((tab) => tab.lastAccessed || -1));
}

function oldestKnownAccess(tabs: ManagedTab[]): number {
  const known = tabs.map((tab) => tab.lastAccessed).filter((value): value is number => Boolean(value));
  return known.length ? Math.min(...known) : Number.POSITIVE_INFINITY;
}

function sortTabsInsideGroup(tabs: ManagedTab[], mode: SortMode): ManagedTab[] {
  return [...tabs].sort((a, b) => {
    if (mode === 'oldest') return (a.lastAccessed || Number.POSITIVE_INFINITY) - (b.lastAccessed || Number.POSITIVE_INFINITY);
    return (b.lastAccessed || -1) - (a.lastAccessed || -1);
  });
}

function groupTabs(tabs: ManagedTab[], siteProfiles: SiteProfileMap, mode: SortMode): Group[] {
  const groups = new Map<string, Group>();
  for (const tab of tabs) {
    const profile = siteProfiles[tab.domain];
    const current = groups.get(tab.domain) || {
      domain: tab.domain,
      label: tab.groupLabel,
      displayName: profile?.customName || tab.groupLabel,
      categories: profile?.tags || [],
      tabs: [],
    };
    current.tabs.push(tab);
    groups.set(tab.domain, current);
  }
  return [...groups.values()]
    .map((group) => ({ ...group, tabs: sortTabsInsideGroup(group.tabs, mode) }))
    .sort((a, b) => {
      if (mode === 'count') return b.tabs.length - a.tabs.length || a.displayName.localeCompare(b.displayName);
      if (mode === 'recent') return latestKnownAccess(b.tabs) - latestKnownAccess(a.tabs) || a.displayName.localeCompare(b.displayName);
      if (mode === 'oldest') return oldestKnownAccess(a.tabs) - oldestKnownAccess(b.tabs) || a.displayName.localeCompare(b.displayName);
      return a.displayName.localeCompare(b.displayName);
    });
}

function buildSortSnapshot(tabs: ManagedTab[], siteProfiles: SiteProfileMap, mode: SortMode): SortSnapshot {
  const sorted = groupTabs(tabs, siteProfiles, mode);
  return {
    groupOrder: sorted.map((group) => group.domain),
    tabOrder: sorted.flatMap((group) => group.tabs.map((tab) => tab.id)),
  };
}

function extendSortSnapshot(snapshot: SortSnapshot, tabs: ManagedTab[]): SortSnapshot {
  const currentTabIds = new Set(tabs.map((tab) => tab.id));
  const currentDomains = new Set(tabs.map((tab) => tab.domain));
  const nextGroupOrder = snapshot.groupOrder.filter((domain) => currentDomains.has(domain));
  const knownDomains = new Set(nextGroupOrder);
  for (const tab of tabs) {
    if (!knownDomains.has(tab.domain)) {
      knownDomains.add(tab.domain);
      nextGroupOrder.push(tab.domain);
    }
  }

  const nextTabOrder = snapshot.tabOrder.filter((id) => currentTabIds.has(id));
  const knownTabs = new Set(nextTabOrder);
  for (const tab of tabs) {
    if (!knownTabs.has(tab.id)) {
      knownTabs.add(tab.id);
      nextTabOrder.push(tab.id);
    }
  }

  return { groupOrder: nextGroupOrder, tabOrder: nextTabOrder };
}

function stabilizeGroups(groups: Group[], snapshot: SortSnapshot): Group[] {
  const groupRank = new Map(snapshot.groupOrder.map((domain, index) => [domain, index]));
  const tabRank = new Map(snapshot.tabOrder.map((id, index) => [id, index]));
  return [...groups]
    .sort((a, b) => (groupRank.get(a.domain) ?? Number.MAX_SAFE_INTEGER) - (groupRank.get(b.domain) ?? Number.MAX_SAFE_INTEGER))
    .map((group) => ({
      ...group,
      tabs: [...group.tabs].sort((a, b) => (tabRank.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (tabRank.get(b.id) ?? Number.MAX_SAFE_INTEGER)),
    }));
}

function filterModeDays(mode: FilterMode): 1 | 3 | 7 | null {
  if (mode === 'stale1') return 1;
  if (mode === 'stale3') return 3;
  if (mode === 'stale7') return 7;
  return null;
}

function canProtectDomain(domain: string): boolean {
  return domain !== 'besthistory' && !domain.includes('://') && domain.includes('.');
}

function removeMatchingProtection(values: string[], domain: string): string[] {
  const normalized = domain.replace(/^www\./i, '').toLowerCase();
  return values.filter((item) => !(normalized === item || normalized.endsWith(`.${item}`)));
}

export default function TabOrganizerView({ locale, searchQuery, siteProfiles, proAccess, proAccessLoading, onRequestPro }: Props) {
  const t = useMemo(() => createTranslator(locale), [locale]);
  const [tabs, setTabs] = useState<ManagedTab[]>([]);
  const [currentWindowId, setCurrentWindowId] = useState<number | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [sortMode, setSortMode] = useState<SortMode>('count');
  const [windowScope, setWindowScope] = useState<WindowScope>('all');
  const [selectedCategoryFilters, setSelectedCategoryFilters] = useState<Set<string>>(new Set());
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showClosableOnly, setShowClosableOnly] = useState(false);
  const [collapsedDomains, setCollapsedDomains] = useState<Set<string>>(new Set());
  const [settings, setSettings] = useState<TabOrganizerSettings>(DEFAULT_TAB_ORGANIZER_SETTINGS);
  const [settingsDraft, setSettingsDraft] = useState<TabOrganizerSettings>(DEFAULT_TAB_ORGANIZER_SETTINGS);
  const [whitelistDraft, setWhitelistDraft] = useState('');
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [recentlyClosed, setRecentlyClosed] = useState<ClosedTabRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [smartSuggestions, setSmartSuggestions] = useState<SmartCleanupSuggestion[] | null>(null);
  const [smartDismissedIds, setSmartDismissedIds] = useState<Set<string>>(new Set());
  const [smartNotice, setSmartNotice] = useState('');
  const sortSnapshotRef = useRef<SortSnapshot>({ groupOrder: [], tabOrder: [] });
  const [sortSnapshotVersion, setSortSnapshotVersion] = useState(0);

  function replaceSortSnapshot(nextTabs: ManagedTab[], mode: SortMode) {
    sortSnapshotRef.current = buildSortSnapshot(nextTabs, siteProfiles, mode);
    setSortSnapshotVersion((value) => value + 1);
  }

  function extendCurrentSortSnapshot(nextTabs: ManagedTab[]) {
    if (!sortSnapshotRef.current.groupOrder.length && !sortSnapshotRef.current.tabOrder.length) {
      sortSnapshotRef.current = buildSortSnapshot(nextTabs, siteProfiles, sortMode);
    } else {
      sortSnapshotRef.current = extendSortSnapshot(sortSnapshotRef.current, nextTabs);
    }
    setSortSnapshotVersion((value) => value + 1);
  }

  async function refresh(resort = false) {
    try {
      const [nextTabs, nextSettings, closed, currentWindow] = await Promise.all([
        readOpenTabs(),
        readTabOrganizerSettings(),
        readRecentlyClosedTabs(12),
        browser.windows.getCurrent().catch(() => null),
      ]);
      if (resort) replaceSortSnapshot(nextTabs, sortMode);
      else extendCurrentSortSnapshot(nextTabs);
      setTabs(nextTabs);
      setCurrentWindowId(currentWindow?.id ?? null);
      setSettings(nextSettings);
      setSettingsDraft(nextSettings);
      setWhitelistDraft(nextSettings.whitelistDomains.join('\n'));
      setSelectedIds((current) => new Set([...current].filter((id) => nextTabs.some((tab) => tab.id === id))));
      setRecentlyClosed(closed);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }

  useEffect(() => {
    void refresh(true);
    let timer: number | null = null;
    const schedule = () => {
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => { timer = null; void refresh(false); }, 120);
    };
    const onRemoved = () => schedule();
    const onCreated = () => schedule();
    const onUpdated = () => schedule();
    const onActivated = () => schedule();
    browser.tabs.onRemoved.addListener(onRemoved);
    browser.tabs.onCreated.addListener(onCreated);
    browser.tabs.onUpdated.addListener(onUpdated);
    browser.tabs.onActivated.addListener(onActivated);
    return () => {
      if (timer !== null) window.clearTimeout(timer);
      browser.tabs.onRemoved.removeListener(onRemoved);
      browser.tabs.onCreated.removeListener(onCreated);
      browser.tabs.onUpdated.removeListener(onUpdated);
      browser.tabs.onActivated.removeListener(onActivated);
    };
  }, []);

  const scopeTabs = useMemo(() => tabs.filter((tab) => windowScope === 'all' || currentWindowId === null || tab.windowId === currentWindowId), [currentWindowId, tabs, windowScope]);
  useEffect(() => {
    if (!proAccess || status !== 'ready' || smartSuggestions !== null) return;
    const next = buildSmartCleanupSuggestions(scopeTabs, settings)
      .filter((suggestion) => !smartDismissedIds.has(suggestion.id));
    setSmartSuggestions(next);
  }, [proAccess, settings, smartDismissedIds, smartSuggestions, scopeTabs, status]);
  const categoryUsage = useMemo(() => {
    const counts = new Map<string, Set<string>>();
    const domains = new Set(scopeTabs.map((tab) => tab.domain));
    for (const domain of domains) {
      for (const tag of siteProfiles[domain]?.tags || []) {
        const current = counts.get(tag) || new Set<string>();
        current.add(domain);
        counts.set(tag, current);
      }
    }
    return [...counts.entries()]
      .map(([tag, domainsForTag]) => [tag, domainsForTag.size] as const)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], locale));
  }, [locale, scopeTabs, siteProfiles]);
  const availableCategories = useMemo(() => categoryUsage.map(([tag]) => tag), [categoryUsage]);

  useEffect(() => {
    const available = new Set(availableCategories);
    setSelectedCategoryFilters((current) => {
      const next = new Set([...current].filter((tag) => available.has(tag)));
      if (next.size === current.size && [...next].every((tag) => current.has(tag))) return current;
      return next;
    });
  }, [availableCategories]);

  const query = normalizeSearch(searchQuery.trim());
  const contextTabs = useMemo(() => scopeTabs.filter((tab) => {
    const profile = siteProfiles[tab.domain];
    if ([...selectedCategoryFilters].some((tag) => !profile?.tags.includes(tag))) return false;
    if (query && !normalizeSearch(`${tab.title} ${tab.url} ${tab.groupLabel} ${profile?.customName || ''} ${(profile?.tags || []).join(' ')}`).includes(query)) return false;
    return true;
  }), [query, scopeTabs, selectedCategoryFilters, siteProfiles]);

  const duplicates = useMemo(() => findDuplicateTabs(contextTabs), [contextTabs]);
  const duplicateCloseCandidates = useMemo(() => duplicateTabsToClose(contextTabs), [contextTabs]);

  const filteredTabs = useMemo(() => contextTabs.filter((tab) => {
    if (filterMode === 'duplicates' && !duplicates.has(tab.url)) return false;
    if (filterMode === 'stale1' && !tabIsStale(tab, 1)) return false;
    if (filterMode === 'stale3' && !tabIsStale(tab, 3)) return false;
    if (filterMode === 'stale7' && !tabIsStale(tab, 7)) return false;
    if (showClosableOnly && isTabProtected(tab)) return false;
    return true;
  }), [contextTabs, duplicates, filterMode, showClosableOnly]);

  const groups = useMemo(() => stabilizeGroups(groupTabs(filteredTabs, siteProfiles, sortMode), sortSnapshotRef.current), [filteredTabs, siteProfiles, sortMode, sortSnapshotVersion]);
  const websiteCount = useMemo(() => new Set(scopeTabs.map((tab) => tab.domain)).size, [scopeTabs]);
  const windowCount = useMemo(() => new Set(scopeTabs.map((tab) => tab.windowId)).size, [scopeTabs]);
  const closableVisibleIds = useMemo(() => filteredTabs.filter((tab) => !isTabProtected(tab)).map((tab) => tab.id), [filteredTabs]);
  const selectedClosable = useMemo(() => tabs.filter((tab) => selectedIds.has(tab.id) && !isTabProtected(tab)), [selectedIds, tabs]);
  const staleSummaryDays = filterModeDays(filterMode) || 3;

  function toggleSelected(tab: ManagedTab) {
    if (isTabProtected(tab)) return;
    setSelectedIds((current) => {
      const next = new Set(current);
      next.has(tab.id) ? next.delete(tab.id) : next.add(tab.id);
      return next;
    });
  }

  function toggleCollapsed(domain: string) {
    setCollapsedDomains((current) => {
      const next = new Set(current);
      next.has(domain) ? next.delete(domain) : next.add(domain);
      return next;
    });
  }

  async function closeTabs(ids: number[], reason: 'manual' | 'site' | 'duplicate' | 'stale' | 'smart') {
    if (!ids.length) return;
    setBusy(true);
    setActionError('');
    try {
      await closeManagedTabs(ids, reason);
      setSelectedIds(new Set());
      await refresh(false);
    } catch {
      setActionError(t('tabCloseFailed'));
    } finally {
      setBusy(false);
    }
  }

  function analyzeSmartCleanup() {
    if (!proAccess) return;
    const next = buildSmartCleanupSuggestions(scopeTabs, settings)
      .filter((suggestion) => !smartDismissedIds.has(suggestion.id));
    setSmartSuggestions(next);
    setSmartNotice('');
  }

  async function applySmartSuggestion(suggestion: SmartCleanupSuggestion) {
    setSmartNotice('');
    await closeTabs(suggestion.tabIds, 'smart');
    setSmartSuggestions((current) => current ? current.filter((item) => item.id !== suggestion.id) : current);
    setSmartNotice(t('proSmartApplied').replace('{count}', suggestion.count.toLocaleString(locale)));
  }

  function dismissSmartSuggestion(suggestion: SmartCleanupSuggestion) {
    setSmartDismissedIds((current) => new Set(current).add(suggestion.id));
    setSmartSuggestions((current) => current ? current.filter((item) => item.id !== suggestion.id) : current);
  }

  async function saveSettings() {
    setBusy(true);
    setActionError('');
    setSettingsSaved(false);
    try {
      const whitelistDomains = whitelistDraft.split(/[\n,，;；\s]+/).filter(Boolean);
      const saved = await saveTabOrganizerSettings({ ...settingsDraft, whitelistDomains });
      setSettings(saved);
      setSettingsDraft(saved);
      setWhitelistDraft(saved.whitelistDomains.join('\n'));
      setSmartSuggestions(null);
      setSettingsSaved(true);
      window.setTimeout(() => setSettingsSaved(false), 1800);
    } catch {
      setActionError(t('tabSettingsSaveFailed'));
    } finally {
      setBusy(false);
    }
  }

  async function toggleDomainAutoProtection(domain: string) {
    if (!canProtectDomain(domain)) return;
    setBusy(true);
    setActionError('');
    try {
      const protectedNow = isDomainAutoProtected(domain, settings.whitelistDomains);
      const whitelistDomains = protectedNow
        ? removeMatchingProtection(settings.whitelistDomains, domain)
        : [...settings.whitelistDomains, domain];
      const saved = await saveTabOrganizerSettings({ ...settings, whitelistDomains });
      setSettings(saved);
      setSettingsDraft((current) => ({ ...current, whitelistDomains: saved.whitelistDomains }));
      setWhitelistDraft(saved.whitelistDomains.join('\n'));
      setSmartSuggestions(null);
      setSettingsSaved(true);
      window.setTimeout(() => setSettingsSaved(false), 1800);
    } catch {
      setActionError(t('tabSettingsSaveFailed'));
    } finally {
      setBusy(false);
    }
  }

  async function activateTab(tab: ManagedTab) {
    await browser.tabs.update(tab.id, { active: true });
    await browser.windows.update(tab.windowId, { focused: true });
  }

  function toggleCategoryFilter(tag: string) {
    setSelectedCategoryFilters((current) => {
      const next = new Set(current);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
    setSelectedIds(new Set());
  }

  function chooseFilter(id: FilterMode) {
    setFilterMode(id);
    setSelectedIds(new Set());
  }

  function chooseSort(mode: SortMode) {
    setSortMode(mode);
    replaceSortSnapshot(tabs, mode);
  }

  const filterButtons: Array<[FilterMode, string]> = [
    ['all', t('tabFilterAll')],
    ['duplicates', t('tabFilterDuplicates').replace('{count}', duplicateCloseCandidates.length.toLocaleString(locale))],
    ['stale1', t('tabFilterStale1')],
    ['stale3', t('tabFilterStale3')],
    ['stale7', t('tabFilterStale7')],
  ];

  return (
    <section className="content-card tab-organizer-card">
      <div className="tab-organizer-hero">
        <div>
          <h2>{t('tabOrganizerTitle')}</h2>
          <p>{t('tabOrganizerDescription')}</p>
        </div>
        <button className="tab-refresh-button" disabled={busy} onClick={() => void refresh(true)}>↻ {t('tabRefresh')}</button>
      </div>

      <div className="tab-organizer-stats four">
        <article><span>{t('tabOpenCount')}</span><strong>{scopeTabs.length.toLocaleString(locale)}</strong></article>
        <article><span>{t('tabWindowCount')}</span><strong>{windowCount.toLocaleString(locale)}</strong></article>
        <article><span>{t('tabWebsiteCount')}</span><strong>{websiteCount.toLocaleString(locale)}</strong></article>
        <article><span>{t('tabDuplicateCount')}</span><strong>{duplicateCloseCandidates.length.toLocaleString(locale)}</strong></article>
      </div>

      <div className="tab-organizer-message"><span>✓</span><div><strong>{t('tabCloseConfidenceTitle')}</strong><p>{t('tabCloseConfidenceDesc')}</p></div></div>
      <div className="tab-organizer-private-note">🔒 {t('tabIncognitoExcluded')}</div>

      <div className="tab-organizer-toolbar">
        <div className="tab-toolbar-row tab-toolbar-filters">
          <div className="tab-filter-buttons">{filterButtons.map(([id, label]) => <button className={filterMode === id ? 'active' : ''} key={id} onClick={() => chooseFilter(id)}>{label}</button>)}</div>
        </div>

        <div className="tab-toolbar-row tab-toolbar-controls">
          <div className="tab-control-cluster">
            <span className="tab-control-label">{t('tabWindowScope')}</span>
            <div className="tab-scope-switch">
              <button className={windowScope === 'all' ? 'active' : ''} onClick={() => { setWindowScope('all'); setSelectedIds(new Set()); setSmartSuggestions(null); setSmartNotice(''); }}>{t('tabWindowAll')}</button>
              <button className={windowScope === 'current' ? 'active' : ''} disabled={currentWindowId === null} onClick={() => { setWindowScope('current'); setSelectedIds(new Set()); setSmartSuggestions(null); setSmartNotice(''); }}>{t('tabWindowCurrent')}</button>
            </div>
          </div>
          <div className="tab-control-cluster tab-sort-control">
            <span className="tab-control-label">{t('tabSortLabel')}</span>
            <div className="site-filters system-views tab-sort-buttons">
              {([
                ['count', t('tabSortCount')],
                ['recent', t('tabSortRecent')],
                ['oldest', t('tabSortOldest')],
                ['name', t('tabSortName')],
              ] as Array<[SortMode, string]>).map(([id, label]) => <button className={sortMode === id ? 'active' : ''} key={id} onClick={() => chooseSort(id)}>{label}</button>)}
            </div>
          </div>
          <label className="tab-closable-toggle"><input type="checkbox" checked={showClosableOnly} onChange={(event) => { setShowClosableOnly(event.target.checked); setSelectedIds(new Set()); }} /><span>{t('tabOnlyClosable')}</span></label>
        </div>

        {categoryUsage.length > 0 && <div className="tab-category-filter-row">
          <span className="tab-control-label">{t('tabCategoryLabel')}</span>
          <div className="site-filters tag-filters tab-category-filters">
            <button className={selectedCategoryFilters.size === 0 ? 'active' : ''} onClick={() => { setSelectedCategoryFilters(new Set()); setSelectedIds(new Set()); }}>{t('tabCategoryAll')}</button>
            {(showAllCategories ? categoryUsage : categoryUsage.slice(0, 8)).map(([tag, count]) => <button className={selectedCategoryFilters.has(tag) ? 'active' : ''} key={tag} onClick={() => toggleCategoryFilter(tag)}>#{tag}<small>{count}</small></button>)}
            {categoryUsage.length > 8 && <button onClick={() => setShowAllCategories((value) => !value)}>{showAllCategories ? t('fewerTags') : t('moreTags')}</button>}
          </div>
        </div>}

        <div className="tab-toolbar-row tab-toolbar-actions">
          <div className="tab-bulk-actions">
            <button disabled={!closableVisibleIds.length || busy} onClick={() => setSelectedIds(new Set(closableVisibleIds))}>{t('tabSelectVisible').replace('{count}', closableVisibleIds.length.toLocaleString(locale))}</button>
            {selectedIds.size > 0 && <button onClick={() => setSelectedIds(new Set())}>{t('tabClearSelection')}</button>}
            <button className="tab-danger-button" disabled={!selectedClosable.length || busy} onClick={() => void closeTabs(selectedClosable.map((tab) => tab.id), filterMode.startsWith('stale') ? 'stale' : 'manual')}>{t('tabCloseSelected').replace('{count}', selectedClosable.length.toLocaleString(locale))}</button>
            <button className="tab-duplicate-button" disabled={!duplicateCloseCandidates.length || busy} onClick={() => void closeTabs(duplicateCloseCandidates.map((tab) => tab.id), 'duplicate')}>{t('tabCleanDuplicates').replace('{count}', duplicateCloseCandidates.length.toLocaleString(locale))}</button>
          </div>
          <div className="tab-action-explainers">
            <span title={t('tabClosableHelp')}>ⓘ {t('tabClosableHelp')}</span>
            <span title={t('tabDuplicateRule')}>◎ {t('tabDuplicateRule')}</span>
            <span title={t('tabLastViewedHelp')}>◷ {t('tabLastViewedHelp')}</span>
          </div>
        </div>
      </div>

      {actionError && <div className="tab-action-error">{actionError}</div>}
      {status === 'loading' && <div className="state">{t('tabLoading')}</div>}
      {status === 'error' && <div className="state error">{t('tabLoadFailed')}</div>}
      {status === 'ready' && groups.length === 0 && <div className="state">{t('tabEmpty')}</div>}

      <div className="tab-site-groups">
        {groups.map((group) => {
          const closable = group.tabs.filter((tab) => !isTabProtected(tab));
          const selectedCount = group.tabs.filter((tab) => selectedIds.has(tab.id)).length;
          const firstUrl = group.tabs[0]?.url || '';
          const collapsed = collapsedDomains.has(group.domain);
          const staleCount = group.tabs.filter((tab) => tabIsStale(tab, staleSummaryDays)).length;
          const protectedFromAuto = isDomainAutoProtected(group.domain, settings.whitelistDomains);
          const protectable = canProtectDomain(group.domain);
          return <section className={`tab-site-group ${collapsed ? 'collapsed' : ''}`} key={group.domain}>
            <div className="tab-site-heading">
              <div className="tab-site-heading-main">
                <button className="tab-collapse-button" type="button" aria-expanded={!collapsed} title={collapsed ? t('tabExpand') : t('tabCollapse')} onClick={() => toggleCollapsed(group.domain)}>{collapsed ? '▸' : '▾'}</button>
                <div className="tab-site-identity">
                  <div className="tab-group-favicon">{firstUrl && <img src={browser.runtime.getURL(`/_favicon/?pageUrl=${encodeURIComponent(firstUrl)}&size=32`)} alt="" />}</div>
                  <div>
                    <strong>{group.displayName}</strong>
                    <small>{group.displayName !== group.label ? `${group.label} · ` : ''}{t('tabGroupCount').replace('{count}', group.tabs.length.toLocaleString(locale))}{staleCount ? ` · ${t('tabGroupStaleCount').replace('{count}', staleCount.toLocaleString(locale)).replace('{days}', String(staleSummaryDays))}` : ''}{selectedCount ? ` · ${t('tabSelectedCount').replace('{count}', selectedCount.toLocaleString(locale))}` : ''}</small>
                    {group.categories.length > 0 && <div className="tab-site-categories">{group.categories.map((tag) => <span key={tag}>#{tag}</span>)}</div>}
                  </div>
                </div>
              </div>
              <div className="tab-group-actions">
                {protectable && <button className={`tab-auto-protect-button ${protectedFromAuto ? 'active' : ''}`} disabled={busy} type="button" title={protectedFromAuto ? t('tabAutoProtectSiteOff') : t('tabAutoProtectSiteOn')} onClick={() => void toggleDomainAutoProtection(group.domain)}><span aria-hidden="true">🛡</span>{protectedFromAuto ? t('tabAutoProtectSite') : t('tabAutoProtectSiteOnShort')}</button>}
                <button className="tab-group-close" disabled={!closable.length || busy} title={t('tabCloseSiteHelp')} onClick={() => void closeTabs(closable.map((tab) => tab.id), 'site')}>{t('tabCloseSite').replace('{count}', closable.length.toLocaleString(locale))}</button>
              </div>
            </div>
            {!collapsed && <div className="tab-row-list">
              {group.tabs.map((tab) => {
                const protectedTab = isTabProtected(tab);
                const duplicateTab = duplicates.has(tab.url);
                const relative = formatRelativeTime(tab.lastAccessed, locale, t('tabLastUsedUnknown'));
                return <div className={`tab-row ${protectedTab ? 'protected' : ''}`} key={tab.id}>
                  <label className="tab-row-check"><input type="checkbox" disabled={protectedTab} checked={selectedIds.has(tab.id)} onChange={() => toggleSelected(tab)} /></label>
                  <button className="tab-row-main" onClick={() => void activateTab(tab)} title={tab.url}>
                    <span className="tab-row-title">{tab.title}</span>
                    <span className="tab-row-url">{tab.url}</span>
                  </button>
                  <div className="tab-row-badges">
                    {duplicateTab && <span className="duplicate">{t('tabBadgeDuplicate')}</span>}
                    {tab.active && <span>{t('tabBadgeCurrent')}</span>}
                    {tab.pinned && <span>{t('tabBadgePinned')}</span>}
                    {tab.audible && <span>{t('tabBadgeAudible')}</span>}
                  </div>
                  <time title={t('tabLastViewedHelp')}>{t('tabLastViewed').replace('{time}', relative)}</time>
                  <button className="tab-row-close" type="button" disabled={protectedTab || busy} title={protectedTab ? t('tabClosableHelp') : t('tabCloseOne')} onClick={() => void closeTabs([tab.id], 'manual')}>{t('tabCloseOne')}</button>
                </div>;
              })}
            </div>}
          </section>;
        })}
      </div>

      <div className="tab-organizer-bottom-grid">
        <section className="tab-auto-panel">
          <div className="tab-panel-heading"><div><h3>{t('tabAutoTitle')} <span>{t('tabBetaLabel')}</span></h3><p>{t('tabAutoDescription')}</p></div></div>
          <label className="tab-setting-row"><span>{t('tabAutoThreshold')}</span><select value={settingsDraft.autoCloseDays} onChange={(event) => setSettingsDraft((current) => ({ ...current, autoCloseDays: Number(event.target.value) as TabAutoCloseDays }))}><option value="0">{t('tabAutoOff')}</option><option value="1">{t('tabAuto1')}</option><option value="3">{t('tabAuto3')}</option><option value="7">{t('tabAuto7')}</option></select></label>
          <label className="tab-setting-toggle"><input type="checkbox" checked={settingsDraft.protectPinned} onChange={(event) => setSettingsDraft((current) => ({ ...current, protectPinned: event.target.checked }))} /><span><strong>{t('tabProtectPinned')}</strong><small>{t('tabProtectPinnedDesc')}</small></span></label>
          <label className="tab-setting-toggle"><input type="checkbox" checked={settingsDraft.protectAudible} onChange={(event) => setSettingsDraft((current) => ({ ...current, protectAudible: event.target.checked }))} /><span><strong>{t('tabProtectAudible')}</strong><small>{t('tabProtectAudibleDesc')}</small></span></label>
          <div className="tab-setting-fixed">✓ {t('tabProtectCurrentAlways')}</div>
          <label className="tab-whitelist"><span>{t('tabWhitelist')}</span><textarea rows={4} value={whitelistDraft} onChange={(event) => setWhitelistDraft(event.target.value)} placeholder={t('tabWhitelistPlaceholder')} /><small>{t('tabWhitelistDesc')}</small></label>
          <div className="tab-auto-actions"><button disabled={busy} onClick={() => void saveSettings()}>{t('tabSaveSettings')}</button>{settingsSaved && <span>✓ {t('tabSettingsSaved')}</span>}</div>
          <p className="tab-auto-footnote">{t('tabAutoCompatibility')}</p>
        </section>

        <section className="tab-recent-panel">
          <div className="tab-panel-heading"><div><h3>{t('tabRecentlyClosed')}</h3><p>{t('tabRecentlyClosedDesc')}</p></div></div>
          {recentlyClosed.length === 0 ? <div className="tab-recent-empty">{t('tabRecentlyClosedEmpty')}</div> : <div className="tab-recent-list">{recentlyClosed.map((record) => <div className="tab-recent-row" key={record.id}><div><strong>{record.title || record.domain}</strong><small>{record.domain} · {formatRelativeTime(record.closedAt, locale, t('tabLastUsedUnknown'))}</small></div><button onClick={() => void reopenClosedTab(record)}>{t('tabReopen')}</button></div>)}</div>}
        </section>
      </div>
    </section>
  );
}
