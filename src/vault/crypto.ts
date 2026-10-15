import type { EncryptedPayload, VaultKeyBundle, VaultRecordEnvelope, VaultRecordInput, VaultSession, WrappedPrivateKey } from './types';

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const PBKDF2_ITERATIONS = 600_000;

function toBase64(value: ArrayBuffer | Uint8Array): string {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(length));
}

async function derivePasswordKey(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function encryptBytes(key: CryptoKey, plaintext: BufferSource): Promise<EncryptedPayload> {
  const iv = randomBytes(12);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return { algorithm: 'AES-256-GCM', ciphertext: toBase64(ciphertext), iv: toBase64(iv) };
}

async function decryptBytes(key: CryptoKey, payload: EncryptedPayload): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(payload.iv) }, key, fromBase64(payload.ciphertext));
}

async function wrapPrivateKey(privateKey: CryptoKey, password: string): Promise<WrappedPrivateKey> {
  const salt = randomBytes(16);
  const passwordKey = await derivePasswordKey(password, salt, PBKDF2_ITERATIONS);
  const privateJwk = await crypto.subtle.exportKey('jwk', privateKey);
  return {
    ...await encryptBytes(passwordKey, encoder.encode(JSON.stringify(privateJwk))),
    kdf: { algorithm: 'PBKDF2-SHA-256', iterations: PBKDF2_ITERATIONS, salt: toBase64(salt) },
  };
}

export async function createVaultKeyBundle(password: string): Promise<{ bundle: VaultKeyBundle; session: VaultSession }> {
  const pair = await crypto.subtle.generateKey(
    { name: 'RSA-OAEP', modulusLength: 3072, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['encrypt', 'decrypt'],
  );
  return {
    bundle: { version: 1, publicKey: await crypto.subtle.exportKey('jwk', pair.publicKey), wrappedPrivateKey: await wrapPrivateKey(pair.privateKey, password), createdAt: Date.now() },
    session: { privateKey: pair.privateKey, unlockedAt: Date.now() },
  };
}

export async function unlockVault(bundle: VaultKeyBundle, password: string): Promise<VaultSession> {
  const wrapped = bundle.wrappedPrivateKey;
  const key = await derivePasswordKey(password, fromBase64(wrapped.kdf.salt), wrapped.kdf.iterations);
  const jwk = JSON.parse(decoder.decode(await decryptBytes(key, wrapped))) as JsonWebKey;
  const privateKey = await crypto.subtle.importKey('jwk', jwk, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['decrypt']);
  return { privateKey, unlockedAt: Date.now() };
}

export async function changeVaultPassword(bundle: VaultKeyBundle, currentPassword: string, nextPassword: string): Promise<{ bundle: VaultKeyBundle; session: VaultSession }> {
  const current = bundle.wrappedPrivateKey;
  const currentKey = await derivePasswordKey(currentPassword, fromBase64(current.kdf.salt), current.kdf.iterations);
  const privateJwkBytes = await decryptBytes(currentKey, current);
  const privateJwk = JSON.parse(decoder.decode(privateJwkBytes)) as JsonWebKey;
  const privateKey = await crypto.subtle.importKey('jwk', privateJwk, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['decrypt']);
  const nextSalt = randomBytes(16);
  const nextKey = await derivePasswordKey(nextPassword, nextSalt, PBKDF2_ITERATIONS);
  const wrappedPrivateKey: WrappedPrivateKey = {
    ...await encryptBytes(nextKey, privateJwkBytes),
    kdf: { algorithm: 'PBKDF2-SHA-256', iterations: PBKDF2_ITERATIONS, salt: toBase64(nextSalt) },
  };
  return { bundle: { ...bundle, wrappedPrivateKey }, session: { privateKey, unlockedAt: Date.now() } };
}

export async function stableRecordId(url: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(url));
  return toBase64(digest).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

export async function encryptVaultRecord(publicKeyJwk: JsonWebKey, record: VaultRecordInput): Promise<VaultRecordEnvelope> {
  const publicKey = await crypto.subtle.importKey('jwk', publicKeyJwk, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
  const dataKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const wrappedDataKey = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, await crypto.subtle.exportKey('raw', dataKey));
  return {
    ...await encryptBytes(dataKey, encoder.encode(JSON.stringify(record))),
    version: 1,
    id: await stableRecordId(record.url),
    wrappedDataKey: toBase64(wrappedDataKey),
    createdAt: Date.now(),
  };
}

export async function decryptVaultRecord(session: VaultSession, envelope: VaultRecordEnvelope): Promise<VaultRecordInput> {
  const rawKey = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, session.privateKey, fromBase64(envelope.wrappedDataKey));
  const dataKey = await crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, ['decrypt']);
  return JSON.parse(decoder.decode(await decryptBytes(dataKey, envelope))) as VaultRecordInput;
}
