import { supabase } from '@/src/auth/supabase-client';
import {
  ENTITLEMENT_CACHE_FRESH_MS,
  cacheAgeMs,
  cachedEntitlementStillPro,
  readEntitlementCache,
  writeEntitlementCache,
} from '@/src/entitlements/entitlement-cache';
import type {
  BestHistoryEntitlement,
  EntitlementPlan,
  EntitlementService,
  EntitlementSource,
  EntitlementStatus,
} from '@/src/entitlements/types';

type EntitlementRpcRow = {
  plan: EntitlementPlan;
  status: EntitlementStatus;
  source: EntitlementSource;
  valid_until: string | null;
  grace_until: string | null;
  is_pro: boolean;
  server_now: string;
};

function toEntitlement(row: EntitlementRpcRow): BestHistoryEntitlement {
  return {
    plan: row.plan,
    status: row.status,
    source: row.source,
    validUntil: row.valid_until,
    graceUntil: row.grace_until,
    isPro: row.is_pro,
    serverNow: row.server_now,
  };
}

function expiredFromCache(value: BestHistoryEntitlement): BestHistoryEntitlement {
  if (value.plan !== 'pro' || !value.isPro) return value;
  return { ...value, status: 'expired', isPro: false };
}

export class SupabaseEntitlementService implements EntitlementService {
  async getCurrentEntitlement(options?: { forceRefresh?: boolean }): Promise<BestHistoryEntitlement> {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    const accountId = sessionData.session?.user.id;
    if (!accountId) throw new Error('AUTH_REQUIRED');

    const cache = await readEntitlementCache();
    const matchingCache = cache?.accountId === accountId ? cache : null;
    if (!options?.forceRefresh && matchingCache && cacheAgeMs(matchingCache) <= ENTITLEMENT_CACHE_FRESH_MS) {
      return cachedEntitlementStillPro(matchingCache)
        ? matchingCache.entitlement
        : expiredFromCache(matchingCache.entitlement);
    }

    try {
      const { data, error } = await supabase.rpc('get_my_entitlement');
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] as EntitlementRpcRow | undefined : undefined;
      if (!row) throw new Error('ENTITLEMENT_MISSING');
      const entitlement = toEntitlement(row);
      await writeEntitlementCache(accountId, entitlement);
      return entitlement;
    } catch (error) {
      if (matchingCache && cachedEntitlementStillPro(matchingCache)) return matchingCache.entitlement;
      throw error;
    }
  }
}

export const entitlementService: EntitlementService = new SupabaseEntitlementService();
