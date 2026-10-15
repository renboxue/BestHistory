export type EntitlementPlan = 'free' | 'pro';
export type EntitlementStatus = 'active' | 'trialing' | 'expired' | 'canceled' | 'past_due' | 'refunded';
export type EntitlementSource = 'system' | 'payment' | 'trial' | 'lifetime' | 'admin';

export interface BestHistoryEntitlement {
  plan: EntitlementPlan;
  status: EntitlementStatus;
  source: EntitlementSource;
  validUntil: string | null;
  graceUntil: string | null;
  isPro: boolean;
  serverNow: string;
}

export interface EntitlementService {
  getCurrentEntitlement(options?: { forceRefresh?: boolean }): Promise<BestHistoryEntitlement>;
}
