export type BillingPlanId = 'pro_monthly' | 'pro_yearly' | 'pro_lifetime';
export type BillingOrderStatus = 'created' | 'checkout_open' | 'paid' | 'canceled' | 'failed' | 'refunded' | 'expired';
export type BillingEnvironment = 'sandbox' | 'live';
export type BillingProvider = 'paddle' | 'dodo';

export type BillingMembership = {
  planId: BillingPlanId;
  provider: BillingProvider;
  environment: BillingEnvironment;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

export type BillingCheckoutContext = {
  transactionId: string;
  checkoutUrl: string;
  planId: BillingPlanId;
  provider: BillingProvider;
  environment: BillingEnvironment;
};

export type BillingOrder = {
  id: string;
  provider: BillingProvider;
  environment: BillingEnvironment;
  planId: BillingPlanId;
  status: BillingOrderStatus;
  checkoutUrl: string | null;
  providerOrderId: string | null;
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BillingCheckoutStatus = {
  activated: boolean;
  source?: string | null;
  status?: string | null;
  plan?: string | null;
  orderStatus?: string | null;
  transactionId?: string | null;
  subscriptionId?: string | null;
};

export interface BillingService {
  createCheckout(planId: BillingPlanId, locale: string): Promise<BillingCheckoutContext>;
  getLatestOrder(): Promise<BillingOrder | null>;
  getRecentOrders(limit?: number): Promise<BillingOrder[]>;
  getMembership(): Promise<BillingMembership | null>;
  refreshCheckoutStatus(transactionId: string): Promise<BillingCheckoutStatus>;
  openCheckoutPopup(checkoutUrl: string): Promise<void>;
  openSubscriptionPortal(): Promise<void>;
}
