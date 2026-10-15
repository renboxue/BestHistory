import { createClient } from '@supabase/supabase-js';
import { browser } from 'wxt/browser';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/src/config/supabase';

const extensionStorage = {
  async getItem(key: string): Promise<string | null> {
    const result = await browser.storage.local.get(key);
    return typeof result[key] === 'string' ? result[key] as string : null;
  },
  async setItem(key: string, value: string): Promise<void> {
    await browser.storage.local.set({ [key]: value });
  },
  async removeItem(key: string): Promise<void> {
    await browser.storage.local.remove(key);
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: extensionStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
