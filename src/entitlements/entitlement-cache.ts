import { browser } from 'wxt/browser';
import type { BestHistoryEntitlement } from '@/src/entitlements/types';

const ENTITLEMENT_CACHE_KEY = 'besthistory:entitlement-cache:v1';
export const ENTITLEMENT_CACHE_FRESH_MS = 24 * 60 * 60 * 1000;
export const ENTITLEMENT_OFFLINE_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

export interface CachedEntitlement {
  version: 1;
  accountId: string;
  entitlement: BestHistoryEntitlement;
  fetchedAt: number;
}

function isCachedEntitlement(value: unknown): value is CachedEntitlement {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<CachedEntitlement>;
  return candidate.version === 1
    && typeof candidate.accountId === 'string'
    && typeof candidate.fetchedAt === 'number'
    && Boolean(candidate.entitlement)
    && typeof candidate.entitlement?.plan === 'string'
    && typeof candidate.entitlement?.status === 'string'
    && typeof candidate.entitlement?.isPro === 'boolean';
}

export async function readEntitlementCache(): Promise<CachedEntitlement | null> {
  const result = await browser.storage.local.get(ENTITLEMENT_CACHE_KEY);
  const value = result[ENTITLEMENT_CACHE_KEY];
  return isCachedEntitlement(value) ? value : null;
}

export async function writeEntitlementCache(accountId: string, entitlement: BestHistoryEntitlement): Promise<void> {
  const value: CachedEntitlement = {
    version: 1,
    accountId,
    entitlement,
    fetchedAt: Date.now(),
  };
  await browser.storage.local.set({ [ENTITLEMENT_CACHE_KEY]: value });
}

export async function clearEntitlementCache(): Promise<void> {
  await browser.storage.local.remove(ENTITLEMENT_CACHE_KEY);
}

export function cacheAgeMs(cache: CachedEntitlement, now = Date.now()): number {
  return Math.max(0, now - cache.fetchedAt);
}

function estimatedServerNowMs(cache: CachedEntitlement, now = Date.now()): number {
  const serverNow = Date.parse(cache.entitlement.serverNow || '');
  if (!Number.isFinite(serverNow)) return now;
  return serverNow + cacheAgeMs(cache, now);
}

function entitlementExpiryMs(entitlement: BestHistoryEntitlement): number | null {
  const candidates = [entitlement.validUntil, entitlement.graceUntil]
    .filter((value): value is string => Boolean(value))
    .map((value) => Date.parse(value))
    .filter(Number.isFinite);
  return candidates.length ? Math.max(...candidates) : null;
}

export function cachedEntitlementStillPro(cache: CachedEntitlement, now = Date.now()): boolean {
  if (!cache.entitlement.isPro || cache.entitlement.plan !== 'pro') return false;
  if (cacheAgeMs(cache, now) > ENTITLEMENT_OFFLINE_GRACE_MS) return false;
  const expiry = entitlementExpiryMs(cache.entitlement);
  return expiry === null || expiry > estimatedServerNowMs(cache, now);
}

export async function hasCachedProAccess(now = Date.now()): Promise<boolean> {
  const cache = await readEntitlementCache();
  return cache ? cachedEntitlementStillPro(cache, now) : false;
}
