// Public source defaults to a non-routable hostname, never BestHistory production.
// WXT_ variables are build-time public configuration, not credentials with privileges.
const configuredUrl = (import.meta.env.WXT_BH_SUPABASE_URL || '').trim();
const configuredKey = (import.meta.env.WXT_BH_SUPABASE_PUBLISHABLE_KEY || '').trim();
const complete = Boolean(configuredUrl && configuredKey);
export const BACKEND_CONFIGURED = complete;
export const SUPABASE_URL = complete ? configuredUrl : 'https://backend.unconfigured.invalid';
export const SUPABASE_PUBLISHABLE_KEY = complete ? configuredKey : 'not-configured';
export const CHECKOUT_ORIGIN = (import.meta.env.WXT_BH_CHECKOUT_ORIGIN || '').replace(/\/$/, '') || 'https://checkout.unconfigured.invalid';
// This is a deliberate fail-closed default, not a functioning demo backend.
