import { browser } from 'wxt/browser';
import { getDomain, type HistoryRecord } from '@/src/domain/history';
import { normalizeSiteTags, type SiteProfile, type SiteProfileMap } from '@/src/domain/site-profile';
import { supportedLocales, type Locale } from '@/src/i18n/messages';
import { localDatabase, type ArchivedHistoryRecord, type ArchiveSyncResult, type ArchiveSyncState, type PrivateFingerprints } from '@/src/storage/local-database';
import { changeVaultPassword, createVaultKeyBundle, decryptVaultRecord, encryptVaultRecord, stableRecordId, unlockVault } from '@/src/vault/crypto';
import type { VaultAutoLockSeconds, VaultKeyBundle, VaultSession } from '@/src/vault/types';
import { BESTHISTORY_BACKUP_FORMAT, BESTHISTORY_BACKUP_VERSION, type BackupRestoreResult, type BestHistoryBackupFile } from '@/src/backup/types';

function normalizeProfiles(profiles: SiteProfileMap): SiteProfileMap {
  return Object.fromEntries(Object.entries(profiles).map(([domain, profile]) => [domain, {
    ...profile,
    domain,
    tags: normalizeSiteTags(profile.tags || []),
    hidden: Boolean(profile.hidden),
  }])) as SiteProfileMap;
}

function mergeHistoryRecords(records: HistoryRecord[]): HistoryRecord[] {
  const merged = new Map<string, HistoryRecord>();
  for (const record of records) {
    if (!record.url || !getDomain(record.url)) continue;
    const previous = merged.get(record.url);
    if (!previous) {
      merged.set(record.url, { ...record });
      continue;
    }
    merged.set(record.url, {
      id: previous.id || record.id || record.url,
      url: record.url,
      title: record.lastVisitTime >= previous.lastVisitTime && record.title ? record.title : previous.title,
      lastVisitTime: Math.max(previous.lastVisitTime, record.lastVisitTime),
      visitCount: Math.max(previous.visitCount, record.visitCount),
    });
  }
  return [...merged.values()].sort((a, b) => b.lastVisitTime - a.lastVisitTime);
}

function mergeProfileMaps(local: SiteProfileMap, incoming: SiteProfileMap): { profiles: SiteProfileMap; importedCount: number; mergedCount: number } {
  const next: SiteProfileMap = { ...local };
  let importedCount = 0;
  let mergedCount = 0;
  for (const [domain, rawIncoming] of Object.entries(normalizeProfiles(incoming))) {
    const current = next[domain];
    if (!current) {
      next[domain] = rawIncoming;
      importedCount += 1;
      continue;
    }
    const incomingIsNewer = (rawIncoming.updatedAt || 0) > (current.updatedAt || 0);
    next[domain] = {
      domain,
      customName: incomingIsNewer ? rawIncoming.customName : current.customName,
      note: incomingIsNewer ? rawIncoming.note : current.note,
      tags: normalizeSiteTags([...current.tags, ...rawIncoming.tags]),
      pinned: incomingIsNewer ? rawIncoming.pinned : current.pinned,
      hidden: incomingIsNewer ? rawIncoming.hidden : current.hidden,
      updatedAt: Math.max(current.updatedAt || 0, rawIncoming.updatedAt || 0),
    };
    mergedCount += 1;
  }
  return { profiles: next, importedCount, mergedCount };
}

function sameVaultKey(left: VaultKeyBundle, right: VaultKeyBundle): boolean {
  return left.publicKey.kty === right.publicKey.kty
    && left.publicKey.n === right.publicKey.n
    && left.publicKey.e === right.publicKey.e;
}

let migrationPromise: Promise<void> | null = null;
function ensureLocalDatabaseMigration(): Promise<void> {
  if (migrationPromise) return migrationPromise;
  migrationPromise = (async () => {
    const result = await browser.storage.local.get(['siteProfiles', 'locale']);
    const profiles = normalizeProfiles((result.siteProfiles || {}) as SiteProfileMap);
    const locale = typeof result.locale === 'string' ? result.locale : null;
    await localDatabase.migrateLegacy(profiles, locale);
    await localDatabase.migratePrivateModel();
  })().catch((error) => {
    migrationPromise = null;
    throw error;
  });
  return migrationPromise;
}

export interface BrowserAdapter {
  readRecentHistory(maxResults?: number): Promise<HistoryRecord[]>;
  getFaviconUrl(pageUrl: string, size?: number): string;
  readSiteProfiles(): Promise<SiteProfileMap>;
  saveSiteProfile(profile: SiteProfile): Promise<SiteProfileMap>;
  saveSiteProfiles(profiles: SiteProfileMap): Promise<SiteProfileMap>;
  readLocale(): Promise<Locale | null>;
  saveLocale(locale: Locale): Promise<void>;
  readArchiveEnabled(): Promise<boolean>;
  saveArchiveEnabled(enabled: boolean): Promise<void>;
  syncCurrentHistoryToArchive(maxResults?: number): Promise<ArchiveSyncResult>;
  readArchivedHistory(offset?: number, limit?: number): Promise<ArchivedHistoryRecord[]>;
  readArchiveSyncState(): Promise<ArchiveSyncState>;
  countArchivedHistory(): Promise<number>;
  archiveIncognitoVisit(record: HistoryRecord): Promise<void>;
  readVaultStatus(): Promise<{ configured: boolean; unlocked: boolean; autoLockSeconds: VaultAutoLockSeconds }>;
  setupVault(password: string): Promise<void>;
  unlockVault(password: string): Promise<void>;
  lockVault(): void;
  destroyVault(): Promise<void>;
  changeVaultPassword(currentPassword: string, nextPassword: string): Promise<void>;
  readPrivateHistory(): Promise<ArchivedHistoryRecord[]>;
  addPrivateDomain(domain: string, records: HistoryRecord[]): Promise<void>;
  addPrivatePage(record: HistoryRecord): Promise<void>;
  deletePrivateDomain(domain: string): Promise<void>;
  deletePrivatePage(url: string): Promise<void>;
  readPrivateFingerprints(): Promise<PrivateFingerprints>;
  readIncognitoCaptureEnabled(): Promise<boolean>;
  saveIncognitoCaptureEnabled(enabled: boolean): Promise<void>;
  isAllowedIncognitoAccess(): Promise<boolean>;
  openExtensionDetails(): Promise<void>;
  archiveNavigationVisit(record: HistoryRecord, incognito: boolean): Promise<void>;
  openPrivateUrl(url: string): Promise<void>;
  saveVaultAutoLock(seconds: VaultAutoLockSeconds): Promise<void>;
  deleteHistoryUrls(urls: string[]): Promise<void>;
  deleteWebsites(domains: string[]): Promise<SiteProfileMap>;
  previewHistoryDeletion(urls: string[]): Promise<HistoryDeletionImpact>;
  createBackup(): Promise<BestHistoryBackupFile>;
  restoreBackup(backup: BestHistoryBackupFile, privatePassword?: string): Promise<BackupRestoreResult>;
  getFeedbackEnvironment(): { appVersion: string; browser: string; os: string };
  openApp(): Promise<void>;
}

let vaultSession: VaultSession | null = null;

function domainCandidates(domain: string): string[] {
  const parts = domain.split('.').filter(Boolean);
  return parts.map((_, index) => parts.slice(index).join('.')).filter((value) => value.includes('.'));
}

async function privateMatch(record: HistoryRecord, fingerprints: PrivateFingerprints): Promise<boolean> {
  if (fingerprints.urls.includes(await stableRecordId(record.url))) return true;
  const domain = getDomain(record.url);
  if (!domain) return false;
  const candidates = await Promise.all(domainCandidates(domain).map(stableRecordId));
  return candidates.some((candidate) => fingerprints.domains.includes(candidate));
}

export interface HistoryDeletionImpact {
  urlCount: number;
  siteCount: number;
  visitCount: number;
  firstVisitTime: number | null;
  lastVisitTime: number | null;
}

function detectFeedbackBrowser(userAgent: string): string {
  const candidates: Array<[RegExp, string]> = [
    [/Edg\/([\d.]+)/, 'Edge'],
    [/OPR\/([\d.]+)/, 'Opera'],
    [/Firefox\/([\d.]+)/, 'Firefox'],
    [/Chrome\/([\d.]+)/, 'Chrome'],
    [/Version\/([\d.]+).*Safari\//, 'Safari'],
  ];
  for (const [pattern, name] of candidates) {
    const match = userAgent.match(pattern);
    if (match?.[1]) return `${name} ${match[1]}`;
  }
  return 'Unknown browser';
}

function detectFeedbackOs(userAgent: string): string {
  const mac = userAgent.match(/Mac OS X ([\d_]+)/);
  if (mac?.[1]) return `macOS ${mac[1].replace(/_/g, '.')}`;
  const windows = userAgent.match(/Windows NT ([\d.]+)/);
  if (windows?.[1]) return `Windows NT ${windows[1]}`;
  const android = userAgent.match(/Android ([^;\)]+)/);
  if (android?.[1]) return `Android ${android[1]}`;
  if (/Linux/i.test(userAgent)) return 'Linux';
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'iOS/iPadOS';
  return navigator.platform || 'Unknown OS';
}

export const browserAdapter: BrowserAdapter = {
  async readRecentHistory(maxResults = 5000) {
    const items = await browser.history.search({
      text: '',
      startTime: 0,
      maxResults,
    });

    const browserRecords = items
      .filter((item): item is typeof item & { id: string; url: string } =>
        Boolean(item.id && item.url),
      )
      .map((item) => ({
        id: item.id,
        url: item.url,
        title: item.title || '',
        lastVisitTime: item.lastVisitTime || 0,
        visitCount: item.visitCount || 1,
      }));
    await ensureLocalDatabaseMigration();
    const [importedRecords, fingerprints] = await Promise.all([
      localDatabase.readImportedHistory(),
      localDatabase.readPrivateFingerprints(),
    ]);
    const records = mergeHistoryRecords([...browserRecords, ...importedRecords]).slice(0, Math.max(0, maxResults));
    if (!fingerprints.domains.length && !fingerprints.urls.length) return records;
    const matches = await Promise.all(records.map((record) => privateMatch(record, fingerprints)));
    return records.filter((_, index) => !matches[index]);
  },

  getFaviconUrl(pageUrl, size = 32) {
    const getUrl = browser.runtime.getURL as (path: string) => string;
    return getUrl(
      `/_favicon/?pageUrl=${encodeURIComponent(pageUrl)}&size=${size}`,
    );
  },

  async readSiteProfiles() {
    try {
      await ensureLocalDatabaseMigration();
      return normalizeProfiles(await localDatabase.readSiteProfiles());
    } catch {
      const result = await browser.storage.local.get('siteProfiles');
      return normalizeProfiles((result.siteProfiles || {}) as SiteProfileMap);
    }
  },

  async saveSiteProfile(profile) {
    const profiles = await this.readSiteProfiles();
    const normalizedProfile = normalizeProfiles({ [profile.domain]: profile })[profile.domain]!;
    const next = { ...profiles, [profile.domain]: normalizedProfile };
    try {
      await ensureLocalDatabaseMigration();
      await localDatabase.saveSiteProfile(normalizedProfile);
    } catch { /* browser storage remains the compatibility fallback */ }
    await browser.storage.local.set({ siteProfiles: next });
    return next;
  },

  async saveSiteProfiles(profiles) {
    const normalized = normalizeProfiles(profiles);
    try {
      await ensureLocalDatabaseMigration();
      await localDatabase.replaceSiteProfiles(normalized);
    } catch { /* browser storage remains the compatibility fallback */ }
    await browser.storage.local.set({ siteProfiles: normalized });
    return normalized;
  },

  async readLocale() {
    try {
      await ensureLocalDatabaseMigration();
      return await localDatabase.readSetting<Locale>('locale');
    } catch {
      const result = await browser.storage.local.get('locale');
      return typeof result.locale === 'string' ? result.locale as Locale : null;
    }
  },

  async saveLocale(locale) {
    try {
      await ensureLocalDatabaseMigration();
      await localDatabase.saveSetting('locale', locale);
    } catch { /* browser storage remains the compatibility fallback */ }
    await browser.storage.local.set({ locale });
  },

  async readArchiveEnabled() {
    await ensureLocalDatabaseMigration();
    return Boolean(await localDatabase.readSetting<boolean>('archiveEnabled'));
  },

  async saveArchiveEnabled(enabled) {
    await ensureLocalDatabaseMigration();
    await localDatabase.saveSetting('archiveEnabled', enabled);
  },

  async syncCurrentHistoryToArchive(maxResults = 5000) {
    await ensureLocalDatabaseMigration();
    const bundle = await localDatabase.readVaultBundle();
    if (!bundle) throw new Error('Vault password has not been set');
    return localDatabase.syncEncryptedHistoryRecords(await this.readRecentHistory(maxResults), bundle);
  },

  async readArchivedHistory(offset = 0, limit = 100) {
    await ensureLocalDatabaseMigration();
    if (!vaultSession) throw new Error('Vault is locked');
    return localDatabase.readEncryptedHistory(vaultSession, offset, limit);
  },

  async readArchiveSyncState() {
    await ensureLocalDatabaseMigration();
    return localDatabase.readArchiveSyncState();
  },

  async countArchivedHistory() {
    await ensureLocalDatabaseMigration();
    return localDatabase.countArchivedHistory();
  },

  async archiveIncognitoVisit(record) {
    await ensureLocalDatabaseMigration();
    const bundle = await localDatabase.readVaultBundle();
    if (!bundle) return;
    await localDatabase.syncEncryptedHistoryRecords([record], bundle);
  },

  async readVaultStatus() {
    await ensureLocalDatabaseMigration();
    const bundle = await localDatabase.readVaultBundle();
    const autoLockSeconds = await localDatabase.readSetting<VaultAutoLockSeconds>('vaultAutoLockSeconds') || 30;
    return { configured: Boolean(bundle), unlocked: Boolean(bundle && vaultSession), autoLockSeconds };
  },

  async setupVault(password) {
    await ensureLocalDatabaseMigration();
    if (await localDatabase.readVaultBundle()) throw new Error('Vault is already configured');
    const { bundle, session } = await createVaultKeyBundle(password);
    await localDatabase.initializeVault(bundle, true);
    vaultSession = session;
  },

  async unlockVault(password) {
    await ensureLocalDatabaseMigration();
    const bundle = await localDatabase.readVaultBundle();
    if (!bundle) throw new Error('Vault is not configured');
    vaultSession = await unlockVault(bundle, password);
  },

  lockVault() {
    vaultSession = null;
  },

  async destroyVault() {
    await ensureLocalDatabaseMigration();
    vaultSession = null;
    await localDatabase.destroyVault();
  },

  async changeVaultPassword(currentPassword, nextPassword) {
    await ensureLocalDatabaseMigration();
    const bundle = await localDatabase.readVaultBundle();
    if (!bundle) throw new Error('Vault is not configured');
    const changed = await changeVaultPassword(bundle, currentPassword, nextPassword);
    await localDatabase.saveVaultBundle(changed.bundle);
    vaultSession = changed.session;
  },

  async readPrivateHistory() {
    await ensureLocalDatabaseMigration();
    if (!vaultSession) throw new Error('Vault is locked');
    return localDatabase.readAllPrivateHistory(vaultSession);
  },

  async addPrivateDomain(domain, records) {
    await ensureLocalDatabaseMigration();
    const bundle = await localDatabase.readVaultBundle();
    if (!bundle || !vaultSession) throw new Error('Vault is locked');
    const normalized = domain.replace(/^www\./i, '').toLowerCase();
    const fingerprints = await localDatabase.readPrivateFingerprints();
    const domainHash = await stableRecordId(normalized);
    await localDatabase.savePrivateFingerprints({
      ...fingerprints,
      domains: [...new Set([...fingerprints.domains, domainHash])],
    });
    const matching = records.filter((record) => {
      const current = (getDomain(record.url) || '').replace(/^www\./i, '').toLowerCase();
      return current === normalized || current.endsWith(`.${normalized}`);
    });
    await localDatabase.upsertPrivateHistoryRecords(matching, bundle, 'manual-site');
  },

  async addPrivatePage(record) {
    await ensureLocalDatabaseMigration();
    const bundle = await localDatabase.readVaultBundle();
    if (!bundle || !vaultSession) throw new Error('Vault is locked');
    const fingerprints = await localDatabase.readPrivateFingerprints();
    const urlHash = await stableRecordId(record.url);
    await localDatabase.savePrivateFingerprints({
      ...fingerprints,
      urls: [...new Set([...fingerprints.urls, urlHash])],
    });
    await localDatabase.upsertPrivateHistoryRecords([record], bundle, 'manual-page');
  },

  async deletePrivateDomain(domain) {
    await ensureLocalDatabaseMigration();
    if (!vaultSession) throw new Error('Vault is locked');
    const normalized = domain.replace(/^www\./i, '').toLowerCase();
    const records = await localDatabase.readAllPrivateHistory(vaultSession);
    const matching = records.filter((record) => {
      const current = (getDomain(record.url) || '').replace(/^www\./i, '').toLowerCase();
      return current === normalized || current.endsWith(`.${normalized}`);
    });
    await localDatabase.deletePrivateHistoryByUrls(matching.map((record) => record.url));
    const fingerprints = await localDatabase.readPrivateFingerprints();
    const domainHash = await stableRecordId(normalized);
    const urlHashes = new Set(await Promise.all(matching.map((record) => stableRecordId(record.url))));
    await localDatabase.savePrivateFingerprints({
      domains: fingerprints.domains.filter((value) => value !== domainHash),
      urls: fingerprints.urls.filter((value) => !urlHashes.has(value)),
    });
    await this.deleteHistoryUrls(matching.map((record) => record.url));
  },

  async deletePrivatePage(url) {
    await ensureLocalDatabaseMigration();
    if (!vaultSession) throw new Error('Vault is locked');
    await localDatabase.deletePrivateHistoryByUrls([url]);
    const fingerprints = await localDatabase.readPrivateFingerprints();
    const urlHash = await stableRecordId(url);
    await localDatabase.savePrivateFingerprints({
      ...fingerprints,
      urls: fingerprints.urls.filter((value) => value !== urlHash),
    });
    await browser.history.deleteUrl({ url });
  },

  async readPrivateFingerprints() {
    await ensureLocalDatabaseMigration();
    return localDatabase.readPrivateFingerprints();
  },

  async readIncognitoCaptureEnabled() {
    await ensureLocalDatabaseMigration();
    return (await localDatabase.readSetting<boolean>('incognitoCaptureEnabled')) !== false;
  },

  async saveIncognitoCaptureEnabled(enabled) {
    await ensureLocalDatabaseMigration();
    await localDatabase.saveSetting('incognitoCaptureEnabled', enabled);
  },

  async isAllowedIncognitoAccess() {
    const extensionApi = (browser as typeof browser & {
      extension?: { isAllowedIncognitoAccess?: () => Promise<boolean> };
    }).extension;
    if (!extensionApi?.isAllowedIncognitoAccess) return false;
    return extensionApi.isAllowedIncognitoAccess();
  },

  async openExtensionDetails() {
    await browser.tabs.create({ url: `chrome://extensions/?id=${browser.runtime.id}` });
  },

  async archiveNavigationVisit(record, incognito) {
    await ensureLocalDatabaseMigration();
    const bundle = await localDatabase.readVaultBundle();
    if (!bundle) return;
    if (incognito) {
      if (await this.readIncognitoCaptureEnabled()) {
        await localDatabase.upsertPrivateHistoryRecords([record], bundle, 'incognito');
      }
      return;
    }
    const fingerprints = await localDatabase.readPrivateFingerprints();
    if (await privateMatch(record, fingerprints)) {
      await localDatabase.upsertPrivateHistoryRecords([record], bundle, 'private-site-visit');
    }
  },

  async openPrivateUrl(url) {
    await browser.windows.create({ url, incognito: true });
  },

  async saveVaultAutoLock(seconds) {
    await ensureLocalDatabaseMigration();
    await localDatabase.saveSetting('vaultAutoLockSeconds', seconds);
  },

  async deleteHistoryUrls(urls) {
    const uniqueUrls = [...new Set(urls)];
    await ensureLocalDatabaseMigration();
    await Promise.all([
      Promise.all(uniqueUrls.map((url) => browser.history.deleteUrl({ url }))),
      localDatabase.deleteImportedHistoryByUrls(uniqueUrls),
    ]);
  },

  async deleteWebsites(domains) {
    const uniqueDomains = [...new Set(domains.map((domain) => domain.replace(/^www\./i, '').toLowerCase()).filter(Boolean))];
    const removed = new Set(uniqueDomains);
    await ensureLocalDatabaseMigration();
    const [browserItems, importedRecords] = await Promise.all([
      browser.history.search({ text: '', startTime: 0, maxResults: 100_000 }),
      localDatabase.readImportedHistory(),
    ]);
    const urls = [
      ...browserItems.map((item) => item.url || ''),
      ...importedRecords.map((record) => record.url),
    ].filter((url) => {
      const domain = getDomain(url);
      return Boolean(domain && removed.has(domain));
    });
    if (urls.length) await this.deleteHistoryUrls(urls);

    const currentProfiles = await this.readSiteProfiles();
    const nextProfiles = Object.fromEntries(
      Object.entries(currentProfiles).filter(([domain]) => !removed.has(domain.replace(/^www\./i, '').toLowerCase())),
    ) as SiteProfileMap;
    try {
      await localDatabase.deleteSiteProfiles(uniqueDomains);
    } catch { /* browser storage remains the compatibility fallback */ }
    await browser.storage.local.set({ siteProfiles: nextProfiles });
    return nextProfiles;
  },

  async previewHistoryDeletion(urls) {
    const uniqueUrls = [...new Set(urls)];
    const visits = (await Promise.all(uniqueUrls.map((url) => browser.history.getVisits({ url })))).flat();
    const visitTimes = visits.map((visit) => visit.visitTime).filter((time): time is number => typeof time === 'number');
    const sites = new Set(uniqueUrls.map((url) => {
      try { return new URL(url).hostname.replace(/^www\./i, ''); } catch { return ''; }
    }).filter(Boolean));
    return {
      urlCount: uniqueUrls.length,
      siteCount: sites.size,
      visitCount: visits.length,
      firstVisitTime: visitTimes.length ? Math.min(...visitTimes) : null,
      lastVisitTime: visitTimes.length ? Math.max(...visitTimes) : null,
    };
  },

  async createBackup() {
    await ensureLocalDatabaseMigration();
    const [history, siteProfiles, locale, keyBundle, fingerprints, autoLockSeconds, incognitoCaptureEnabled, encryptedHistory] = await Promise.all([
      this.readRecentHistory(100_000),
      this.readSiteProfiles(),
      this.readLocale(),
      localDatabase.readVaultBundle(),
      localDatabase.readPrivateFingerprints(),
      localDatabase.readSetting<VaultAutoLockSeconds>('vaultAutoLockSeconds'),
      localDatabase.readSetting<boolean>('incognitoCaptureEnabled'),
      localDatabase.readEncryptedHistoryEnvelopes(),
    ]);
    const backup: BestHistoryBackupFile = {
      format: BESTHISTORY_BACKUP_FORMAT,
      version: BESTHISTORY_BACKUP_VERSION,
      appVersion: browser.runtime.getManifest().version,
      createdAt: Date.now(),
      publicData: {
        history,
        siteProfiles,
        settings: { locale },
      },
    };
    if (keyBundle) {
      backup.privateData = {
        keyBundle,
        fingerprints,
        settings: {
          autoLockSeconds: autoLockSeconds || 30,
          incognitoCaptureEnabled: incognitoCaptureEnabled !== false,
        },
        encryptedHistory,
      };
    }
    return backup;
  },

  async restoreBackup(backup, privatePassword) {
    await ensureLocalDatabaseMigration();
    const privateData = backup.privateData;
    let backupSession: VaultSession | null = null;
    let currentBundle: VaultKeyBundle | null = null;

    // Validate all private prerequisites before writing public data so a wrong
    // password or a locked conflicting vault never causes a partial restore.
    if (privateData && privatePassword) {
      try {
        backupSession = await unlockVault(privateData.keyBundle, privatePassword);
      } catch {
        throw new Error('BACKUP_PRIVATE_PASSWORD_INVALID');
      }
      currentBundle = await localDatabase.readVaultBundle();
      if (currentBundle && !sameVaultKey(currentBundle, privateData.keyBundle) && !vaultSession) {
        throw new Error('CURRENT_VAULT_UNLOCK_REQUIRED');
      }
    }

    const historyResult = await localDatabase.mergeImportedHistory(backup.publicData.history);
    const localProfiles = await this.readSiteProfiles();
    const profileResult = mergeProfileMaps(localProfiles, backup.publicData.siteProfiles);
    await localDatabase.replaceSiteProfiles(profileResult.profiles);
    await browser.storage.local.set({ siteProfiles: profileResult.profiles });

    const incomingLocale = backup.publicData.settings.locale;
    if (incomingLocale && supportedLocales.some((item) => item.id === incomingLocale)) await this.saveLocale(incomingLocale);

    let privateRecordsImported = 0;
    let privateRecordsUpdated = 0;
    let privateSkipped = false;
    if (privateData) {
      if (!privatePassword || !backupSession) {
        privateSkipped = true;
      } else {
        currentBundle = currentBundle || await localDatabase.readVaultBundle();
        if (!currentBundle) {
          const privateResult = await localDatabase.restoreVaultFromBackup(
            privateData.keyBundle,
            privateData.fingerprints,
            privateData.settings.autoLockSeconds || 30,
            privateData.settings.incognitoCaptureEnabled !== false,
            privateData.encryptedHistory,
          );
          vaultSession = null;
          privateRecordsImported = privateResult.insertedCount;
          privateRecordsUpdated = privateResult.updatedCount;
        } else if (sameVaultKey(currentBundle, privateData.keyBundle)) {
          const currentFingerprints = await localDatabase.readPrivateFingerprints();
          await localDatabase.savePrivateFingerprints({
            domains: [...new Set([...currentFingerprints.domains, ...privateData.fingerprints.domains])],
            urls: [...new Set([...currentFingerprints.urls, ...privateData.fingerprints.urls])],
          });
          const privateResult = await localDatabase.mergeEncryptedHistoryEnvelopes(privateData.encryptedHistory);
          privateRecordsImported = privateResult.insertedCount;
          privateRecordsUpdated = privateResult.updatedCount;
        } else {
          // The preflight above guarantees the current vault is unlocked here.
          const [incomingRecords, currentRecords, currentFingerprints] = await Promise.all([
            Promise.all(privateData.encryptedHistory.map((envelope) => decryptVaultRecord(backupSession!, envelope))),
            localDatabase.readAllPrivateHistory(vaultSession!),
            localDatabase.readPrivateFingerprints(),
          ]);
          const currentByUrl = new Map(currentRecords.map((record) => [record.url, record]));
          const accepted = incomingRecords.filter((record) => {
            const current = currentByUrl.get(record.url);
            if (!current) {
              privateRecordsImported += 1;
              return true;
            }
            const shouldUpdate = record.lastVisitTime > current.lastVisitTime || record.visitCount > current.visitCount;
            if (shouldUpdate) privateRecordsUpdated += 1;
            return shouldUpdate;
          });
          const reEncrypted = await Promise.all(accepted.map((record) => encryptVaultRecord(currentBundle!.publicKey, record)));
          await localDatabase.mergeEncryptedHistoryEnvelopes(reEncrypted);
          await localDatabase.savePrivateFingerprints({
            domains: [...new Set([...currentFingerprints.domains, ...privateData.fingerprints.domains])],
            urls: [...new Set([...currentFingerprints.urls, ...privateData.fingerprints.urls])],
          });
        }
      }
    }

    return {
      publicHistoryImported: historyResult.insertedCount,
      publicHistoryUpdated: historyResult.updatedCount,
      siteProfilesImported: profileResult.importedCount,
      siteProfilesMerged: profileResult.mergedCount,
      privateRecordsImported,
      privateRecordsUpdated,
      privateSkipped,
    };
  },

  getFeedbackEnvironment() {
    const userAgent = navigator.userAgent || '';
    return {
      appVersion: browser.runtime.getManifest().version,
      browser: detectFeedbackBrowser(userAgent),
      os: detectFeedbackOs(userAgent),
    };
  },

  async openApp() {
    await browser.runtime.sendMessage({ type: 'besthistory:open-app' });
  },
};
