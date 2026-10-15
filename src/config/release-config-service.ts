import { supabase } from '@/src/auth/supabase-client';
import { withBestHistoryClientMeta } from '@/src/config/client-context';

export type BestHistoryFeatureFlags = Record<string, boolean>;

export type BestHistoryReleaseConfig = {
  apiVersion: number;
  app: 'besthistory';
  clientVersion: string | null;
  latestVersion: string;
  minSupportedVersion: string;
  supported: boolean;
  upgradeRecommended: boolean;
  maintenance: boolean;
  featureFlags: BestHistoryFeatureFlags;
};

export async function getBestHistoryReleaseConfig(): Promise<BestHistoryReleaseConfig> {
  const { data, error } = await supabase.functions.invoke('app-client-config', {
    body: withBestHistoryClientMeta({}),
  });
  if (error) throw error;
  if (!data || typeof data !== 'object') throw new Error('APP_RELEASE_CONFIG_UNAVAILABLE');
  return data as BestHistoryReleaseConfig;
}
