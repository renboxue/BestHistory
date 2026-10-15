import type { SiteProfile, SiteProfileMap } from '@/src/domain/site-profile';
import { getDomain, type HistoryRecord } from '@/src/domain/history';
import { decryptVaultRecord, encryptVaultRecord, stableRecordId } from '@/src/vault/crypto';
import type { VaultAutoLockSeconds, VaultKeyBundle, VaultRecordEnvelope, VaultSession } from '@/src/vault/types';

export const LOCAL_DATABASE_NAME = 'besthistory-local';
export const LOCAL_DATABASE_VERSION = 4;

type SettingRow = { key: string; value: unknown; updatedAt: number };
type MetadataRow = { key: string; value: unknown; updatedAt: number };

export interface ImportedHistoryRecord extends HistoryRecord {
  importedAt: number;
}

export interface ArchivedHistoryRecord extends HistoryRecord {
  id: string;
  sourceHistoryId: string;
  domain: string;
  firstArchivedAt: number;
  archivedAt: number;
  privacySource: 'incognito' | 'manual-site' | 'manual-page' | 'private-site-visit';
}

export interface PrivateFingerprints {
  domains: string[];
  urls: string[];
}

export interface ArchiveSyncState {
  status: 'idle' | 'syncing' | 'completed' | 'failed';
  startedAt: number | null;
  completedAt: number | null;
  inputCount: number;
  insertedCount: number;
  updatedCount: number;
  unchangedCount: number;
  archiveCount: number;
  error: string | null;
}

export interface ArchiveSyncResult {
  insertedCount: number;
  updatedCount: number;
  unchangedCount: number;
  archiveCount: number;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('IndexedDB transaction failed'));
    transaction.onabort = () => reject(transaction.error || new Error('IndexedDB transaction aborted'));
  });
}

let databasePromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(LOCAL_DATABASE_NAME, LOCAL_DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains('siteProfiles')) database.createObjectStore('siteProfiles', { keyPath: 'domain' });
      if (!database.objectStoreNames.contains('settings')) database.createObjectStore('settings', { keyPath: 'key' });
      if (!database.objectStoreNames.contains('archivedHistory')) {
        const archive = database.createObjectStore('archivedHistory', { keyPath: 'id' });
        archive.createIndex('byDomain', 'domain', { unique: false });
        archive.createIndex('byLastVisitTime', 'lastVisitTime', { unique: false });
      }
      if (!database.objectStoreNames.contains('metadata')) database.createObjectStore('metadata', { keyPath: 'key' });
      if (!database.objectStoreNames.contains('encryptedHistory')) database.createObjectStore('encryptedHistory', { keyPath: 'id' });
      if (!database.objectStoreNames.contains('importedHistory')) database.createObjectStore('importedHistory', { keyPath: 'url' });
    };
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => database.close();
      resolve(database);
    };
    request.onerror = () => {
      databasePromise = null;
      reject(request.error || new Error('Could not open BestHistory local database'));
    };
    request.onblocked = () => {
      databasePromise = null;
      reject(new Error('BestHistory local database upgrade is blocked'));
    };
  });
  return databasePromise;
}

async function readRow<T>(storeName: string, key: IDBValidKey): Promise<T | null> {
  const database = await openDatabase();
  const transaction = database.transaction(storeName, 'readonly');
  const result = await requestResult(transaction.objectStore(storeName).get(key));
  await transactionComplete(transaction);
  return (result as T | undefined) || null;
}

async function saveMetadata(key: string, value: unknown): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction('metadata', 'readwrite');
  transaction.objectStore('metadata').put({ key, value, updatedAt: Date.now() } satisfies MetadataRow);
  await transactionComplete(transaction);
}

export const localDatabase = {
  async readSiteProfiles(): Promise<SiteProfileMap> {
    const database = await openDatabase();
    const transaction = database.transaction('siteProfiles', 'readonly');
    const rows = await requestResult(transaction.objectStore('siteProfiles').getAll()) as SiteProfile[];
    await transactionComplete(transaction);
    return Object.fromEntries(rows.map((profile) => [profile.domain, profile]));
  },

  async saveSiteProfile(profile: SiteProfile): Promise<void> {
    const database = await openDatabase();
    const transaction = database.transaction('siteProfiles', 'readwrite');
    transaction.objectStore('siteProfiles').put(profile);
    await transactionComplete(transaction);
  },

  async replaceSiteProfiles(profiles: SiteProfileMap): Promise<void> {
    const database = await openDatabase();
    const transaction = database.transaction('siteProfiles', 'readwrite');
    const store = transaction.objectStore('siteProfiles');
    store.clear();
    for (const profile of Object.values(profiles)) store.put(profile);
    await transactionComplete(transaction);
  },

  async deleteSiteProfiles(domains: string[]): Promise<void> {
    const database = await openDatabase();
    const transaction = database.transaction('siteProfiles', 'readwrite');
    const store = transaction.objectStore('siteProfiles');
    for (const domain of new Set(domains)) store.delete(domain);
    await transactionComplete(transaction);
  },

  async readImportedHistory(): Promise<HistoryRecord[]> {
    const database = await openDatabase();
    const transaction = database.transaction('importedHistory', 'readonly');
    const rows = await requestResult(transaction.objectStore('importedHistory').getAll()) as ImportedHistoryRecord[];
    await transactionComplete(transaction);
    return rows.map(({ importedAt: _importedAt, ...record }) => record);
  },

  async mergeImportedHistory(records: HistoryRecord[]): Promise<{ insertedCount: number; updatedCount: number }> {
    const database = await openDatabase();
    const readTransaction = database.transaction('importedHistory', 'readonly');
    const existingRows = await requestResult(readTransaction.objectStore('importedHistory').getAll()) as ImportedHistoryRecord[];
    await transactionComplete(readTransaction);
    const existing = new Map(existingRows.map((record) => [record.url, record]));
    const incoming = new Map<string, HistoryRecord>();
    for (const record of records) {
      if (!record.url || !getDomain(record.url)) continue;
      const previous = incoming.get(record.url);
      if (!previous || record.lastVisitTime >= previous.lastVisitTime) incoming.set(record.url, record);
    }
    let insertedCount = 0;
    let updatedCount = 0;
    const now = Date.now();
    const writeTransaction = database.transaction('importedHistory', 'readwrite');
    const store = writeTransaction.objectStore('importedHistory');
    for (const record of incoming.values()) {
      const previous = existing.get(record.url);
      if (!previous) {
        insertedCount += 1;
        store.put({ ...record, id: record.url, importedAt: now } satisfies ImportedHistoryRecord);
        continue;
      }
      const next: ImportedHistoryRecord = {
        ...previous,
        id: previous.id || record.url,
        title: record.lastVisitTime >= previous.lastVisitTime && record.title ? record.title : previous.title,
        lastVisitTime: Math.max(previous.lastVisitTime, record.lastVisitTime),
        visitCount: Math.max(previous.visitCount, record.visitCount),
        importedAt: now,
      };
      if (next.title !== previous.title || next.lastVisitTime !== previous.lastVisitTime || next.visitCount !== previous.visitCount) {
        updatedCount += 1;
        store.put(next);
      }
    }
    await transactionComplete(writeTransaction);
    return { insertedCount, updatedCount };
  },

  async deleteImportedHistoryByUrls(urls: string[]): Promise<void> {
    const database = await openDatabase();
    const transaction = database.transaction('importedHistory', 'readwrite');
    const store = transaction.objectStore('importedHistory');
    for (const url of new Set(urls)) store.delete(url);
    await transactionComplete(transaction);
  },

  async readSetting<T>(key: string): Promise<T | null> {
    const row = await readRow<SettingRow>('settings', key);
    return row ? row.value as T : null;
  },

  async saveSetting(key: string, value: unknown): Promise<void> {
    const database = await openDatabase();
    const transaction = database.transaction('settings', 'readwrite');
    transaction.objectStore('settings').put({ key, value, updatedAt: Date.now() } satisfies SettingRow);
    await transactionComplete(transaction);
  },

  async readArchiveSyncState(): Promise<ArchiveSyncState> {
    const row = await readRow<MetadataRow>('metadata', 'archive-sync-state');
    return row?.value as ArchiveSyncState || {
      status: 'idle', startedAt: null, completedAt: null, inputCount: 0,
      insertedCount: 0, updatedCount: 0, unchangedCount: 0, archiveCount: 0, error: null,
    };
  },

  async countArchivedHistory(): Promise<number> {
    const database = await openDatabase();
    const transaction = database.transaction(['archivedHistory', 'encryptedHistory'], 'readonly');
    const encryptedCount = await requestResult(transaction.objectStore('encryptedHistory').count());
    const legacyCount = await requestResult(transaction.objectStore('archivedHistory').count());
    await transactionComplete(transaction);
    return encryptedCount || legacyCount;
  },

  async readVaultBundle(): Promise<VaultKeyBundle | null> {
    return this.readSetting<VaultKeyBundle>('vaultKeyBundle');
  },

  async saveVaultBundle(bundle: VaultKeyBundle): Promise<void> {
    await this.saveSetting('vaultKeyBundle', bundle);
  },

  async readEncryptedHistoryEnvelopes(): Promise<VaultRecordEnvelope[]> {
    const database = await openDatabase();
    const transaction = database.transaction('encryptedHistory', 'readonly');
    const rows = await requestResult(transaction.objectStore('encryptedHistory').getAll()) as VaultRecordEnvelope[];
    await transactionComplete(transaction);
    return rows;
  },

  async mergeEncryptedHistoryEnvelopes(envelopes: VaultRecordEnvelope[]): Promise<{ insertedCount: number; updatedCount: number }> {
    const database = await openDatabase();
    const readTransaction = database.transaction('encryptedHistory', 'readonly');
    const existingRows = await requestResult(readTransaction.objectStore('encryptedHistory').getAll()) as VaultRecordEnvelope[];
    await transactionComplete(readTransaction);
    const existing = new Map(existingRows.map((row) => [row.id, row]));
    let insertedCount = 0;
    let updatedCount = 0;
    const writeTransaction = database.transaction('encryptedHistory', 'readwrite');
    const store = writeTransaction.objectStore('encryptedHistory');
    for (const envelope of envelopes) {
      const previous = existing.get(envelope.id);
      if (!previous) {
        insertedCount += 1;
        store.put(envelope);
      } else if (envelope.createdAt > previous.createdAt) {
        updatedCount += 1;
        store.put(envelope);
      }
    }
    await transactionComplete(writeTransaction);
    return { insertedCount, updatedCount };
  },

  async restoreVaultFromBackup(bundle: VaultKeyBundle, fingerprints: PrivateFingerprints, autoLockSeconds: VaultAutoLockSeconds, incognitoCaptureEnabled: boolean, envelopes: VaultRecordEnvelope[]): Promise<{ insertedCount: number; updatedCount: number }> {
    const database = await openDatabase();
    const transaction = database.transaction(['settings', 'encryptedHistory', 'archivedHistory', 'metadata'], 'readwrite');
    const settings = transaction.objectStore('settings');
    settings.put({ key: 'vaultKeyBundle', value: bundle, updatedAt: Date.now() } satisfies SettingRow);
    settings.put({ key: 'vaultAutoLockSeconds', value: autoLockSeconds, updatedAt: Date.now() } satisfies SettingRow);
    settings.put({ key: 'incognitoCaptureEnabled', value: incognitoCaptureEnabled, updatedAt: Date.now() } satisfies SettingRow);
    settings.put({ key: 'privateFingerprints', value: { domains: [...new Set(fingerprints.domains || [])], urls: [...new Set(fingerprints.urls || [])] } satisfies PrivateFingerprints, updatedAt: Date.now() } satisfies SettingRow);
    transaction.objectStore('encryptedHistory').clear();
    transaction.objectStore('archivedHistory').clear();
    transaction.objectStore('metadata').put({ key: 'private-model-v1', value: { migratedAt: Date.now(), restoredFromBackup: true }, updatedAt: Date.now() } satisfies MetadataRow);
    await transactionComplete(transaction);
    return this.mergeEncryptedHistoryEnvelopes(envelopes);
  },

  async initializeVault(bundle: VaultKeyBundle, captureIncognito = true): Promise<number> {
    const database = await openDatabase();
    const transaction = database.transaction(['settings', 'encryptedHistory', 'archivedHistory', 'metadata'], 'readwrite');
    const settings = transaction.objectStore('settings');
    settings.put({ key: 'vaultKeyBundle', value: bundle, updatedAt: Date.now() } satisfies SettingRow);
    settings.put({ key: 'vaultAutoLockSeconds', value: 30, updatedAt: Date.now() } satisfies SettingRow);
    settings.put({ key: 'incognitoCaptureEnabled', value: captureIncognito, updatedAt: Date.now() } satisfies SettingRow);
    settings.put({ key: 'privateFingerprints', value: { domains: [], urls: [] } satisfies PrivateFingerprints, updatedAt: Date.now() } satisfies SettingRow);
    settings.delete('archiveEnabled');
    transaction.objectStore('encryptedHistory').clear();
    transaction.objectStore('archivedHistory').clear();
    transaction.objectStore('metadata').delete('archive-sync-state');
    transaction.objectStore('metadata').put({ key: 'private-model-v1', value: { migratedAt: Date.now() }, updatedAt: Date.now() } satisfies MetadataRow);
    await transactionComplete(transaction);
    return 0;
  },

  async migratePrivateModel(): Promise<void> {
    if (await readRow<MetadataRow>('metadata', 'private-model-v1')) return;
    const database = await openDatabase();
    const transaction = database.transaction(['settings', 'encryptedHistory', 'archivedHistory', 'metadata'], 'readwrite');
    const settings = transaction.objectStore('settings');
    settings.delete('archiveEnabled');
    settings.put({ key: 'privateFingerprints', value: { domains: [], urls: [] } satisfies PrivateFingerprints, updatedAt: Date.now() } satisfies SettingRow);
    settings.put({ key: 'incognitoCaptureEnabled', value: true, updatedAt: Date.now() } satisfies SettingRow);
    transaction.objectStore('encryptedHistory').clear();
    transaction.objectStore('archivedHistory').clear();
    transaction.objectStore('metadata').delete('archive-sync-state');
    transaction.objectStore('metadata').put({ key: 'private-model-v1', value: { migratedAt: Date.now(), clearedLegacyPrivateCopies: true }, updatedAt: Date.now() } satisfies MetadataRow);
    await transactionComplete(transaction);
  },

  async readPrivateFingerprints(): Promise<PrivateFingerprints> {
    return await this.readSetting<PrivateFingerprints>('privateFingerprints') || { domains: [], urls: [] };
  },

  async savePrivateFingerprints(fingerprints: PrivateFingerprints): Promise<void> {
    await this.saveSetting('privateFingerprints', {
      domains: [...new Set(fingerprints.domains)],
      urls: [...new Set(fingerprints.urls)],
    } satisfies PrivateFingerprints);
  },

  async destroyVault(): Promise<void> {
    const database = await openDatabase();
    const transaction = database.transaction(['settings', 'encryptedHistory', 'archivedHistory', 'metadata'], 'readwrite');
    const settings = transaction.objectStore('settings');
    settings.delete('vaultKeyBundle');
    settings.delete('vaultAutoLockSeconds');
    settings.delete('archiveEnabled');
    settings.delete('incognitoCaptureEnabled');
    settings.delete('privateFingerprints');
    transaction.objectStore('encryptedHistory').clear();
    transaction.objectStore('archivedHistory').clear();
    transaction.objectStore('metadata').delete('archive-sync-state');
    await transactionComplete(transaction);
  },

  async migrateLegacyArchive(bundle: VaultKeyBundle): Promise<number> {
    const database = await openDatabase();
    const readTransaction = database.transaction('archivedHistory', 'readonly');
    const legacy = await requestResult(readTransaction.objectStore('archivedHistory').getAll()) as ArchivedHistoryRecord[];
    await transactionComplete(readTransaction);
    if (!legacy.length) return 0;
    const envelopes = await Promise.all(legacy.map((record) => encryptVaultRecord(bundle.publicKey, record)));
    const writeTransaction = database.transaction(['encryptedHistory', 'archivedHistory'], 'readwrite');
    for (const envelope of envelopes) writeTransaction.objectStore('encryptedHistory').put(envelope);
    writeTransaction.objectStore('archivedHistory').clear();
    await transactionComplete(writeTransaction);
    return envelopes.length;
  },

  async readEncryptedHistory(session: VaultSession, offset = 0, limit = 100): Promise<ArchivedHistoryRecord[]> {
    const database = await openDatabase();
    const transaction = database.transaction('encryptedHistory', 'readonly');
    const envelopes = await requestResult(transaction.objectStore('encryptedHistory').getAll()) as VaultRecordEnvelope[];
    await transactionComplete(transaction);
    const records = await Promise.all(envelopes.map((envelope) => decryptVaultRecord(session, envelope)));
    return records.sort((a, b) => b.lastVisitTime - a.lastVisitTime).slice(Math.max(0, offset), Math.max(0, offset) + Math.max(0, limit));
  },

  async readAllPrivateHistory(session: VaultSession): Promise<ArchivedHistoryRecord[]> {
    return this.readEncryptedHistory(session, 0, Number.MAX_SAFE_INTEGER);
  },

  async upsertPrivateHistoryRecords(records: HistoryRecord[], bundle: VaultKeyBundle, privacySource: ArchivedHistoryRecord['privacySource']): Promise<number> {
    const now = Date.now();
    const incoming = new Map<string, HistoryRecord>();
    for (const record of records) {
      if (!record.url || !getDomain(record.url)) continue;
      const previous = incoming.get(record.url);
      if (!previous || record.lastVisitTime >= previous.lastVisitTime) incoming.set(record.url, record);
    }
    const envelopes = await Promise.all([...incoming.values()].map((record) => encryptVaultRecord(bundle.publicKey, {
      ...record,
      id: record.url,
      sourceHistoryId: record.id,
      domain: getDomain(record.url)!,
      firstArchivedAt: now,
      archivedAt: now,
      privacySource,
    })));
    const database = await openDatabase();
    const transaction = database.transaction('encryptedHistory', 'readwrite');
    const store = transaction.objectStore('encryptedHistory');
    for (const envelope of envelopes) store.put(envelope);
    await transactionComplete(transaction);
    return envelopes.length;
  },

  async deletePrivateHistoryByUrls(urls: string[]): Promise<void> {
    const ids = await Promise.all([...new Set(urls)].map(stableRecordId));
    const database = await openDatabase();
    const transaction = database.transaction('encryptedHistory', 'readwrite');
    const store = transaction.objectStore('encryptedHistory');
    for (const id of ids) store.delete(id);
    await transactionComplete(transaction);
  },

  async syncEncryptedHistoryRecords(records: HistoryRecord[], bundle: VaultKeyBundle): Promise<ArchiveSyncResult> {
    const startedAt = Date.now();
    const incoming = new Map<string, HistoryRecord>();
    for (const record of records) {
      if (!record.url || !getDomain(record.url)) continue;
      const current = incoming.get(record.url);
      if (!current || record.lastVisitTime > current.lastVisitTime) incoming.set(record.url, record);
    }
    try {
      const envelopes = await Promise.all([...incoming.values()].map((record) => encryptVaultRecord(bundle.publicKey, {
        ...record,
        id: record.url,
        sourceHistoryId: record.id,
        domain: getDomain(record.url)!,
        firstArchivedAt: startedAt,
        archivedAt: startedAt,
        privacySource: 'manual-page',
      })));
      const database = await openDatabase();
      const readTransaction = database.transaction('encryptedHistory', 'readonly');
      const existingIds = new Set((await requestResult(readTransaction.objectStore('encryptedHistory').getAllKeys())).map(String));
      await transactionComplete(readTransaction);
      let insertedCount = 0;
      let updatedCount = 0;
      const writeTransaction = database.transaction('encryptedHistory', 'readwrite');
      const store = writeTransaction.objectStore('encryptedHistory');
      for (const envelope of envelopes) {
        if (existingIds.has(envelope.id)) updatedCount += 1;
        else insertedCount += 1;
        store.put(envelope);
      }
      await transactionComplete(writeTransaction);
      const archiveCount = await this.countArchivedHistory();
      const unchangedCount = 0;
      await saveMetadata('archive-sync-state', { status: 'completed', startedAt, completedAt: Date.now(), inputCount: incoming.size, insertedCount, updatedCount, unchangedCount, archiveCount, error: null } satisfies ArchiveSyncState);
      return { insertedCount, updatedCount, unchangedCount, archiveCount };
    } catch (error) {
      await saveMetadata('archive-sync-state', { status: 'failed', startedAt, completedAt: Date.now(), inputCount: incoming.size, insertedCount: 0, updatedCount: 0, unchangedCount: 0, archiveCount: await this.countArchivedHistory().catch(() => 0), error: error instanceof Error ? error.message : String(error) } satisfies ArchiveSyncState).catch(() => undefined);
      throw error;
    }
  },

  async readArchivedHistory(offset = 0, limit = 100): Promise<ArchivedHistoryRecord[]> {
    const database = await openDatabase();
    const transaction = database.transaction('archivedHistory', 'readonly');
    const index = transaction.objectStore('archivedHistory').index('byLastVisitTime');
    const rows = await new Promise<ArchivedHistoryRecord[]>((resolve, reject) => {
      const result: ArchivedHistoryRecord[] = [];
      let skipped = 0;
      const request = index.openCursor(null, 'prev');
      request.onerror = () => reject(request.error || new Error('Could not read archived history'));
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor || result.length >= Math.max(0, limit)) return resolve(result);
        if (skipped < Math.max(0, offset)) skipped += 1;
        else result.push(cursor.value as ArchivedHistoryRecord);
        cursor.continue();
      };
    });
    await transactionComplete(transaction);
    return rows;
  },

  async syncHistoryRecords(records: HistoryRecord[]): Promise<ArchiveSyncResult> {
    const startedAt = Date.now();
    const incoming = new Map<string, HistoryRecord>();
    for (const record of records) {
      if (!record.url || !getDomain(record.url)) continue;
      const current = incoming.get(record.url);
      if (!current || record.lastVisitTime > current.lastVisitTime) incoming.set(record.url, record);
    }
    await saveMetadata('archive-sync-state', {
      status: 'syncing', startedAt, completedAt: null, inputCount: incoming.size,
      insertedCount: 0, updatedCount: 0, unchangedCount: 0,
      archiveCount: await this.countArchivedHistory(), error: null,
    } satisfies ArchiveSyncState);

    try {
      const database = await openDatabase();
      const readTransaction = database.transaction('archivedHistory', 'readonly');
      const existingRows = await requestResult(readTransaction.objectStore('archivedHistory').getAll()) as ArchivedHistoryRecord[];
      await transactionComplete(readTransaction);
      const existing = new Map(existingRows.map((record) => [record.url, record]));
      let insertedCount = 0;
      let updatedCount = 0;
      let unchangedCount = 0;
      const changedRows: ArchivedHistoryRecord[] = [];

      for (const record of incoming.values()) {
        const previous = existing.get(record.url);
        const domain = getDomain(record.url)!;
        if (!previous) {
          insertedCount += 1;
          changedRows.push({ ...record, id: record.url, sourceHistoryId: record.id, domain, firstArchivedAt: startedAt, archivedAt: startedAt, privacySource: 'manual-page' });
          continue;
        }
        const nextTitle = record.lastVisitTime >= previous.lastVisitTime && record.title ? record.title : previous.title;
        const nextLastVisitTime = Math.max(previous.lastVisitTime, record.lastVisitTime);
        const nextVisitCount = Math.max(previous.visitCount, record.visitCount);
        if (nextTitle === previous.title && nextLastVisitTime === previous.lastVisitTime && nextVisitCount === previous.visitCount) {
          unchangedCount += 1;
          continue;
        }
        updatedCount += 1;
        changedRows.push({ ...previous, title: nextTitle, lastVisitTime: nextLastVisitTime, visitCount: nextVisitCount, sourceHistoryId: record.id, domain, archivedAt: startedAt });
      }

      const archiveCount = existing.size + insertedCount;
      const result = { insertedCount, updatedCount, unchangedCount, archiveCount };
      const transaction = database.transaction(['archivedHistory', 'metadata'], 'readwrite');
      const archiveStore = transaction.objectStore('archivedHistory');
      for (const row of changedRows) archiveStore.put(row);
      transaction.objectStore('metadata').put({
        key: 'archive-sync-state',
        value: { status: 'completed', startedAt, completedAt: Date.now(), inputCount: incoming.size, ...result, error: null } satisfies ArchiveSyncState,
        updatedAt: Date.now(),
      } satisfies MetadataRow);
      await transactionComplete(transaction);
      return result;
    } catch (error) {
      const previousCount = await this.countArchivedHistory().catch(() => 0);
      await saveMetadata('archive-sync-state', {
        status: 'failed', startedAt, completedAt: Date.now(), inputCount: incoming.size,
        insertedCount: 0, updatedCount: 0, unchangedCount: 0, archiveCount: previousCount,
        error: error instanceof Error ? error.message : String(error),
      } satisfies ArchiveSyncState).catch(() => undefined);
      throw error;
    }
  },

  async migrateLegacy(profiles: SiteProfileMap, locale: string | null): Promise<void> {
    const migrated = await readRow<MetadataRow>('metadata', 'legacy-storage-v1');
    if (migrated) return;
    const database = await openDatabase();
    const transaction = database.transaction(['siteProfiles', 'settings', 'metadata'], 'readwrite');
    const profileStore = transaction.objectStore('siteProfiles');
    if ((await requestResult(profileStore.count())) === 0) {
      for (const profile of Object.values(profiles)) profileStore.put(profile);
    }
    const settingsStore = transaction.objectStore('settings');
    if (locale && !(await requestResult(settingsStore.get('locale')))) settingsStore.put({ key: 'locale', value: locale, updatedAt: Date.now() } satisfies SettingRow);
    transaction.objectStore('metadata').put({ key: 'legacy-storage-v1', value: { migratedAt: Date.now(), profileCount: Object.keys(profiles).length }, updatedAt: Date.now() } satisfies MetadataRow);
    await transactionComplete(transaction);
  },
};
