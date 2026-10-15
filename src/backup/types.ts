import type { HistoryRecord } from '@/src/domain/history';
import type { SiteProfileMap } from '@/src/domain/site-profile';
import type { Locale } from '@/src/i18n/messages';
import type { PrivateFingerprints } from '@/src/storage/local-database';
import type { VaultAutoLockSeconds, VaultKeyBundle, VaultRecordEnvelope } from '@/src/vault/types';

export const BESTHISTORY_BACKUP_FORMAT = 'besthistory-backup' as const;
export const BESTHISTORY_BACKUP_VERSION = 1 as const;

export interface BestHistoryBackupFile {
  format: typeof BESTHISTORY_BACKUP_FORMAT;
  version: typeof BESTHISTORY_BACKUP_VERSION;
  appVersion: string;
  createdAt: number;
  publicData: {
    history: HistoryRecord[];
    siteProfiles: SiteProfileMap;
    settings: {
      locale: Locale | null;
    };
  };
  privateData?: {
    keyBundle: VaultKeyBundle;
    fingerprints: PrivateFingerprints;
    settings: {
      autoLockSeconds: VaultAutoLockSeconds;
      incognitoCaptureEnabled: boolean;
    };
    encryptedHistory: VaultRecordEnvelope[];
  };
}

export interface BackupSummary {
  createdAt: number;
  appVersion: string;
  publicHistoryCount: number;
  siteProfileCount: number;
  privateRecordCount: number;
  hasPrivateData: boolean;
}

export interface BackupRestoreResult {
  publicHistoryImported: number;
  publicHistoryUpdated: number;
  siteProfilesImported: number;
  siteProfilesMerged: number;
  privateRecordsImported: number;
  privateRecordsUpdated: number;
  privateSkipped: boolean;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isHistoryRecord(value: unknown): value is HistoryRecord {
  if (!isObject(value)) return false;
  return typeof value.id === 'string'
    && typeof value.url === 'string'
    && typeof value.title === 'string'
    && typeof value.lastVisitTime === 'number'
    && Number.isFinite(value.lastVisitTime)
    && typeof value.visitCount === 'number'
    && Number.isFinite(value.visitCount);
}


function isSiteProfile(value: unknown): boolean {
  if (!isObject(value)) return false;
  return typeof value.domain === 'string'
    && typeof value.customName === 'string'
    && typeof value.note === 'string'
    && Array.isArray(value.tags)
    && value.tags.every((tag) => typeof tag === 'string')
    && typeof value.pinned === 'boolean'
    && typeof value.hidden === 'boolean'
    && typeof value.updatedAt === 'number';
}

function isVaultKeyBundle(value: unknown): boolean {
  if (!isObject(value) || value.version !== 1 || !isObject(value.publicKey) || !isObject(value.wrappedPrivateKey)) return false;
  const wrapped = value.wrappedPrivateKey;
  return wrapped.algorithm === 'AES-256-GCM'
    && typeof wrapped.ciphertext === 'string'
    && typeof wrapped.iv === 'string'
    && isObject(wrapped.kdf)
    && wrapped.kdf.algorithm === 'PBKDF2-SHA-256'
    && typeof wrapped.kdf.iterations === 'number'
    && typeof wrapped.kdf.salt === 'string';
}

function isVaultEnvelope(value: unknown): boolean {
  if (!isObject(value)) return false;
  return value.version === 1
    && value.algorithm === 'AES-256-GCM'
    && typeof value.id === 'string'
    && typeof value.ciphertext === 'string'
    && typeof value.iv === 'string'
    && typeof value.wrappedDataKey === 'string'
    && typeof value.createdAt === 'number';
}

export function parseBestHistoryBackup(text: string): BestHistoryBackupFile {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('INVALID_BACKUP_JSON');
  }
  if (!isObject(value) || value.format !== BESTHISTORY_BACKUP_FORMAT || value.version !== BESTHISTORY_BACKUP_VERSION) {
    throw new Error('UNSUPPORTED_BACKUP');
  }
  if (typeof value.createdAt !== 'number' || typeof value.appVersion !== 'string' || !isObject(value.publicData)) {
    throw new Error('INVALID_BACKUP');
  }
  const publicData = value.publicData;
  if (!Array.isArray(publicData.history) || !publicData.history.every(isHistoryRecord) || !isObject(publicData.siteProfiles) || !Object.values(publicData.siteProfiles).every(isSiteProfile) || !isObject(publicData.settings)) {
    throw new Error('INVALID_BACKUP');
  }
  const locale = publicData.settings.locale;
  if (locale !== null && locale !== undefined && typeof locale !== 'string') throw new Error('INVALID_BACKUP');
  if (value.privateData !== undefined) {
    if (!isObject(value.privateData)) throw new Error('INVALID_BACKUP');
    const privateData = value.privateData;
    if (!isVaultKeyBundle(privateData.keyBundle) || !isObject(privateData.fingerprints) || !Array.isArray(privateData.fingerprints.domains) || !privateData.fingerprints.domains.every((item) => typeof item === 'string') || !Array.isArray(privateData.fingerprints.urls) || !privateData.fingerprints.urls.every((item) => typeof item === 'string') || !isObject(privateData.settings) || typeof privateData.settings.autoLockSeconds !== 'number' || typeof privateData.settings.incognitoCaptureEnabled !== 'boolean' || !Array.isArray(privateData.encryptedHistory) || !privateData.encryptedHistory.every(isVaultEnvelope)) {
      throw new Error('INVALID_BACKUP');
    }
  }
  return value as unknown as BestHistoryBackupFile;
}

export function summarizeBackup(backup: BestHistoryBackupFile): BackupSummary {
  return {
    createdAt: backup.createdAt,
    appVersion: backup.appVersion,
    publicHistoryCount: backup.publicData.history.length,
    siteProfileCount: Object.keys(backup.publicData.siteProfiles).length,
    privateRecordCount: backup.privateData?.encryptedHistory.length || 0,
    hasPrivateData: Boolean(backup.privateData),
  };
}
