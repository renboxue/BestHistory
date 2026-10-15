import { defineConfig } from 'wxt';

// The manifest callback runs after WXT loads WXT_ environment variables.
// A public clone has no permission to contact the hosted BestHistory services.
function strictHttpsOrigin(value: string | undefined, label: string): string | null {
  if (!value?.trim()) return null;
  const url = new URL(value.trim());
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error(`${label} must be a bare HTTPS origin`);
  }
  return url.origin;
}

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: () => {
    const api = strictHttpsOrigin(import.meta.env.WXT_BH_SUPABASE_URL, 'WXT_BH_SUPABASE_URL');
    const key = import.meta.env.WXT_BH_SUPABASE_PUBLISHABLE_KEY?.trim() || '';
    if (Boolean(api) !== Boolean(key)) throw new Error('Supabase URL and publishable key must be provided together');
    const checkout = strictHttpsOrigin(import.meta.env.WXT_BH_CHECKOUT_ORIGIN, 'WXT_BH_CHECKOUT_ORIGIN');
    return {
      name: '__MSG_extName__',
      description: '__MSG_extDescription__',
      version: '1.1.0',
      default_locale: 'en',
      minimum_chrome_version: '120',
      incognito: 'spanning',
      permissions: ['history', 'storage', 'favicon', 'webNavigation', 'tabs', 'identity', 'alarms'],
      host_permissions: api ? [`${api}/*`] : [],
      action: { default_title: '__MSG_extActionTitle__' },
      ...(checkout ? { externally_connectable: { matches: [`${checkout}/checkout/*`] } } : {}),
    };
  },
});
