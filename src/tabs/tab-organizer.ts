import { browser } from 'wxt/browser';
import { localDatabase } from '@/src/storage/local-database';
import type { HistoryRecord } from '@/src/domain/history';

export type TabAutoCloseDays = 0 | 1 | 3 | 7;
export type TabCloseReason = 'manual' | 'site' | 'duplicate' | 'stale' | 'smart' | 'auto';

export interface TabOrganizerSettings {
  autoCloseDays: TabAutoCloseDays;
  protectPinned: boolean;
  protectAudible: boolean;
  whitelistDomains: string[];
}

export interface ManagedTab {
  id: number;
  windowId: number;
  index: number;
  title: string;
  url: string;
  domain: string;
  groupLabel: string;
  favIconUrl: string;
  active: boolean;
  pinned: boolean;
  audible: boolean;
  discarded: boolean;
  incognito: boolean;
  lastAccessed: number | null;
  protectedReasons: Array<'active' | 'pinned' | 'audible' | 'besthistory'>;
}

export interface ClosedTabRecord {
  id: string;
  tabId: number;
  url: string;
  title: string;
  domain: string;
  closedAt: number;
  lastAccessed: number | null;
  reason: TabCloseReason;
}

const SETTINGS_KEY = 'tabOrganizerSettingsV1';
const CLOSED_LOG_KEY = 'tabOrganizerClosedLogV1';
const CLOSED_LOG_LIMIT = 500;
export const TAB_ORGANIZER_ALARM = 'besthistory:tab-organizer-auto';
export const DEFAULT_TAB_ORGANIZER_SETTINGS: TabOrganizerSettings = {
  autoCloseDays: 0,
  protectPinned: true,
  protectAudible: true,
  whitelistDomains: [],
};

function normalizeDomain(value: string): string {
  return value.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/.*$/, '').toLowerCase();
}

export function normalizeWhitelistDomains(values: string[]): string[] {
  return [...new Set(values.map(normalizeDomain).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export function getTabDomain(url: string): { domain: string; groupLabel: string } {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./i, '').toLowerCase();
    if (parsed.protocol === 'chrome-extension:' && hostname === browser.runtime.id) {
      return { domain: 'besthistory', groupLabel: 'BestHistory' };
    }
    if (hostname) {
      if (parsed.protocol === 'chrome:') return { domain: `chrome://${hostname}`, groupLabel: `chrome://${hostname}` };
      return { domain: hostname, groupLabel: hostname };
    }
    const scheme = parsed.protocol.replace(':', '') || 'other';
    return { domain: `${scheme}://`, groupLabel: `${scheme}://` };
  } catch {
    return { domain: 'other', groupLabel: 'Other' };
  }
}

export function isDomainAutoProtected(domain: string, whitelist: string[]): boolean {
  const normalized = domain.replace(/^chrome:\/\//, '').replace(/^www\./i, '').toLowerCase();
  return whitelist.some((item) => normalized === item || normalized.endsWith(`.${item}`));
}

function isBestHistoryUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'chrome-extension:' && parsed.hostname === browser.runtime.id;
  } catch {
    return false;
  }
}

/** Manual/bulk cleanup stays conservative regardless of automatic-cleanup preferences. */
export function isTabProtected(tab: ManagedTab): boolean {
  return tab.active || tab.pinned || tab.audible || tab.protectedReasons.includes('besthistory');
}

export function isTabAutoProtected(tab: ManagedTab, settings: TabOrganizerSettings): boolean {
  if (tab.active || tab.protectedReasons.includes('besthistory')) return true;
  if (settings.protectPinned && tab.pinned) return true;
  if (settings.protectAudible && tab.audible) return true;
  return false;
}

export function tabIsStale(tab: ManagedTab, days: number, now = Date.now()): boolean {
  if (!days || !tab.lastAccessed) return false;
  return now - tab.lastAccessed >= days * 24 * 60 * 60 * 1000;
}

export async function readOpenTabs(): Promise<ManagedTab[]> {
  const rawTabs = await browser.tabs.query({});
  return rawTabs
    .filter((tab): tab is typeof tab & { id: number; url: string } => Boolean(tab.id !== undefined && tab.url && !tab.incognito))
    .map((tab) => {
      const raw = tab as typeof tab & { lastAccessed?: number };
      const { domain, groupLabel } = getTabDomain(tab.url);
      const protectedReasons: ManagedTab['protectedReasons'] = [];
      if (tab.active) protectedReasons.push('active');
      if (tab.pinned) protectedReasons.push('pinned');
      if (tab.audible) protectedReasons.push('audible');
      if (isBestHistoryUrl(tab.url)) protectedReasons.push('besthistory');
      return {
        id: tab.id,
        windowId: tab.windowId,
        index: tab.index,
        title: tab.title || tab.url,
        url: tab.url,
        domain,
        groupLabel,
        favIconUrl: tab.favIconUrl || '',
        active: Boolean(tab.active),
        pinned: Boolean(tab.pinned),
        audible: Boolean(tab.audible),
        discarded: Boolean(tab.discarded),
        incognito: Boolean(tab.incognito),
        lastAccessed: typeof raw.lastAccessed === 'number' && raw.lastAccessed > 0 ? raw.lastAccessed : null,
        protectedReasons,
      } satisfies ManagedTab;
    });
}

export async function readTabOrganizerSettings(): Promise<TabOrganizerSettings> {
  const result = await browser.storage.local.get(SETTINGS_KEY);
  const raw = result[SETTINGS_KEY] as Partial<TabOrganizerSettings> | undefined;
  const autoCloseDays = raw?.autoCloseDays === 1 || raw?.autoCloseDays === 3 || raw?.autoCloseDays === 7 ? raw.autoCloseDays : 0;
  return {
    autoCloseDays,
    protectPinned: raw?.protectPinned !== false,
    protectAudible: raw?.protectAudible !== false,
    whitelistDomains: normalizeWhitelistDomains(Array.isArray(raw?.whitelistDomains) ? raw!.whitelistDomains! : []),
  };
}

export async function saveTabOrganizerSettings(settings: TabOrganizerSettings): Promise<TabOrganizerSettings> {
  const normalized: TabOrganizerSettings = {
    autoCloseDays: settings.autoCloseDays === 1 || settings.autoCloseDays === 3 || settings.autoCloseDays === 7 ? settings.autoCloseDays : 0,
    protectPinned: Boolean(settings.protectPinned),
    protectAudible: Boolean(settings.protectAudible),
    whitelistDomains: normalizeWhitelistDomains(settings.whitelistDomains),
  };
  await browser.storage.local.set({ [SETTINGS_KEY]: normalized });
  return normalized;
}

export async function readRecentlyClosedTabs(limit = 20): Promise<ClosedTabRecord[]> {
  const result = await browser.storage.local.get(CLOSED_LOG_KEY);
  const rows = Array.isArray(result[CLOSED_LOG_KEY]) ? result[CLOSED_LOG_KEY] as ClosedTabRecord[] : [];
  return rows.slice(0, Math.max(0, limit));
}

async function recordTabsBeforeClose(tabs: ManagedTab[], reason: TabCloseReason): Promise<void> {
  if (!tabs.length) return;
  const closedAt = Date.now();
  const result = await browser.storage.local.get(CLOSED_LOG_KEY);
  const existing = Array.isArray(result[CLOSED_LOG_KEY]) ? result[CLOSED_LOG_KEY] as ClosedTabRecord[] : [];
  const incoming: ClosedTabRecord[] = tabs.map((tab) => ({
    id: `${closedAt}:${tab.id}:${tab.url}`,
    tabId: tab.id,
    url: tab.url,
    title: tab.title,
    domain: tab.domain,
    closedAt,
    lastAccessed: tab.lastAccessed,
    reason,
  }));
  await browser.storage.local.set({ [CLOSED_LOG_KEY]: [...incoming, ...existing].slice(0, CLOSED_LOG_LIMIT) });

  const historyRecords: HistoryRecord[] = tabs.map((tab) => ({
    id: `tab-organizer:${tab.id}:${closedAt}`,
    url: tab.url,
    title: tab.title,
    lastVisitTime: tab.lastAccessed || closedAt,
    visitCount: 1,
  }));
  await localDatabase.mergeImportedHistory(historyRecords).catch(() => undefined);
}

export async function closeManagedTabs(tabIds: number[], reason: TabCloseReason = 'manual'): Promise<number> {
  const unique = [...new Set(tabIds.filter((value) => Number.isInteger(value) && value >= 0))];
  if (!unique.length) return 0;
  const [current, settings] = await Promise.all([readOpenTabs(), readTabOrganizerSettings()]);
  const selected = current.filter((tab) => {
    if (!unique.includes(tab.id)) return false;
    return reason === 'auto' ? !isTabAutoProtected(tab, settings) : !isTabProtected(tab);
  });
  if (!selected.length) return 0;
  await recordTabsBeforeClose(selected, reason);
  await browser.tabs.remove(selected.map((tab) => tab.id));
  return selected.length;
}

export function findDuplicateTabs(tabs: ManagedTab[]): Map<string, ManagedTab[]> {
  const groups = new Map<string, ManagedTab[]>();
  for (const tab of tabs) {
    const key = tab.url;
    const current = groups.get(key) || [];
    current.push(tab);
    groups.set(key, current);
  }
  return new Map([...groups.entries()].filter(([, items]) => items.length > 1));
}

/** Exact-URL duplicate cleanup keeps the best candidate and never closes manual-protected tabs. */
export function duplicateTabsToClose(tabs: ManagedTab[]): ManagedTab[] {
  const close: ManagedTab[] = [];
  for (const items of findDuplicateTabs(tabs).values()) {
    const ordered = [...items].sort((a, b) => {
      const aScore = a.active ? 4 : a.pinned ? 3 : a.audible ? 2 : 0;
      const bScore = b.active ? 4 : b.pinned ? 3 : b.audible ? 2 : 0;
      if (aScore !== bScore) return bScore - aScore;
      return (b.lastAccessed || 0) - (a.lastAccessed || 0);
    });
    if (!ordered[0]) continue;
    close.push(...ordered.slice(1).filter((tab) => !isTabProtected(tab)));
  }
  return close;
}

export async function reopenClosedTab(record: ClosedTabRecord): Promise<void> {
  await browser.tabs.create({ url: record.url, active: true });
}

export async function runAutoOrganizer(): Promise<number> {
  const settings = await readTabOrganizerSettings();
  if (!settings.autoCloseDays) return 0;
  const now = Date.now();
  const tabs = await readOpenTabs();
  const candidates = tabs.filter((tab) => {
    if (isTabAutoProtected(tab, settings)) return false;
    if (isDomainAutoProtected(tab.domain, settings.whitelistDomains)) return false;
    return tabIsStale(tab, settings.autoCloseDays, now);
  });
  if (!candidates.length) return 0;
  return closeManagedTabs(candidates.map((tab) => tab.id), 'auto');
}

export async function ensureTabOrganizerAlarm(): Promise<void> {
  const existing = await browser.alarms.get(TAB_ORGANIZER_ALARM);
  if (existing) return;
  await browser.alarms.create(TAB_ORGANIZER_ALARM, { delayInMinutes: 30, periodInMinutes: 30 });
}
