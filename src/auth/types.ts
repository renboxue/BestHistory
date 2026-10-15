import type { Locale } from '@/src/i18n/messages';

export type IdentityProvider = 'email' | 'google' | 'microsoft' | 'apple';

export interface BestHistoryAccount {
  id: string;
  email: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
  displayName: string | null;
  providers: IdentityProvider[];
}

export interface AuthService {
  getCurrentAccount(): Promise<BestHistoryAccount | null>;
  sendEmailOtp(email: string, locale: Locale): Promise<void>;
  verifyEmailOtp(email: string, token: string, locale: Locale): Promise<BestHistoryAccount>;
  signInWithGoogle(locale: Locale): Promise<BestHistoryAccount>;
  updateLanguage(locale: Locale): Promise<void>;
  signOut(): Promise<void>;
  subscribe(listener: (account: BestHistoryAccount | null) => void): () => void;
}

export const supportedIdentityProviders: IdentityProvider[] = ['email', 'google', 'microsoft', 'apple'];
