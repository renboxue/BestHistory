import type { ArchivedHistoryRecord } from '@/src/storage/local-database';

export type VaultAutoLockSeconds = 30 | 60 | 300 | 900;

export interface EncryptedPayload {
  algorithm: 'AES-256-GCM';
  ciphertext: string;
  iv: string;
}

export interface WrappedPrivateKey extends EncryptedPayload {
  kdf: { algorithm: 'PBKDF2-SHA-256'; iterations: number; salt: string };
}

export interface VaultKeyBundle {
  version: 1;
  publicKey: JsonWebKey;
  wrappedPrivateKey: WrappedPrivateKey;
  createdAt: number;
}

export interface VaultRecordEnvelope extends EncryptedPayload {
  version: 1;
  id: string;
  wrappedDataKey: string;
  createdAt: number;
}

export interface VaultSession {
  privateKey: CryptoKey;
  unlockedAt: number;
}

export type VaultRecordInput = ArchivedHistoryRecord;
