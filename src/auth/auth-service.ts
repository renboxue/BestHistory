import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { browser } from 'wxt/browser';
import { supabase } from '@/src/auth/supabase-client';
import type { AuthService, BestHistoryAccount, IdentityProvider } from '@/src/auth/types';
import type { Locale } from '@/src/i18n/messages';
import { clearEntitlementCache } from '@/src/entitlements/entitlement-cache';

function normalizeProvider(value: unknown): IdentityProvider | null {
  if (value === 'email') return 'email';
  if (value === 'google') return 'google';
  if (value === 'azure' || value === 'microsoft') return 'microsoft';
  if (value === 'apple') return 'apple';
  return null;
}

function toAccount(user: User): BestHistoryAccount {
  const providers = new Set<IdentityProvider>();
  for (const identity of user.identities || []) {
    const provider = normalizeProvider(identity.provider);
    if (provider) providers.add(provider);
  }
  const primaryProvider = normalizeProvider(user.app_metadata?.provider);
  if (primaryProvider) providers.add(primaryProvider);
  if (providers.size === 0 && user.email) providers.add('email');

  const rawName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? null;
  const displayName = typeof rawName === 'string' && rawName.trim() ? rawName.trim() : null;

  return {
    id: user.id,
    email: user.email || null,
    createdAt: user.created_at || null,
    lastSignInAt: user.last_sign_in_at || null,
    displayName,
    providers: [...providers],
  };
}

export class SupabaseAuthService implements AuthService {
  async getCurrentAccount(): Promise<BestHistoryAccount | null> {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session?.user ? toAccount(data.session.user) : null;
  }

  async sendEmailOtp(email: string, locale: Locale): Promise<void> {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        data: { language: locale },
      },
    });
    if (error) throw error;
  }

  async verifyEmailOtp(email: string, token: string, locale: Locale): Promise<BestHistoryAccount> {
    const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    if (error) throw error;
    if (!data.user) throw new Error('AUTH_USER_MISSING');

    const { data: updated, error: updateError } = await supabase.auth.updateUser({
      data: { language: locale },
    });
    if (updateError) throw updateError;
    await clearEntitlementCache();
    return toAccount(updated.user || data.user);
  }

  async signInWithGoogle(locale: Locale): Promise<BestHistoryAccount> {
    const redirectTo = browser.identity.getRedirectURL('besthistory-auth');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        scopes: 'openid email profile',
      },
    });
    if (error) throw error;
    if (!data.url) throw new Error('AUTH_GOOGLE_URL_MISSING');

    let responseUrl: string | undefined;
    try {
      responseUrl = await browser.identity.launchWebAuthFlow({
        url: data.url,
        interactive: true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message.toLocaleLowerCase() : String(error || '').toLocaleLowerCase();
      if (message.includes('cancel') || message.includes('closed') || message.includes('approve') || message.includes('user')) {
        throw new Error('AUTH_GOOGLE_CANCELED');
      }
      throw error;
    }
    if (!responseUrl) throw new Error('AUTH_GOOGLE_CANCELED');

    const callbackUrl = new URL(responseUrl);
    const callbackError = callbackUrl.searchParams.get('error_description') || callbackUrl.searchParams.get('error');
    const hash = new URLSearchParams(callbackUrl.hash.replace(/^#/, ''));
    const hashError = hash.get('error_description') || hash.get('error');
    if (callbackError || hashError) throw new Error(callbackError || hashError || 'AUTH_GOOGLE_FAILED');

    let user: User | null = null;
    const accessToken = hash.get('access_token');
    const refreshToken = hash.get('refresh_token');
    if (accessToken && refreshToken) {
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (sessionError) throw sessionError;
      user = sessionData.user;
    } else {
      const code = callbackUrl.searchParams.get('code');
      if (!code) throw new Error('AUTH_GOOGLE_SESSION_MISSING');
      const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
      if (sessionError) throw sessionError;
      user = sessionData.user;
    }

    if (!user) throw new Error('AUTH_USER_MISSING');
    const { data: updated, error: updateError } = await supabase.auth.updateUser({
      data: { language: locale },
    });
    if (updateError) throw updateError;
    await clearEntitlementCache();
    return toAccount(updated.user || user);
  }

  async updateLanguage(locale: Locale): Promise<void> {
    const { error } = await supabase.auth.updateUser({
      data: { language: locale },
    });
    if (error) throw error;
  }

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw error;
    await clearEntitlementCache();
  }

  subscribe(listener: (account: BestHistoryAccount | null) => void): () => void {
    const { data } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      listener(session?.user ? toAccount(session.user) : null);
    });
    return () => data.subscription.unsubscribe();
  }
}

export const authService: AuthService = new SupabaseAuthService();
