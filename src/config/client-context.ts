import { browser } from 'wxt/browser';

export const BESTHISTORY_APP_ID = 'besthistory' as const;

export type BestHistoryClientMeta = {
  app: typeof BESTHISTORY_APP_ID;
  version: string;
};

export function getBestHistoryVersion(): string {
  return browser.runtime.getManifest().version || '0.0.0';
}

export function getBestHistoryClientMeta(): BestHistoryClientMeta {
  return {
    app: BESTHISTORY_APP_ID,
    version: getBestHistoryVersion(),
  };
}

export function withBestHistoryClientMeta<T extends object>(body: T): T & { _client: BestHistoryClientMeta } {
  return {
    ...body,
    _client: getBestHistoryClientMeta(),
  };
}
