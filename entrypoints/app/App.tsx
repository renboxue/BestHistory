import { Fragment, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { browser } from 'wxt/browser';
import { aggregateWebsites, getDomain, type HistoryRecord } from '@/src/domain/history';
import { createSiteProfile, normalizeSiteTags, type SiteProfile, type SiteProfileMap } from '@/src/domain/site-profile';
import { createTranslator, detectLocale, supportedLocales, type Locale } from '@/src/i18n/messages';
import { browserAdapter } from '@/src/platform/browser-adapter';
import { authService } from '@/src/auth/auth-service';
import { entitlementService } from '@/src/entitlements/entitlement-service';
import type { BestHistoryAccount } from '@/src/auth/types';
import type { BestHistoryEntitlement } from '@/src/entitlements/types';
import { billingService } from '@/src/billing/billing-service';
import type { BillingCheckoutContext, BillingCheckoutStatus, BillingMembership, BillingOrder, BillingPlanId } from '@/src/billing/types';
import { aiService } from '@/src/ai/ai-service';
import { buildRecallLocalHints, searchRecallCandidates } from '@/src/ai/recall-search';
import type { AiOrganizeWebsiteSuggestion, AiRecallExpansion, AiRecallResult } from '@/src/ai/types';
import type { ArchivedHistoryRecord } from '@/src/storage/local-database';
import { VaultAutoLock } from '@/src/vault/auto-lock';
import type { VaultAutoLockSeconds } from '@/src/vault/types';
import { parseBestHistoryBackup, summarizeBackup, type BackupSummary, type BestHistoryBackupFile } from '@/src/backup/types';
import TabOrganizerView from './TabOrganizerView';

type View = 'websites' | 'timeline' | 'tabs' | 'account' | 'feedback' | 'settings';
type TimelineRange = 'all' | 'today' | 'yesterday' | 'week';
type PendingDelete = { urls: string[]; executeAt: number };
type PendingPrivateAction = { kind: 'site'; domain: string; records: HistoryRecord[]; closeDetails: boolean } | { kind: 'page'; record: HistoryRecord } | null;
type SiteView = 'all' | 'recent' | 'frequent' | 'pinned' | 'unorganized' | 'hidden' | 'private';
type TimelineRun = { id: string; domain: string; records: HistoryRecord[] };
type AiOrganizeScope = 'unclassified' | 'current' | 'all';
type AiOrganizeSuggestionView = { domain: string; suggestedTags: string[] };
const MAX_SITE_TAGS = 10;
const MAX_TAG_LENGTH = 20;
const FEEDBACK_EMAIL = 'besthistory@126.com';

function formatDate(timestamp: number, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp);
}

function formatTime(timestamp: number, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp);
}

function createTimelineRuns(records: HistoryRecord[], runIds: Map<string, string>): TimelineRun[] {
  const runs: TimelineRun[] = [];
  for (const record of records) {
    const domain = getDomain(record.url) || '';
    const runId = runIds.get(record.id) || `${record.id}:${record.lastVisitTime}:${domain}`;
    const current = runs[runs.length - 1];
    if (current && current.id === runId) current.records.push(record);
    else runs.push({ id: runId, domain, records: [record] });
  }
  return runs;
}

function dateKey(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function normalizeSearchText(value: string): string {
  return value.normalize('NFKD').toLocaleLowerCase().replace(/\p{M}/gu, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي');
}

function highlightText(value: string, query: string): ReactNode {
  const term = query.trim();
  if (!term) return value;
  const index = value.toLocaleLowerCase().indexOf(term.toLocaleLowerCase());
  if (index < 0) return value;
  return <Fragment>{value.slice(0, index)}<mark>{value.slice(index, index + term.length)}</mark>{value.slice(index + term.length)}</Fragment>;
}

function isPrivateRecord(record: HistoryRecord): record is ArchivedHistoryRecord {
  return 'privacySource' in record;
}

function getWebsiteHomeUrl(pageUrl: string): string {
  try {
    const url = new URL(pageUrl);
    if (url.protocol === 'http:' || url.protocol === 'https:') return `${url.origin}/`;
    if (url.hostname) return `${url.protocol}//${url.host}/`;
    return url.href;
  } catch {
    return pageUrl;
  }
}

export default function App() {
  const [locale, setLocale] = useState<Locale>(detectLocale);
  const t = useMemo(() => createTranslator(locale), [locale]);
  const [view, setView] = useState<View>('websites');
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [privateRecords, setPrivateRecords] = useState<ArchivedHistoryRecord[]>([]);
  const [query, setQuery] = useState('');
  const [tabQuery, setTabQuery] = useState('');
  const [timelineRange, setTimelineRange] = useState<TimelineRange>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [hourFilter, setHourFilter] = useState('all');
  const [domainFilter, setDomainFilter] = useState('all');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [failedFavicons, setFailedFavicons] = useState<Record<string, true>>({});
  const [profiles, setProfiles] = useState<SiteProfileMap>({});
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [profileDraft, setProfileDraft] = useState<SiteProfile | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);
  const [homepageCopied, setHomepageCopied] = useState(false);
  const [siteView, setSiteView] = useState<SiteView>('recent');
  const [selectedTagFilters, setSelectedTagFilters] = useState<Set<string>>(new Set());
  const [showAllTags, setShowAllTags] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [tagRenameDrafts, setTagRenameDrafts] = useState<Record<string, string>>({});
  const [tagMergeTargets, setTagMergeTargets] = useState<Record<string, string>>({});
  const [batchTag, setBatchTag] = useState('');
  const [batchSiteQuery, setBatchSiteQuery] = useState('');
  const [batchSelectedDomains, setBatchSelectedDomains] = useState<Set<string>>(new Set());
  const [websitePage, setWebsitePage] = useState(1);
  const [siteMenuDomain, setSiteMenuDomain] = useState<string | null>(null);
  const [detailPageLimit, setDetailPageLimit] = useState(20);
  const [detailQuery, setDetailQuery] = useState('');
  const [selecting, setSelecting] = useState(false);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [expandedTimelineRuns, setExpandedTimelineRuns] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [deleteClock, setDeleteClock] = useState(Date.now());
  const [calculatingDelete, setCalculatingDelete] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [vaultConfigured, setVaultConfigured] = useState(false);
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [vaultPassword, setVaultPassword] = useState('');
  const [vaultConfirmPassword, setVaultConfirmPassword] = useState('');
  const [vaultError, setVaultError] = useState('');
  const [vaultAutoLockSeconds, setVaultAutoLockSeconds] = useState<VaultAutoLockSeconds>(30);
  const [vaultSetupOpen, setVaultSetupOpen] = useState(false);
  const [vaultUnlockOpen, setVaultUnlockOpen] = useState(false);
  const [pendingPrivateAction, setPendingPrivateAction] = useState<PendingPrivateAction>(null);
  const [incognitoCaptureEnabled, setIncognitoCaptureEnabled] = useState(true);
  const [incognitoAccessAllowed, setIncognitoAccessAllowed] = useState<boolean | null>(null);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [currentVaultPassword, setCurrentVaultPassword] = useState('');
  const [newVaultPassword, setNewVaultPassword] = useState('');
  const [newVaultConfirmPassword, setNewVaultConfirmPassword] = useState('');
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [vaultResetOpen, setVaultResetOpen] = useState(false);
  const [vaultResetInput, setVaultResetInput] = useState('');
  const [vaultResetError, setVaultResetError] = useState('');
  const [feedbackCopied, setFeedbackCopied] = useState<'email' | 'template' | null>(null);
  const [authAccount, setAuthAccount] = useState<BestHistoryAccount | null>(null);
  const [authStatus, setAuthStatus] = useState<'loading' | 'signedOut' | 'signedIn'>('loading');
  const [authEmail, setAuthEmail] = useState('');
  const [authPendingEmail, setAuthPendingEmail] = useState('');
  const [authOtp, setAuthOtp] = useState('');
  const [authStep, setAuthStep] = useState<'email' | 'otp'>('email');
  const [authBusy, setAuthBusy] = useState(false);
  const [authGoogleBusy, setAuthGoogleBusy] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalReturnToAccount, setAuthModalReturnToAccount] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authNotice, setAuthNotice] = useState('');
  const [authResendAt, setAuthResendAt] = useState(0);
  const [authClock, setAuthClock] = useState(Date.now());
  const [entitlement, setEntitlement] = useState<BestHistoryEntitlement | null>(null);
  const [entitlementStatus, setEntitlementStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [privateProGateOpen, setPrivateProGateOpen] = useState(false);
  const [billingModalOpen, setBillingModalOpen] = useState(false);
  const [billingStep, setBillingStep] = useState<'plans' | 'waiting' | 'success'>('plans');
  const [billingCheckoutContext, setBillingCheckoutContext] = useState<BillingCheckoutContext | null>(null);
  const [billingLatestOrder, setBillingLatestOrder] = useState<BillingOrder | null>(null);
  const [billingMembership, setBillingMembership] = useState<BillingMembership | null>(null);
  const [billingBusy, setBillingBusy] = useState(false);
  const [billingError, setBillingError] = useState('');
  const [billingDebug, setBillingDebug] = useState('');
  const [subscriptionPortalBusy, setSubscriptionPortalBusy] = useState(false);
  const [subscriptionPortalError, setSubscriptionPortalError] = useState('');
  const [aiRecallOpen, setAiRecallOpen] = useState(false);
  const [aiRecallQuery, setAiRecallQuery] = useState('');
  const [aiRecallBusy, setAiRecallBusy] = useState(false);
  const [aiRecallError, setAiRecallError] = useState('');
  const [aiRecallExpansion, setAiRecallExpansion] = useState<AiRecallExpansion | null>(null);
  const [aiRecallResults, setAiRecallResults] = useState<AiRecallResult[]>([]);
  const [aiOrganizeOpen, setAiOrganizeOpen] = useState(false);
  const [aiOrganizeScope, setAiOrganizeScope] = useState<AiOrganizeScope>('unclassified');
  const [aiOrganizeBusy, setAiOrganizeBusy] = useState(false);
  const [aiOrganizeError, setAiOrganizeError] = useState('');
  const [aiOrganizeProgress, setAiOrganizeProgress] = useState({ done: 0, total: 0 });
  const [aiOrganizeSuggestions, setAiOrganizeSuggestions] = useState<AiOrganizeSuggestionView[]>([]);
  const [aiOrganizeSelectedDomains, setAiOrganizeSelectedDomains] = useState<Set<string>>(new Set());
  const [aiOrganizeNewTags, setAiOrganizeNewTags] = useState<string[]>([]);
  const [aiOrganizeApprovedNewTags, setAiOrganizeApprovedNewTags] = useState<Set<string>>(new Set());
  const [aiOrganizeAppliedCount, setAiOrganizeAppliedCount] = useState(0);
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupNotice, setBackupNotice] = useState<null | { kind: 'export' } | { kind: 'restore'; history: number; sites: number; privateRecords: number }>(null);
  const [backupError, setBackupError] = useState('');
  const [backupCandidate, setBackupCandidate] = useState<BestHistoryBackupFile | null>(null);
  const [backupSummary, setBackupSummary] = useState<BackupSummary | null>(null);
  const [backupPassword, setBackupPassword] = useState('');
  const backupFileInput = useRef<HTMLInputElement | null>(null);
  const vaultAutoLock = useRef<VaultAutoLock | null>(null);
  const historyRefreshRequestId = useRef(0);

  useEffect(() => {
    void browserAdapter.readLocale().then((savedLocale) => {
      if (savedLocale) setLocale(savedLocale);
    });
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    void refreshHistoryRecords(true);
    void browserAdapter.readSiteProfiles().then(setProfiles);
  }, [locale]);

  useEffect(() => {
    const hasBlockingOverlay = Boolean(
      selectedDomain ||
      (backupCandidate && backupSummary) ||
      aiRecallOpen ||
      aiOrganizeOpen ||
      authModalOpen ||
      billingModalOpen ||
      privateProGateOpen ||
      vaultSetupOpen ||
      vaultUnlockOpen ||
      vaultResetOpen
    );

    if (!hasBlockingOverlay) return undefined;

    const body = document.body;
    const root = document.documentElement;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyOverscroll = body.style.overscrollBehavior;
    const previousRootOverscroll = root.style.overscrollBehavior;

    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';
    root.style.overscrollBehavior = 'none';

    return () => {
      body.style.overflow = previousBodyOverflow;
      body.style.overscrollBehavior = previousBodyOverscroll;
      root.style.overscrollBehavior = previousRootOverscroll;
    };
  }, [
    selectedDomain,
    backupCandidate,
    backupSummary,
    aiRecallOpen,
    aiOrganizeOpen,
    authModalOpen,
    billingModalOpen,
    privateProGateOpen,
    vaultSetupOpen,
    vaultUnlockOpen,
    vaultResetOpen,
  ]);

  useEffect(() => {
    if (!siteMenuDomain) return undefined;
    const closeMenu = () => setSiteMenuDomain(null);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };
    document.addEventListener('pointerdown', closeMenu);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeMenu);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [siteMenuDomain]);

  useEffect(() => {
    let refreshTimer: number | null = null;
    let disposed = false;

    const scheduleHistoryRefresh = (delay = 200) => {
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        refreshTimer = null;
        if (!disposed) void refreshHistoryRecords(false);
      }, delay);
    };
    const handleHistoryChanged = () => scheduleHistoryRefresh();
    const handleVisibilityChanged = () => {
      if (document.visibilityState === 'visible') scheduleHistoryRefresh(0);
    };
    const handleWindowFocus = () => scheduleHistoryRefresh(0);

    browser.history.onVisited.addListener(handleHistoryChanged);
    browser.history.onVisitRemoved.addListener(handleHistoryChanged);
    document.addEventListener('visibilitychange', handleVisibilityChanged);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      disposed = true;
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
      browser.history.onVisited.removeListener(handleHistoryChanged);
      browser.history.onVisitRemoved.removeListener(handleHistoryChanged);
      document.removeEventListener('visibilitychange', handleVisibilityChanged);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

  useEffect(() => {
    if (authStatus !== 'signedIn') return;

    let disposed = false;
    let timer: number | null = null;
    const deadline = Date.now() + 2 * 60 * 1000;

    const refreshPaymentState = async () => {
      try {
        const checkoutStatus = billingCheckoutContext?.transactionId
          ? await billingService.refreshCheckoutStatus(billingCheckoutContext.transactionId)
          : null;
        const [order, membership, nextEntitlement] = await Promise.all([
          billingService.getLatestOrder(),
          billingService.getMembership().catch(() => null),
          entitlementService.getCurrentEntitlement({ forceRefresh: true }),
        ]);
        if (disposed) return;
        setBillingLatestOrder(order);
        setBillingMembership(membership);
        setEntitlement(nextEntitlement);
        setEntitlementStatus('ready');
        setBillingDebug(JSON.stringify({
          at: new Date().toISOString(),
          transactionId: billingCheckoutContext?.transactionId || null,
          checkout: checkoutStatus,
          order: order ? {
            planId: order.planId,
            status: order.status,
            providerOrderId: order.providerOrderId,
            providerSubscriptionId: order.providerSubscriptionId,
          } : null,
          entitlement: {
            isPro: nextEntitlement.isPro,
            source: nextEntitlement.source,
            status: nextEntitlement.status,
            validUntil: nextEntitlement.validUntil,
          },
        }, null, 2));
        if (nextEntitlement.isPro && (nextEntitlement.source === 'payment' || nextEntitlement.source === 'lifetime')) {
          setBillingStep('success');
          window.setTimeout(() => setBillingModalOpen(false), 2400);
        }
      } catch (error) {
        if (!disposed) {
          setBillingDebug(JSON.stringify({
            at: new Date().toISOString(),
            transactionId: billingCheckoutContext?.transactionId || null,
            error: error instanceof Error ? error.message : String(error),
          }, null, 2));
        }
      }
    };

    const poll = async () => {
      await refreshPaymentState();
      if (
        !disposed
        && billingStep === 'waiting'
        && billingCheckoutContext?.transactionId
        && Date.now() < deadline
      ) {
        timer = window.setTimeout(() => void poll(), 5000);
      }
    };

    const onFocus = () => {
      if (billingModalOpen || billingStep === 'waiting') void refreshPaymentState();
    };
    const onMessage = (message: unknown) => {
      if (typeof message !== 'object' || message === null || !('type' in message)) return undefined;
      if (message.type === 'besthistory:payment-complete') return refreshPaymentState();
      if (message.type === 'besthistory:payment-canceled') {
        setBillingStep('plans');
        setBillingCheckoutContext(null);
        setBillingError('');
      }
      return undefined;
    };

    window.addEventListener('focus', onFocus);
    browser.runtime.onMessage.addListener(onMessage);
    if (billingStep === 'waiting' && billingCheckoutContext?.transactionId) void poll();

    return () => {
      disposed = true;
      if (timer !== null) window.clearTimeout(timer);
      window.removeEventListener('focus', onFocus);
      browser.runtime.onMessage.removeListener(onMessage);
    };
  }, [authStatus, billingModalOpen, billingStep, billingCheckoutContext?.transactionId]);

  useEffect(() => {
    if (authStatus !== 'signedIn') return;
    let disposed = false;

    void (async () => {
      try {
        const recentOrders = await billingService.getRecentOrders(5);
        let checkedOrder: BillingOrder | null = null;
        let checkoutStatus: BillingCheckoutStatus | null = null;
        for (const order of recentOrders) {
          if (!order.providerOrderId || !['created', 'checkout_open', 'paid'].includes(order.status)) continue;
          try {
            const status = await billingService.refreshCheckoutStatus(order.providerOrderId);
            checkedOrder = order;
            checkoutStatus = status;
            if (status.activated) break;
          } catch {
            // A stale/failed transaction must not block recovery of an older paid one.
          }
        }
        const [nextEntitlement, membership] = await Promise.all([
          entitlementService.getCurrentEntitlement({ forceRefresh: true }),
          billingService.getMembership().catch(() => null),
        ]);
        if (disposed) return;
        setBillingLatestOrder(recentOrders[0] || null);
        setBillingMembership(membership);
        setEntitlement(nextEntitlement);
        setEntitlementStatus('ready');
        setBillingDebug(JSON.stringify({
          at: new Date().toISOString(),
          trigger: 'startup-recovery',
          transactionId: checkedOrder?.providerOrderId || null,
          checkout: checkoutStatus,
          scannedTransactions: recentOrders.filter((order) => Boolean(order.providerOrderId)).length,
          entitlement: {
            isPro: nextEntitlement.isPro,
            source: nextEntitlement.source,
            status: nextEntitlement.status,
            validUntil: nextEntitlement.validUntil,
          },
        }, null, 2));
      } catch (error) {
        if (!disposed) {
          setBillingDebug(JSON.stringify({
            at: new Date().toISOString(),
            trigger: 'startup-recovery',
            error: error instanceof Error ? error.message : String(error),
          }, null, 2));
        }
      }
    })();

    return () => { disposed = true; };
  }, [authStatus]);

  useEffect(() => {
    if (authStatus !== 'signedIn') return;
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    if (payment !== 'success' && payment !== 'canceled') return;

    params.delete('payment');
    params.delete('transaction_id');
    const nextSearch = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`);

    if (payment === 'success') {
      setBillingStep('success');
      setBillingModalOpen(true);
      void Promise.all([
        entitlementService.getCurrentEntitlement({ forceRefresh: true }),
        billingService.getMembership().catch(() => null),
      ]).then(([nextEntitlement, membership]) => {
        setEntitlement(nextEntitlement);
        setBillingMembership(membership);
        setEntitlementStatus('ready');
      }).catch(() => undefined);
      window.setTimeout(() => setBillingModalOpen(false), 2200);
    } else {
      setBillingStep('plans');
      setBillingModalOpen(true);
    }
  }, [authStatus]);

  useEffect(() => {
    setVaultError('');
    setVaultResetError('');
    setAuthError('');
    setAuthNotice('');
    setBackupError('');
  }, [locale]);

  useEffect(() => { void refreshArchiveStatus(); }, []);

  useEffect(() => {
    let mounted = true;
    void authService.getCurrentAccount()
      .then((account) => {
        if (!mounted) return;
        setAuthAccount(account);
        setAuthStatus(account ? 'signedIn' : 'signedOut');
      })
      .catch(() => {
        if (!mounted) return;
        setAuthAccount(null);
        setAuthStatus('signedOut');
      });
    const unsubscribe = authService.subscribe((account) => {
      if (!mounted) return;
      setAuthAccount(account);
      setAuthStatus(account ? 'signedIn' : 'signedOut');
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (authStatus !== 'signedIn' || !authAccount) return;
    void authService.updateLanguage(locale).catch(() => {
      // Best-effort sync only; local BestHistory features must never depend on it.
    });
  }, [authStatus, authAccount?.id, locale]);

  useEffect(() => {
    if (authStatus !== 'signedIn' || !authAccount) {
      setEntitlement(null);
      setEntitlementStatus('idle');
      return;
    }
    let cancelled = false;
    setEntitlementStatus('loading');
    void entitlementService.getCurrentEntitlement()
      .then((value) => {
        if (cancelled) return;
        setEntitlement(value);
        setEntitlementStatus('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setEntitlement(null);
        setEntitlementStatus('error');
      });
    return () => { cancelled = true; };
  }, [authStatus, authAccount?.id]);

  useEffect(() => {
    const membershipBlocksPrivateMode = authStatus === 'signedOut'
      || (authStatus === 'signedIn' && entitlementStatus === 'ready' && !entitlement?.isPro);
    if (!vaultUnlocked || !membershipBlocksPrivateMode) return;
    lockPrivateVault();
    setSiteView('recent');
    setVaultSetupOpen(false);
    setVaultUnlockOpen(false);
    setPendingPrivateAction(null);
  }, [authStatus, entitlementStatus, entitlement?.isPro, vaultUnlocked]);

  useEffect(() => {
    if (privateProGateOpen && entitlementStatus === 'ready' && entitlement?.isPro) setPrivateProGateOpen(false);
  }, [privateProGateOpen, entitlementStatus, entitlement?.isPro]);

  useEffect(() => {
    if (authStatus !== 'signedIn') {
      setBillingLatestOrder(null);
      setBillingMembership(null);
      setBillingModalOpen(false);
      return;
    }
    void Promise.all([billingService.getLatestOrder(), billingService.getMembership()])
      .then(([order, membership]) => {
        setBillingLatestOrder(order);
        setBillingMembership(membership);
      })
      .catch(() => {
        setBillingLatestOrder(null);
        setBillingMembership(null);
      });
  }, [authStatus, authAccount?.id]);

  useEffect(() => {
    if (!authResendAt || authResendAt <= Date.now()) return undefined;
    setAuthClock(Date.now());
    const timer = window.setInterval(() => setAuthClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [authResendAt]);

  useEffect(() => {
    if (!authModalOpen) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !authBusy) setAuthModalOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [authModalOpen, authBusy]);

  useEffect(() => {
    vaultAutoLock.current?.dispose();
    vaultAutoLock.current = null;
    if (!vaultUnlocked) return undefined;
    const controller = new VaultAutoLock(vaultAutoLockSeconds, () => {
      browserAdapter.lockVault();
      setVaultUnlocked(false);
      setPrivateRecords([]);
    });
    controller.unlock();
    vaultAutoLock.current = controller;
    const touch = () => controller.touch();
    window.addEventListener('pointerdown', touch);
    window.addEventListener('keydown', touch);
    return () => {
      window.removeEventListener('pointerdown', touch);
      window.removeEventListener('keydown', touch);
      controller.dispose();
      vaultAutoLock.current = null;
    };
  }, [vaultUnlocked, vaultAutoLockSeconds]);

  function formatMembershipDate(value: string | null): string {
    if (!value) return '';
    return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value));
  }

  function paidPlanLabel(): string {
    if (billingMembership?.planId === 'pro_monthly') return t('accountPaidMonthly');
    if (billingMembership?.planId === 'pro_yearly') return t('accountPaidYearly');
    if (billingMembership?.planId === 'pro_lifetime' || entitlement?.source === 'lifetime') return t('accountPaidLifetime');
    return t('accountProPlan');
  }

  function paidValidityText(): string {
    if (billingMembership?.planId === 'pro_lifetime' || entitlement?.source === 'lifetime') return t('accountPaidPermanent');
    const until = entitlement?.validUntil || billingMembership?.currentPeriodEnd || null;
    if (!entitlement?.isPro && until) return t('accountPaidExpiredOn').replace('{date}', formatMembershipDate(until));
    return until ? t('accountPaidUntil').replace('{date}', formatMembershipDate(until)) : t('accountPaidActive');
  }

  function paidRenewalText(): string {
    if (!entitlement?.isPro && entitlement?.source === 'payment') return t('accountPaidEnded');
    if (billingMembership?.planId === 'pro_lifetime' || entitlement?.source === 'lifetime') return t('accountPaidNoRenewal');
    if (entitlement?.status === 'past_due') {
      return entitlement.graceUntil
        ? t('accountPaidPastDueUntil').replace('{date}', formatMembershipDate(entitlement.graceUntil))
        : t('accountPaidPastDue');
    }
    if (billingMembership?.cancelAtPeriodEnd || billingMembership?.status === 'canceled') return t('accountPaidRenewalCanceled');
    if (!billingMembership || billingMembership.status === 'unknown') return t('accountPaidRenewalUnknown');
    return t('accountPaidAutoRenew');
  }

  function openBillingPreview() {
    setBillingError('');
    setBillingStep('plans');
    setBillingCheckoutContext(null);
    setBillingDebug('');
    setBillingModalOpen(true);
  }

  function closeBillingPreview() {
    if (billingBusy) return;
    setBillingModalOpen(false);
    setBillingError('');
  }

  async function openSubscriptionPortal() {
    if (subscriptionPortalBusy) return;
    setSubscriptionPortalBusy(true);
    setSubscriptionPortalError('');
    try {
      await billingService.openSubscriptionPortal();
    } catch (error) {
      console.error('openSubscriptionPortal', error);
      setSubscriptionPortalError(t('accountManageSubscriptionError'));
    } finally {
      setSubscriptionPortalBusy(false);
    }
  }

  async function startCheckout(planId: BillingPlanId) {
    setBillingBusy(true);
    setBillingError('');
    setBillingDebug('');
    try {
      const checkout = await billingService.createCheckout(planId, locale);
      setBillingCheckoutContext(checkout);
      setBillingStep('waiting');
      await billingService.openCheckoutPopup(checkout.checkoutUrl);
    } catch (error) {
      setBillingDebug(JSON.stringify({
        at: new Date().toISOString(),
        planId,
        error: error instanceof Error ? error.message : String(error),
      }, null, 2));
      setBillingError(t('billingError'));
    } finally {
      setBillingBusy(false);
    }
  }

  async function refreshHistoryRecords(showLoading = false) {
    const requestId = ++historyRefreshRequestId.current;
    if (showLoading) setStatus('loading');
    try {
      const items = await browserAdapter.readRecentHistory();
      if (requestId !== historyRefreshRequestId.current) return;
      setRecords(items);
      setStatus('ready');
    } catch {
      if (requestId === historyRefreshRequestId.current) setStatus('error');
    }
  }

  async function refreshArchiveStatus() {
    try {
      const [captureEnabled, incognitoAllowed, vault] = await Promise.all([
        browserAdapter.readIncognitoCaptureEnabled(),
        browserAdapter.isAllowedIncognitoAccess(),
        browserAdapter.readVaultStatus(),
      ]);
      setIncognitoCaptureEnabled(captureEnabled);
      setIncognitoAccessAllowed(incognitoAllowed);
      setVaultConfigured(vault.configured);
      setVaultUnlocked(vault.unlocked);
      setVaultAutoLockSeconds(vault.autoLockSeconds);
      setPrivateRecords(vault.unlocked ? await browserAdapter.readPrivateHistory() : []);
    } catch { setPrivateRecords([]); }
  }

  const privateAccessState = authStatus === 'loading'
    ? 'checking'
    : authStatus !== 'signedIn' || !authAccount
      ? 'signedOut'
      : entitlementStatus === 'loading' || entitlementStatus === 'idle'
        ? 'checking'
        : entitlementStatus === 'error'
          ? 'unavailable'
          : entitlement?.isPro
            ? 'pro'
            : entitlement?.plan === 'pro'
              ? 'expired'
              : 'free';
  const privateProAccessReady = privateAccessState === 'pro';

  function requirePrivateProAccess(): boolean {
    if (privateProAccessReady) return true;
    setPrivateProGateOpen(true);
    return false;
  }

  async function setupVault() {
    if (!requirePrivateProAccess()) return;
    setVaultError('');
    if (vaultPassword.length < 8) { setVaultError(t('vaultPasswordShort')); return; }
    if (vaultPassword !== vaultConfirmPassword) { setVaultError(t('vaultPasswordMismatch')); return; }
    setArchiveLoading(true);
    try {
      await browserAdapter.setupVault(vaultPassword);
      await browserAdapter.saveVaultAutoLock(vaultAutoLockSeconds);
      if (pendingPrivateAction?.kind === 'site') {
        await browserAdapter.addPrivateDomain(pendingPrivateAction.domain, pendingPrivateAction.records);
        setRecords(await browserAdapter.readRecentHistory());
        if (pendingPrivateAction.closeDetails) closeSiteDetails();
      } else if (pendingPrivateAction?.kind === 'page') {
        await browserAdapter.addPrivatePage(pendingPrivateAction.record);
        setRecords(await browserAdapter.readRecentHistory());
      }
      setPendingPrivateAction(null);
      setVaultPassword('');
      setVaultConfirmPassword('');
      setVaultSetupOpen(false);
      await refreshArchiveStatus();
    } catch {
      setVaultError(t('vaultWrongPassword'));
    } finally {
      setArchiveLoading(false);
    }
  }

  async function unlockPrivateVault() {
    if (!requirePrivateProAccess()) return;
    setVaultError('');
    setArchiveLoading(true);
    try {
      await browserAdapter.unlockVault(vaultPassword);
      setVaultPassword('');
      setVaultUnlockOpen(false);
      await refreshArchiveStatus();
    } catch {
      setVaultError(t('vaultWrongPassword'));
    } finally {
      setArchiveLoading(false);
    }
  }

  function lockPrivateVault() {
    browserAdapter.lockVault();
    setVaultUnlocked(false);
    setPrivateRecords([]);
    setVaultPassword('');
  }

  async function openPrivateRecord(url: string) {
    if (!requirePrivateProAccess()) {
      lockPrivateVault();
      setSiteView('recent');
      return;
    }
    if (incognitoAccessAllowed === false) {
      if (window.confirm(t('privateOpenNeedsIncognito'))) await browserAdapter.openExtensionDetails();
      return;
    }
    try {
      await browserAdapter.openPrivateUrl(url);
      lockPrivateVault();
      setSiteView('recent');
    } catch {
      setIncognitoAccessAllowed(false);
      if (window.confirm(t('privateOpenNeedsIncognito'))) await browserAdapter.openExtensionDetails();
    }
  }

  async function changeVaultAutoLock(value: string) {
    if (!requirePrivateProAccess()) return;
    const seconds = Number(value) as VaultAutoLockSeconds;
    setVaultAutoLockSeconds(seconds);
    vaultAutoLock.current?.setSeconds(seconds);
    await browserAdapter.saveVaultAutoLock(seconds);
  }

  function openVaultReset() {
    setVaultResetOpen(true);
    setVaultResetInput('');
    setVaultResetError('');
    setVaultError('');
  }

  function closeVaultReset() {
    setVaultResetOpen(false);
    setVaultResetInput('');
    setVaultResetError('');
  }

  async function destroyAndResetVault() {
    if (vaultResetInput.trim() !== t('vaultResetPhrase')) {
      setVaultResetError(t('vaultResetMismatch'));
      return;
    }
    setArchiveLoading(true);
    setVaultResetError('');
    try {
      await browserAdapter.destroyVault();
      setVaultPassword('');
      setVaultConfirmPassword('');
      setVaultResetOpen(false);
      setVaultResetInput('');
      setPrivateRecords([]);
      await refreshArchiveStatus();
    } finally {
      setArchiveLoading(false);
    }
  }

  async function togglePrivateMode() {
    if (vaultUnlocked) { lockPrivateVault(); setSiteView('recent'); return; }
    if (!requirePrivateProAccess()) return;
    if (!vaultConfigured) {
      setVaultError('');
      setVaultPassword('');
      setVaultConfirmPassword('');
      setVaultAutoLockSeconds(30);
      setPendingPrivateAction(null);
      setVaultSetupOpen(true);
      return;
    }
    setVaultError('');
    await refreshArchiveStatus();
    setVaultUnlockOpen(true);
  }

  async function toggleIncognitoCapture() {
    if (!requirePrivateProAccess()) return;
    const next = !incognitoCaptureEnabled;
    setIncognitoCaptureEnabled(next);
    await browserAdapter.saveIncognitoCaptureEnabled(next);
    await refreshArchiveStatus();
  }

  async function submitPasswordChange() {
    if (!requirePrivateProAccess()) return;
    setVaultError('');
    setPasswordChanged(false);
    if (newVaultPassword.length < 8) { setVaultError(t('vaultPasswordShort')); return; }
    if (newVaultPassword !== newVaultConfirmPassword) { setVaultError(t('vaultPasswordMismatch')); return; }
    setArchiveLoading(true);
    try {
      await browserAdapter.changeVaultPassword(currentVaultPassword, newVaultPassword);
      setCurrentVaultPassword(''); setNewVaultPassword(''); setNewVaultConfirmPassword('');
      setChangePasswordOpen(false); setPasswordChanged(true);
      await refreshArchiveStatus();
    } catch { setVaultError(t('vaultWrongPassword')); }
    finally { setArchiveLoading(false); }
  }

  useEffect(() => {
    if (!pendingDelete) return undefined;
    const tick = window.setInterval(() => setDeleteClock(Date.now()), 250);
    const execute = window.setTimeout(() => {
      void browserAdapter.deleteHistoryUrls(pendingDelete.urls).then(async () => {
        setRecords(await browserAdapter.readRecentHistory());
        setPendingDelete(null);
      });
    }, Math.max(0, pendingDelete.executeAt - Date.now()));
    return () => { window.clearInterval(tick); window.clearTimeout(execute); };
  }, [pendingDelete]);

  function requireAiProAccess(onReady: () => void) {
    if (authStatus !== 'signedIn') {
      openAuthModal(false);
      return;
    }
    if (entitlementStatus === 'loading' || entitlementStatus === 'idle') return;
    if (!entitlement?.isPro) {
      openBillingPreview();
      return;
    }
    onReady();
  }

  function openAiRecall() {
    requireAiProAccess(() => {
      setAiRecallError('');
      setAiRecallOpen(true);
    });
  }

  async function runAiRecall() {
    const recall = aiRecallQuery.trim();
    if (recall.length < 2 || aiRecallBusy) return;
    setAiRecallBusy(true);
    setAiRecallError('');
    setAiRecallExpansion(null);
    setAiRecallResults([]);
    try {
      const expansion = await aiService.expandRecall({
        query: recall,
        locale,
        existingTags: availableTags.slice(0, 60),
        localHints: buildRecallLocalHints(recall, records, 12),
      });
      setAiRecallExpansion(expansion);
      setAiRecallResults(searchRecallCandidates(recall, expansion, records, profiles, 20));
    } catch {
      setAiRecallError(t('aiProviderUnavailable'));
    } finally {
      setAiRecallBusy(false);
    }
  }

  function aiRecallReasonLabel(reason: AiRecallResult['reasons'][number]): string {
    if (reason === 'domain') return t('aiRecallMatchDomain');
    if (reason === 'tag') return t('aiRecallMatchTag');
    if (reason === 'time') return t('aiRecallMatchTime');
    return t('aiRecallMatchKeyword');
  }

  function getAiOrganizeTargets(scope: AiOrganizeScope) {
    const publicSites = websites.filter((site) => !profiles[site.domain]?.hidden && !privateDomains.has(site.domain));
    if (scope === 'unclassified') return publicSites.filter((site) => !(profiles[site.domain]?.tags.length));
    if (scope === 'current') {
      const currentDomains = new Set(filtered.map((site) => site.domain));
      return publicSites.filter((site) => currentDomains.has(site.domain));
    }
    return publicSites;
  }

  function openAiOrganize() {
    requireAiProAccess(() => {
      setAiOrganizeError('');
      setAiOrganizeAppliedCount(0);
      setAiOrganizeSuggestions([]);
      setAiOrganizeSelectedDomains(new Set());
      setAiOrganizeNewTags([]);
      setAiOrganizeApprovedNewTags(new Set());
      setAiOrganizeProgress({ done: 0, total: 0 });
      setAiOrganizeOpen(true);
    });
  }

  function normalizeAiSuggestions(raw: AiOrganizeWebsiteSuggestion[], existingTags: string[]): AiOrganizeSuggestionView[] {
    const existingByLower = new Map(existingTags.map((tag) => [tag.toLocaleLowerCase(), tag]));
    const newCanonical = new Map<string, string>();
    const out: AiOrganizeSuggestionView[] = [];
    for (const item of raw) {
      const domain = item.domain.trim().toLocaleLowerCase();
      if (!domain) continue;
      const current = profiles[domain]?.tags || [];
      const currentLower = new Set(current.map((tag) => tag.toLocaleLowerCase()));
      const tags: string[] = [];
      for (const rawTag of normalizeSiteTags(item.suggestedTags || [])) {
        const lower = rawTag.toLocaleLowerCase();
        if (currentLower.has(lower)) continue;
        const existing = existingByLower.get(lower);
        if (existing) {
          if (!tags.some((tag) => tag.toLocaleLowerCase() === lower)) tags.push(existing);
          continue;
        }
        if (!newCanonical.has(lower) && newCanonical.size >= 5) continue;
        if (!newCanonical.has(lower)) newCanonical.set(lower, rawTag);
        const canonical = newCanonical.get(lower)!;
        if (!tags.some((tag) => tag.toLocaleLowerCase() === lower)) tags.push(canonical);
      }
      if (tags.length) out.push({ domain, suggestedTags: tags.slice(0, 3) });
    }
    return out;
  }

  async function runAiOrganize() {
    if (aiOrganizeBusy) return;
    const targets = getAiOrganizeTargets(aiOrganizeScope);
    const batchSize = 20;
    const maxAttempts = 3;
    const all: AiOrganizeWebsiteSuggestion[] = [];
    const workingTags = [...availableTags];

    const publishSuggestions = () => {
      const normalized = normalizeAiSuggestions(all, availableTags);
      const existingLower = new Set(availableTags.map((tag) => tag.toLocaleLowerCase()));
      const newTags = [...new Set(normalized.flatMap((item) => item.suggestedTags).filter((tag) => !existingLower.has(tag.toLocaleLowerCase())))];
      setAiOrganizeSuggestions(normalized);
      setAiOrganizeSelectedDomains(new Set(normalized.map((item) => item.domain)));
      setAiOrganizeNewTags(newTags);
      setAiOrganizeApprovedNewTags(new Set(newTags));
    };

    setAiOrganizeBusy(true);
    setAiOrganizeError('');
    setAiOrganizeAppliedCount(0);
    setAiOrganizeSuggestions([]);
    setAiOrganizeProgress({ done: 0, total: targets.length });

    try {
      for (let index = 0; index < targets.length; index += batchSize) {
        const chunk = targets.slice(index, index + batchSize);
        let suggestions: AiOrganizeWebsiteSuggestion[] | null = null;
        let lastError: unknown = null;

        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
          try {
            suggestions = await aiService.organizeWebsites({
              locale,
              existingTags: workingTags.slice(0, 80),
              sites: chunk.map((site) => ({
                domain: site.domain,
                displayName: profiles[site.domain]?.customName || site.displayName,
                currentTags: profiles[site.domain]?.tags || [],
                recentTitles: records
                  .filter((record) => getDomain(record.url) === site.domain)
                  .sort((a, b) => b.lastVisitTime - a.lastVisitTime)
                  .slice(0, 5)
                  .map((record) => record.title || site.domain),
                visitCount: site.visitCount,
                pageCount: site.pageCount,
              })),
            });
            break;
          } catch (error) {
            lastError = error;
            if (attempt < maxAttempts) {
              await new Promise((resolve) => window.setTimeout(resolve, attempt * 1200));
            }
          }
        }

        if (!suggestions) throw lastError || new Error('AI_ORGANIZE_BATCH_FAILED');

        all.push(...suggestions);
        for (const tag of suggestions.flatMap((item) => item.suggestedTags || [])) {
          if (!workingTags.some((current) => current.toLocaleLowerCase() === tag.toLocaleLowerCase())) workingTags.push(tag);
        }

        setAiOrganizeProgress({
          done: Math.min(targets.length, index + chunk.length),
          total: targets.length,
        });

        // Preserve every successful batch so a later failure does not discard earlier work.
        publishSuggestions();
      }

      publishSuggestions();
    } catch {
      if (all.length) publishSuggestions();
      setAiOrganizeError(t('aiProviderUnavailable'));
    } finally {
      setAiOrganizeBusy(false);
    }
  }

  async function applyAiOrganizeSuggestions() {
    if (!aiOrganizeSelectedDomains.size) return;
    const existingLower = new Set(availableTags.map((tag) => tag.toLocaleLowerCase()));
    const approvedNewLower = new Set([...aiOrganizeApprovedNewTags].map((tag) => tag.toLocaleLowerCase()));
    const next: SiteProfileMap = { ...profiles };
    let changed = 0;
    for (const suggestion of aiOrganizeSuggestions) {
      if (!aiOrganizeSelectedDomains.has(suggestion.domain)) continue;
      const profile = next[suggestion.domain] || createSiteProfile(suggestion.domain);
      const additions = suggestion.suggestedTags.filter((tag) => existingLower.has(tag.toLocaleLowerCase()) || approvedNewLower.has(tag.toLocaleLowerCase()));
      const merged = normalizeSiteTags([...profile.tags, ...additions]);
      if (merged.join('\u0000') === profile.tags.join('\u0000')) continue;
      next[suggestion.domain] = { ...profile, tags: merged, updatedAt: Date.now() };
      changed += 1;
    }
    if (!changed) return;
    setProfiles(await browserAdapter.saveSiteProfiles(next));
    setAiOrganizeAppliedCount(changed);
  }

  async function changeLocale(nextLocale: Locale) {
    setLocale(nextLocale);
    await browserAdapter.saveLocale(nextLocale);
  }

  const displayRecords = useMemo(() => {
    if (!vaultUnlocked) return records;
    const merged = new Map(records.map((record) => [record.url, record]));
    for (const record of privateRecords) merged.set(record.url, record);
    return [...merged.values()];
  }, [privateRecords, records, vaultUnlocked]);
  const privateDomains = useMemo(() => new Set(privateRecords.map((record) => getDomain(record.url)).filter(Boolean)), [privateRecords]);
  const websites = useMemo(() => aggregateWebsites(displayRecords), [displayRecords]);
  const tagUsage = useMemo(() => {
    const counts = new Map<string, number>();
    for (const profile of Object.values(profiles)) for (const tag of profile.tags) counts.set(tag, (counts.get(tag) || 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], locale));
  }, [locale, profiles]);
  const availableTags = useMemo(() => tagUsage.map(([tag]) => tag), [tagUsage]);
  const pageMatchByDomain = useMemo(() => {
    const term = normalizeSearchText(query.trim());
    const matches = new Map<string, HistoryRecord>();
    if (!term) return matches;
    for (const record of [...displayRecords].sort((a, b) => b.lastVisitTime - a.lastVisitTime)) {
      const domain = getDomain(record.url);
      if (domain && !matches.has(domain) && normalizeSearchText(`${record.title} ${record.url}`).includes(term)) matches.set(domain, record);
    }
    return matches;
  }, [displayRecords, query]);
  const pageTitleMatchDomains = useMemo(() => new Set(pageMatchByDomain.keys()), [pageMatchByDomain]);
  const filtered = useMemo(() => {
    const term = normalizeSearchText(query.trim());
    return websites
      .filter((site) => {
        const profile = profiles[site.domain];
        if (siteView === 'private') return privateDomains.has(site.domain);
        if (siteView === 'hidden') return Boolean(profile?.hidden);
        if (profile?.hidden) return false;
        if (siteView === 'pinned') return Boolean(profile?.pinned);
        if (siteView === 'unorganized') return !profile?.customName && !profile?.note && !(profile?.tags.length);
        return true;
      })
      .filter((site) => [...selectedTagFilters].every((tag) => profiles[site.domain]?.tags.includes(tag)))
      .filter((site) => !term || [site.domain, site.displayName, site.sampleTitle, profiles[site.domain]?.customName || '', profiles[site.domain]?.note || '', ...(profiles[site.domain]?.tags || [])].some((value) => normalizeSearchText(value).includes(term)) || pageTitleMatchDomains.has(site.domain))
      .sort((a, b) => {
        const pinnedPriority = Number(Boolean(profiles[b.domain]?.pinned)) - Number(Boolean(profiles[a.domain]?.pinned));
        if (pinnedPriority) return pinnedPriority;
        if (siteView === 'frequent') return b.visitCount - a.visitCount || b.lastVisitTime - a.lastVisitTime;
        if (siteView === 'all') {
          const aName = profiles[a.domain]?.customName || a.displayName;
          const bName = profiles[b.domain]?.customName || b.displayName;
          return aName.localeCompare(bName, locale, { sensitivity: 'base' }) || b.lastVisitTime - a.lastVisitTime;
        }
        return b.lastVisitTime - a.lastVisitTime;
      });
  }, [locale, pageTitleMatchDomains, privateDomains, profiles, query, selectedTagFilters, siteView, websites]);

  const wastebasketPublicWebsites = useMemo(
    () => websites.filter((site) => Boolean(profiles[site.domain]?.hidden) && !privateDomains.has(site.domain)),
    [privateDomains, profiles, websites],
  );

  const selectedSite = selectedDomain ? websites.find((site) => site.domain === selectedDomain) : undefined;
  const selectedSiteHomeUrl = selectedSite ? getWebsiteHomeUrl(selectedSite.url) : '';
  const selectedSiteRecords = selectedDomain
    ? displayRecords.filter((record) => getDomain(record.url) === selectedDomain).sort((a, b) => b.lastVisitTime - a.lastVisitTime)
    : [];
  const normalizedDetailQuery = normalizeSearchText(detailQuery.trim());
  const matchingSelectedPages = normalizedDetailQuery
    ? selectedSiteRecords.filter((record) => normalizeSearchText(`${record.title} ${record.url}`).includes(normalizedDetailQuery))
    : selectedSiteRecords;
  const selectedPages = matchingSelectedPages.slice(0, detailPageLimit);

  const timelineDomains = useMemo(() => [...new Set(displayRecords.map((record) => getDomain(record.url)).filter((domain): domain is string => Boolean(domain)))].sort((a, b) => a.localeCompare(b, locale)), [displayRecords, locale]);
  const timelineRunIds = useMemo(() => {
    const result = new Map<string, string>();
    let previousDomain = '';
    let previousDate = '';
    let runNumber = 0;
    for (const record of [...displayRecords].sort((a, b) => b.lastVisitTime - a.lastVisitTime)) {
      const domain = getDomain(record.url) || '';
      const day = dateKey(record.lastVisitTime);
      if (domain !== previousDomain || day !== previousDate) runNumber += 1;
      result.set(record.id, `${day}:${runNumber}:${domain}`);
      previousDomain = domain;
      previousDate = day;
    }
    return result;
  }, [displayRecords]);

  function openSiteDetails(domain: string, carrySearch = false) {
    setSelectedDomain(domain);
    setProfileDraft(profiles[domain] || createSiteProfile(domain));
    setProfileSaved(false);
    setHomepageCopied(false);
    setDetailPageLimit(20);
    setDetailQuery(carrySearch ? query.trim() : '');
    setTagInput('');
  }

  const websitePageSize = 60;
  const websitePageCount = Math.max(1, Math.ceil(filtered.length / websitePageSize));
  const visibleWebsites = filtered.slice((websitePage - 1) * websitePageSize, websitePage * websitePageSize);
  const siteViewTitle: Record<SiteView, string> = {
    all: t('nameOrder'),
    recent: t('recentSites'),
    frequent: t('frequentView'),
    pinned: t('pinnedView'),
    unorganized: t('unorganizedView'),
    hidden: t('hiddenView'),
    private: t('privateSites'),
  };

  useEffect(() => {
    setWebsitePage(1);
  }, [query, selectedTagFilters, siteView]);

  useEffect(() => {
    if (websitePage > websitePageCount) setWebsitePage(websitePageCount);
  }, [websitePage, websitePageCount]);

  function closeSiteDetails() {
    setSelectedDomain(null);
    setProfileDraft(null);
    setProfileSaved(false);
    setHomepageCopied(false);
    setDetailQuery('');
  }

  async function copySelectedHomepage() {
    if (!selectedSiteHomeUrl) return;
    try {
      await navigator.clipboard.writeText(selectedSiteHomeUrl);
      setHomepageCopied(true);
      window.setTimeout(() => setHomepageCopied(false), 1600);
    } catch {
      setHomepageCopied(false);
    }
  }

  async function saveProfile() {
    if (!profileDraft) return;
    const nextProfile = { ...profileDraft, updatedAt: Date.now() };
    const next = await browserAdapter.saveSiteProfile(nextProfile);
    setProfiles(next);
    setProfileDraft(nextProfile);
    setProfileSaved(true);
  }

  async function setWebsiteHidden(profile: SiteProfile, hidden: boolean) {
    const nextProfile = { ...profile, hidden, updatedAt: Date.now() };
    setProfiles(await browserAdapter.saveSiteProfile(nextProfile));
    return nextProfile;
  }

  async function toggleSiteHidden() {
    if (!profileDraft) return;
    await setWebsiteHidden(profileDraft, !profileDraft.hidden);
    closeSiteDetails();
  }

  async function toggleCardHidden(domain: string) {
    const profile = profiles[domain] || createSiteProfile(domain);
    setSiteMenuDomain(null);
    await setWebsiteHidden(profile, !profile.hidden);
  }

  async function toggleCardPinned(domain: string) {
    const profile = profiles[domain] || createSiteProfile(domain);
    const nextProfile = { ...profile, pinned: !profile.pinned, updatedAt: Date.now() };
    setSiteMenuDomain(null);
    setProfiles(await browserAdapter.saveSiteProfile(nextProfile));
  }

  async function deleteSelectedWastebasketSite() {
    if (!selectedDomain || !profileDraft?.hidden || privateDomains.has(selectedDomain)) return;
    const message = t('deleteWastebasketSiteConfirm')
      .replace('{site}', profileDraft.customName || selectedSite?.displayName || selectedDomain);
    if (!window.confirm(message)) return;
    setProfiles(await browserAdapter.deleteWebsites([selectedDomain]));
    setRecords(await browserAdapter.readRecentHistory());
    closeSiteDetails();
  }

  async function clearWastebasket() {
    if (!wastebasketPublicWebsites.length) return;
    const domains = wastebasketPublicWebsites.map((site) => site.domain);
    const message = t('clearWastebasketConfirm')
      .replace('{sites}', domains.length.toLocaleString(locale));
    if (!window.confirm(message)) return;
    setProfiles(await browserAdapter.deleteWebsites(domains));
    setRecords(await browserAdapter.readRecentHistory());
    setWebsitePage(1);
  }

  function addTags(raw: string) {
    if (!profileDraft) return;
    const incoming = raw.split(/[,，;；、\n]+/u).map((tag) => tag.trim().slice(0, MAX_TAG_LENGTH)).filter(Boolean);
    const next = [...profileDraft.tags];
    for (const tag of incoming) {
      if (next.length >= MAX_SITE_TAGS) break;
      if (!next.some((existing) => existing.toLocaleLowerCase() === tag.toLocaleLowerCase())) next.push(tag);
    }
    setProfileDraft({ ...profileDraft, tags: next });
    setTagInput('');
  }

  function removeTag(tag: string) {
    if (!profileDraft) return;
    setProfileDraft({ ...profileDraft, tags: profileDraft.tags.filter((item) => item !== tag) });
  }

  function toggleTagFilter(tag: string) {
    setSelectedTagFilters((current) => {
      const next = new Set(current);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
  }

  async function replaceGlobalTag(source: string, target: string) {
    const normalizedTarget = target.trim().slice(0, MAX_TAG_LENGTH);
    if (!normalizedTarget || source === normalizedTarget) return;
    const next = Object.fromEntries(Object.entries(profiles).map(([domain, profile]) => [domain, {
      ...profile,
      tags: [...new Set(profile.tags.map((tag) => tag === source ? normalizedTarget : tag))].slice(0, MAX_SITE_TAGS),
      updatedAt: profile.tags.includes(source) ? Date.now() : profile.updatedAt,
    }])) as SiteProfileMap;
    setProfiles(await browserAdapter.saveSiteProfiles(next));
    setTagRenameDrafts((current) => ({ ...current, [source]: '' }));
  }

  async function deleteGlobalTag(tag: string) {
    if (!window.confirm(t('deleteTagConfirm').replace('{tag}', tag))) return;
    const next = Object.fromEntries(Object.entries(profiles).map(([domain, profile]) => [domain, {
      ...profile,
      tags: profile.tags.filter((item) => item !== tag),
      updatedAt: profile.tags.includes(tag) ? Date.now() : profile.updatedAt,
    }])) as SiteProfileMap;
    setProfiles(await browserAdapter.saveSiteProfiles(next));
    setSelectedTagFilters((current) => new Set([...current].filter((item) => item !== tag)));
  }

  const batchVisibleWebsites = useMemo(() => {
    const term = normalizeSearchText(batchSiteQuery.trim());
    return websites.filter((site) => !term || normalizeSearchText(`${site.displayName} ${site.domain} ${profiles[site.domain]?.customName || ''}`).includes(term));
  }, [batchSiteQuery, profiles, websites]);

  async function applyBatchTag() {
    const tag = batchTag.trim().slice(0, MAX_TAG_LENGTH);
    if (!tag || !batchSelectedDomains.size) return;
    const next = { ...profiles };
    for (const domain of batchSelectedDomains) {
      const profile = next[domain] || createSiteProfile(domain);
      next[domain] = { ...profile, tags: profile.tags.some((item) => item.toLocaleLowerCase() === tag.toLocaleLowerCase()) || profile.tags.length >= MAX_SITE_TAGS ? profile.tags : [...profile.tags, tag], updatedAt: Date.now() };
    }
    setProfiles(await browserAdapter.saveSiteProfiles(next));
    setBatchSelectedDomains(new Set());
    setBatchTag('');
  }

  const timelineGroups = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86_400_000;
    const weekStart = todayStart - 6 * 86_400_000;
    const customStart = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const customEnd = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;
    const term = normalizeSearchText(query.trim());
    const visible = displayRecords
      .filter((record) => {
        if (timelineRange === 'today') return record.lastVisitTime >= todayStart;
        if (timelineRange === 'yesterday') return record.lastVisitTime >= yesterdayStart && record.lastVisitTime < todayStart;
        if (timelineRange === 'week') return record.lastVisitTime >= weekStart;
        return true;
      })
      .filter((record) => customStart === null || record.lastVisitTime >= customStart)
      .filter((record) => customEnd === null || record.lastVisitTime <= customEnd)
      .filter((record) => hourFilter === 'all' || new Date(record.lastVisitTime).getHours() === Number(hourFilter))
      .filter((record) => domainFilter === 'all' || getDomain(record.url) === domainFilter)
      .filter((record) => !term || normalizeSearchText(`${record.title} ${record.url}`).includes(term))
      .sort((a, b) => b.lastVisitTime - a.lastVisitTime)
      .slice(0, 500);

    const groups = new Map<string, HistoryRecord[]>();
    for (const record of visible) {
      const key = dateKey(record.lastVisitTime);
      groups.set(key, [...(groups.get(key) || []), record]);
    }
    return [...groups.values()];
  }, [dateFrom, dateTo, displayRecords, domainFilter, hourFilter, query, timelineRange]);

  async function addSiteToPrivate(domain: string, siteRecords: HistoryRecord[], closeDetailsAfter: boolean) {
    if (!requirePrivateProAccess()) return;
    if (!vaultConfigured) {
      setVaultError('');
      setVaultPassword('');
      setVaultConfirmPassword('');
      setVaultAutoLockSeconds(30);
      setPendingPrivateAction({ kind: 'site', domain, records: siteRecords, closeDetails: closeDetailsAfter });
      setVaultSetupOpen(true);
      return;
    }
    if (!vaultUnlocked) { setVaultUnlockOpen(true); return; }
    await browserAdapter.addPrivateDomain(domain, siteRecords);
    setRecords(await browserAdapter.readRecentHistory());
    await refreshArchiveStatus();
    if (closeDetailsAfter) closeSiteDetails();
  }

  async function addSelectedSiteToPrivate() {
    if (!selectedDomain) return;
    await addSiteToPrivate(selectedDomain, selectedSiteRecords, true);
  }

  async function addCardSiteToPrivate(domain: string) {
    const siteRecords = displayRecords
      .filter((record) => getDomain(record.url) === domain)
      .sort((a, b) => b.lastVisitTime - a.lastVisitTime);
    setSiteMenuDomain(null);
    await addSiteToPrivate(domain, siteRecords, false);
  }

  async function addPageToPrivate(record: HistoryRecord) {
    if (!requirePrivateProAccess()) return;
    if (!vaultConfigured) {
      setVaultError('');
      setVaultPassword('');
      setVaultConfirmPassword('');
      setVaultAutoLockSeconds(30);
      setPendingPrivateAction({ kind: 'page', record });
      setVaultSetupOpen(true);
      return;
    }
    if (!vaultUnlocked) { setVaultUnlockOpen(true); return; }
    await browserAdapter.addPrivatePage(record);
    setRecords(await browserAdapter.readRecentHistory());
    await refreshArchiveStatus();
  }

  async function deleteSelectedPrivateSite() {
    if (!selectedDomain || !window.confirm(t('privateDeleteConfirm'))) return;
    await browserAdapter.deletePrivateDomain(selectedDomain);
    setRecords(await browserAdapter.readRecentHistory());
    await refreshArchiveStatus();
    closeSiteDetails();
  }

  async function deletePrivatePage(record: HistoryRecord) {
    if (!window.confirm(t('privateDeleteConfirm'))) return;
    await browserAdapter.deletePrivatePage(record.url);
    setRecords(await browserAdapter.readRecentHistory());
    await refreshArchiveStatus();
  }

  const timelineTotal = timelineGroups.reduce((sum, group) => sum + group.length, 0);
  const timelineRecords = timelineGroups.flat();
  const hasTimelineFilters = Boolean(dateFrom || dateTo || hourFilter !== 'all' || domainFilter !== 'all');

  function clearTimelineFilters() {
    setDateFrom('');
    setDateTo('');
    setHourFilter('all');
    setDomainFilter('all');
  }

  function toggleTimelineRun(runId: string) {
    setExpandedTimelineRuns((current) => {
      const next = new Set(current);
      next.has(runId) ? next.delete(runId) : next.add(runId);
      return next;
    });
  }

  function toggleTimelineRunSelection(recordsInRun: HistoryRecord[]) {
    setSelectedUrls((current) => {
      const next = new Set(current);
      const allSelected = recordsInRun.every((record) => next.has(record.url));
      for (const record of recordsInRun) allSelected ? next.delete(record.url) : next.add(record.url);
      return next;
    });
  }

  function exportTimeline() {
    const rows = [['visited_at', 'title', 'url', 'visit_count'], ...timelineRecords.map((record) => [new Date(record.lastVisitTime).toISOString(), record.title, record.url, String(record.visitCount)])];
    const csv = '\uFEFF' + rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `besthistory-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function exportFullBackup() {
    setBackupBusy(true);
    setBackupError('');
    setBackupNotice(null);
    try {
      const backup = await browserAdapter.createBackup();
      const url = URL.createObjectURL(new Blob([JSON.stringify(backup)], { type: 'application/json;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `besthistory-backup-${new Date(backup.createdAt).toISOString().slice(0, 10)}.bhbackup`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setBackupNotice({ kind: 'export' });
    } catch {
      setBackupError(t('backupExportFailed'));
    } finally {
      setBackupBusy(false);
    }
  }

  async function selectBackupFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBackupError('');
    setBackupNotice(null);
    try {
      const backup = parseBestHistoryBackup(await file.text());
      setBackupCandidate(backup);
      setBackupSummary(summarizeBackup(backup));
      setBackupPassword('');
    } catch {
      setBackupCandidate(null);
      setBackupSummary(null);
      setBackupError(t('backupInvalidFile'));
    }
  }

  function closeBackupRestore() {
    if (backupBusy) return;
    setBackupCandidate(null);
    setBackupSummary(null);
    setBackupPassword('');
  }

  async function restoreFullBackup(includePrivate: boolean) {
    if (!backupCandidate) return;
    setBackupBusy(true);
    setBackupError('');
    setBackupNotice(null);
    try {
      const result = await browserAdapter.restoreBackup(backupCandidate, includePrivate ? backupPassword : undefined);
      const [nextRecords, nextProfiles, nextLocale] = await Promise.all([
        browserAdapter.readRecentHistory(),
        browserAdapter.readSiteProfiles(),
        browserAdapter.readLocale(),
      ]);
      setRecords(nextRecords);
      setProfiles(nextProfiles);
      if (nextLocale) setLocale(nextLocale);
      setPrivateRecords([]);
      await refreshArchiveStatus();
      setBackupCandidate(null);
      setBackupSummary(null);
      setBackupPassword('');
      setBackupNotice({
        kind: 'restore',
        history: result.publicHistoryImported + result.publicHistoryUpdated,
        sites: result.siteProfilesImported + result.siteProfilesMerged,
        privateRecords: result.privateRecordsImported + result.privateRecordsUpdated,
      });
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      if (code === 'BACKUP_PRIVATE_PASSWORD_INVALID') setBackupError(t('backupWrongPassword'));
      else if (code === 'CURRENT_VAULT_UNLOCK_REQUIRED') setBackupError(t('backupUnlockCurrent'));
      else setBackupError(t('backupRestoreFailed'));
    } finally {
      setBackupBusy(false);
    }
  }

  async function deleteSelectedHistory() {
    if (!selectedUrls.size) return;
    setCalculatingDelete(true);
    const urls = [...selectedUrls];
    let impact;
    try {
      impact = await browserAdapter.previewHistoryDeletion(urls);
    } catch {
      window.alert(t('error'));
      return;
    } finally {
      setCalculatingDelete(false);
    }
    const unknown = '—';
    const from = impact.firstVisitTime ? formatDate(impact.firstVisitTime, locale) : unknown;
    const to = impact.lastVisitTime ? formatDate(impact.lastVisitTime, locale) : unknown;
    const message = t('deleteImpact')
      .replace('{visits}', impact.visitCount.toLocaleString(locale))
      .replace('{urls}', impact.urlCount.toLocaleString(locale))
      .replace('{sites}', impact.siteCount.toLocaleString(locale))
      .replace('{from}', from)
      .replace('{to}', to);
    if (!window.confirm(message)) return;
    setPendingDelete({ urls, executeAt: Date.now() + 8_000 });
    setDeleteClock(Date.now());
    setSelectedUrls(new Set());
    setSelecting(false);
  }

  const feedbackEnvironment = browserAdapter.getFeedbackEnvironment();

  function feedbackTemplate() {
    return t('feedbackTemplateBody')
      .replace('{version}', feedbackEnvironment.appVersion)
      .replace('{browser}', feedbackEnvironment.browser)
      .replace('{os}', feedbackEnvironment.os)
      .replace('{locale}', locale);
  }

  async function copyFeedbackText(kind: 'email' | 'template', value: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }
    setFeedbackCopied(kind);
    window.setTimeout(() => setFeedbackCopied((current) => current === kind ? null : current), 1800);
  }

  function openFeedbackEmail() {
    const subject = t('feedbackTemplateSubject');
    const body = feedbackTemplate();
    window.location.href = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function mapAuthError(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error || '');
    const normalized = message.toLocaleLowerCase();
    if (normalized.includes('auth_google_canceled')) return t('authGoogleCanceled');
    if (normalized.includes('provider is not enabled') || normalized.includes('unsupported provider') || normalized.includes('auth_google_url_missing')) return t('authGoogleUnavailable');
    if (normalized.includes('not authorized')) return t('authEmailNotAuthorized');
    if (normalized.includes('rate limit') || normalized.includes('too many')) return t('authRateLimit');
    if (normalized.includes('token') && (normalized.includes('invalid') || normalized.includes('expired'))) return t('authInvalidCode');
    if (normalized.includes('fetch') || normalized.includes('network')) return t('authNetworkError');
    return t('authGenericError');
  }

  function openAuthModal(returnToAccount = false) {
    setAuthModalReturnToAccount(returnToAccount);
    setAuthError('');
    setAuthNotice('');
    setAuthModalOpen(true);
  }

  function completeAuthLogin(account: BestHistoryAccount) {
    setAuthAccount(account);
    setAuthStatus('signedIn');
    setAuthModalOpen(false);
    setAuthOtp('');
    setAuthStep('email');
    setAuthNotice('');
    if (authModalReturnToAccount) setView('account');
    setAuthModalReturnToAccount(false);
  }

  async function signInWithGoogle() {
    setAuthError('');
    setAuthNotice('');
    setAuthBusy(true);
    setAuthGoogleBusy(true);
    try {
      const account = await authService.signInWithGoogle(locale);
      completeAuthLogin(account);
    } catch (error) {
      setAuthError(mapAuthError(error));
    } finally {
      setAuthGoogleBusy(false);
      setAuthBusy(false);
    }
  }

  async function sendLoginOtp(emailOverride?: string) {
    const email = (emailOverride || authEmail).trim().toLocaleLowerCase();
    setAuthError('');
    setAuthNotice('');
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setAuthError(t('authInvalidEmail'));
      return;
    }
    setAuthBusy(true);
    try {
      await authService.sendEmailOtp(email, locale);
      setAuthPendingEmail(email);
      setAuthEmail(email);
      setAuthOtp('');
      setAuthStep('otp');
      setAuthResendAt(Date.now() + 60_000);
      setAuthClock(Date.now());
      setAuthNotice(t('authCodeSent').replace('{email}', email));
    } catch (error) {
      setAuthError(mapAuthError(error));
    } finally {
      setAuthBusy(false);
    }
  }

  async function verifyLoginOtp() {
    const token = authOtp.replace(/\D/g, '').slice(0, 6);
    setAuthError('');
    setAuthNotice('');
    if (token.length !== 6 || !authPendingEmail) {
      setAuthError(t('authEnterSixDigitCode'));
      return;
    }
    setAuthBusy(true);
    try {
      const account = await authService.verifyEmailOtp(authPendingEmail, token, locale);
      completeAuthLogin(account);
    } catch (error) {
      setAuthError(mapAuthError(error));
    } finally {
      setAuthBusy(false);
    }
  }

  async function refreshEntitlement() {
    if (!authAccount) return;
    setEntitlementStatus('loading');
    try {
      const [value, membership] = await Promise.all([
        entitlementService.getCurrentEntitlement({ forceRefresh: true }),
        billingService.getMembership().catch(() => null),
      ]);
      setEntitlement(value);
      setBillingMembership(membership);
      setEntitlementStatus('ready');
      if (value.isPro) setPrivateProGateOpen(false);
    } catch {
      setEntitlement(null);
      setEntitlementStatus('error');
    }
  }

  async function signOutAccount() {
    setAuthBusy(true);
    setAuthError('');
    setAuthNotice('');
    try {
      await authService.signOut();
      if (vaultUnlocked) lockPrivateVault();
      setPrivateProGateOpen(false);
      setAuthAccount(null);
      setAuthStatus('signedOut');
      setAuthEmail('');
      setAuthPendingEmail('');
      setAuthOtp('');
      setAuthStep('email');
      setAuthModalOpen(false);
      setAuthModalReturnToAccount(false);
      setView('websites');
    } catch (error) {
      setAuthError(mapAuthError(error));
    } finally {
      setAuthBusy(false);
    }
  }

  const authResendSeconds = Math.max(0, Math.ceil((authResendAt - authClock) / 1000));

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [view]);

  const navigation: Array<{ id: View; label: string; icon: string; note?: string }> = [
    { id: 'websites', label: t('websites'), icon: '⌂' },
    { id: 'timeline', label: t('timeline'), icon: '◷' },
    { id: 'tabs', label: t('tabOrganizer'), icon: '▤' },
    { id: 'account', label: t('account'), icon: '◎', note: authStatus === 'signedIn' ? t('accountSignedIn') : undefined },
    { id: 'feedback', label: t('feedback'), icon: '✉' },
    { id: 'settings', label: t('settings'), icon: '⚙' },
  ];

  const needsIncognitoPermission = incognitoCaptureEnabled && incognitoAccessAllowed === false;

  const incognitoPermissionGuide = (className = 'incognito-guide') => (
    <div className={className}>
      <div>
        <strong>{t('incognitoPermissionTitle')}</strong>
        <small>{t('incognitoPermissionDesc')}</small>
      </div>
      <div className="incognito-guide-actions">
        <button className="vault-secondary" onClick={() => void browserAdapter.openExtensionDetails()}>{t('openExtensionDetails')}</button>
        <button className="vault-secondary" onClick={() => void refreshArchiveStatus()}>{t('recheckIncognitoPermission')}</button>
      </div>
    </div>
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img className="brand-mark" src="/icon/128.png" alt="" aria-hidden="true" />
          <div><strong>{t('appName')}</strong></div>
        </div>
        <nav>
          {navigation.map((item) => (
            <button
              className={view === item.id ? 'nav-item active' : 'nav-item'}
              key={item.id}
              onClick={() => { if (item.id === 'account' && authStatus === 'signedOut') openAuthModal(true); else setView(item.id); }}
            >
              <span aria-hidden="true">{item.icon}</span><span className="nav-copy">{item.label}{item.note && <small>（{item.note}）</small>}</span>
            </button>
          ))}
          <button className={vaultUnlocked ? 'nav-item private-mode active' : 'nav-item private-mode'} onClick={() => void togglePrivateMode()}>
            <span aria-hidden="true">{vaultUnlocked ? '◆' : '◇'}</span>
            <span className="nav-copy">{t('privateMode')}<small>{vaultUnlocked ? t('privateModeOn') : privateProAccessReady ? t('privateModeLocked') : privateAccessState === 'expired' ? t('accountExpiredPlan') : 'Pro'}</small></span>
            {!privateProAccessReady && <em className="nav-pro-badge">PRO</em>}
          </button>
        </nav>
        <div className="privacy-note"><span>●</span>{t('localOnly')}</div>
      </aside>

      <main>
        {vaultUnlocked && <div className="private-mode-banner"><span>🔒 {t('privateModeBanner')}</span><button onClick={lockPrivateVault}>{t('vaultLock')}</button></div>}
        <header>
          <div><h1>{view === 'websites' ? t('websites') : navigation.find((item) => item.id === view)?.label}</h1><p>{t('tagline')}</p></div>
          <div className="header-search-actions">
            <label className="search"><span>⌕</span><input value={view === 'tabs' ? tabQuery : query} onChange={(event) => view === 'tabs' ? setTabQuery(event.target.value) : setQuery(event.target.value)} placeholder={view === 'tabs' ? t('tabSearch') : t('search')} />{(view === 'tabs' ? tabQuery : query) && <button type="button" onClick={() => view === 'tabs' ? setTabQuery('') : setQuery('')} aria-label={t('clearSearch')}>×</button>}</label>
            {view === 'websites' && <button className="ai-recall-launch" type="button" onClick={openAiRecall}><span aria-hidden="true">✦</span>{t('aiRecallButton')}<em>PRO</em></button>}
          </div>
        </header>

        {authStatus === 'signedOut' && view === 'websites' && (
          <section className="trial-signup-banner" aria-label={t('trialBannerTitle')}>
            <div className="trial-signup-copy">
              <span className="trial-signup-gift" aria-hidden="true">✦</span>
              <div><strong>{t('trialBannerTitle')}</strong><p>{t('trialBannerDesc')}</p></div>
            </div>
            <div className="trial-signup-actions">
              <button className="trial-signup-primary" onClick={() => openAuthModal(false)}>{t('trialBannerRegister')}</button>
              <button className="trial-signup-secondary" onClick={() => openAuthModal(false)}>{t('trialBannerLogin')}</button>
            </div>
          </section>
        )}

        {view === 'websites' ? (
          <>
            <section className="stats">
              <article><span>{t('sites')}</span><strong>{websites.length.toLocaleString(locale)}</strong></article>
              <article><span>{t('pages')}</span><strong>{displayRecords.length.toLocaleString(locale)}</strong></article>
              <article><span>{t('visits')}</span><strong>{displayRecords.reduce((sum, item) => sum + item.visitCount, 0).toLocaleString(locale)}</strong></article>
            </section>
            <section className="content-card">
              <div className="section-title site-section-title">
                <div className="site-section-heading">
                  <div><h2>{siteViewTitle[siteView]}</h2><p>{siteView === 'frequent' ? `↓ ${t('visits')} · ` : ''}{filtered.length.toLocaleString(locale)} {t('sites')}</p></div>
                  <div className="site-heading-actions">
                    {siteView !== 'hidden' && siteView !== 'private' && <button className="ai-site-organize-launch" type="button" onClick={openAiOrganize}><span aria-hidden="true">✦</span>{t('aiOrganizeButton')}<em>PRO</em></button>}
                    {siteView === 'hidden' && wastebasketPublicWebsites.length > 0 && (
                      <button className="clear-wastebasket-button" onClick={() => void clearWastebasket()}>
                        {t('clearWastebasket').replace('{count}', wastebasketPublicWebsites.length.toLocaleString(locale))}
                      </button>
                    )}
                  </div>
                </div>
                <div className="site-filter-area">
                  <div className="site-filters system-views">
                    {([['recent', t('recentView')], ['frequent', t('frequentView')], ['all', t('nameOrder')], ['pinned', t('pinnedView')], ['unorganized', t('unorganizedView')], ['hidden', t('hiddenView')], ...(vaultUnlocked ? [['private', t('privateSites')] as [SiteView, string]] : [])] as Array<[SiteView, string]>).map(([id, label]) => <button className={`${siteView === id ? 'active' : ''}${id === 'private' ? ' private-view-filter' : ''}`} key={id} onClick={() => setSiteView(id)}>{id === 'private' && <span className="private-filter-icon" aria-hidden="true">🔒</span>}{label}</button>)}
                  </div>
                  {availableTags.length > 0 && <div className="site-filters tag-filters">
                    {(showAllTags ? tagUsage : tagUsage.slice(0, 8)).map(([tag, count]) => <button className={selectedTagFilters.has(tag) ? 'active' : ''} key={tag} onClick={() => toggleTagFilter(tag)}>#{tag}<small>{count}</small></button>)}
                    {availableTags.length > 8 && <button onClick={() => setShowAllTags((value) => !value)}>{showAllTags ? t('fewerTags') : t('moreTags')}</button>}
                  </div>}
                </div>
              </div>
              {status === 'loading' && <div className="state">{t('loading')}</div>}
              {status === 'error' && <div className="state error">{t('error')}</div>}
              {status === 'ready' && filtered.length === 0 && <div className="state">{t('empty')}</div>}
              <div className="site-grid">
                {status === 'ready' && visibleWebsites.map((site) => {
                  const homepageUrl = getWebsiteHomeUrl(site.url);
                  const privateSite = privateDomains.has(site.domain);
                  return (
                    <div
                      className={privateSite ? 'site-card private-record' : 'site-card'}
                      key={site.domain}
                      role="button"
                      tabIndex={0}
                      onClick={() => openSiteDetails(site.domain, Boolean(query.trim() && pageTitleMatchDomains.has(site.domain)))}
                      onKeyDown={(event) => {
                        if (event.target !== event.currentTarget) return;
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          openSiteDetails(site.domain, Boolean(query.trim() && pageTitleMatchDomains.has(site.domain)));
                        }
                      }}
                    >
                      <button
                        className={siteMenuDomain === site.domain ? 'site-more-button active' : 'site-more-button'}
                        type="button"
                        aria-haspopup="menu"
                        aria-expanded={siteMenuDomain === site.domain}
                        aria-label={`${t('websiteDetails')}: ${profiles[site.domain]?.customName || site.displayName}`}
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={(event) => {
                          event.stopPropagation();
                          setSiteMenuDomain((current) => current === site.domain ? null : site.domain);
                        }}
                      >•••</button>
                      {siteMenuDomain === site.domain && (
                        <div className="site-quick-menu" role="menu" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
                          <button className={profiles[site.domain]?.pinned ? 'active' : ''} type="button" role="menuitem" onClick={() => void toggleCardPinned(site.domain)}>
                            <span aria-hidden="true">{profiles[site.domain]?.pinned ? '★' : '☆'}</span>{t('pinSite')}
                          </button>
                          <button type="button" role="menuitem" disabled={privateSite} onClick={() => void addCardSiteToPrivate(site.domain)}>
                            <span aria-hidden="true">◇</span>{t('addPrivateSite')}
                          </button>
                          <button className="wastebasket" type="button" role="menuitem" onClick={() => void toggleCardHidden(site.domain)}>
                            <span aria-hidden="true">{profiles[site.domain]?.hidden ? '↶' : '▣'}</span>{profiles[site.domain]?.hidden ? t('restoreSite') : t('hideSite')}
                          </button>
                        </div>
                      )}
                      <div className="favicon">
                        {!failedFavicons[site.domain] && (
                          <img
                            src={browserAdapter.getFaviconUrl(site.url)}
                            alt=""
                            onError={() => setFailedFavicons((current) => ({ ...current, [site.domain]: true }))}
                          />
                        )}
                        <span>{site.domain.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="site-copy">
                        <strong>{highlightText(profiles[site.domain]?.customName || site.displayName, query)}{privateSite && <em className="private-badge">🔒 {t('privateSiteBadge')}</em>}</strong>
                        <div className="site-domain-line">
                          <a
                            className="site-domain-link"
                            href={homepageUrl}
                            target="_blank"
                            rel="noreferrer"
                            title={t('openHomepage')}
                            onClick={(event) => {
                              event.stopPropagation();
                              if (privateSite) {
                                event.preventDefault();
                                void openPrivateRecord(homepageUrl);
                              }
                            }}
                          >
                            {highlightText(site.domain, query)}<span className="external-link-mark" aria-hidden="true">↗</span>
                          </a>
                          {profiles[site.domain]?.pinned && <span className="site-pinned-star" aria-label={t('pinnedView')}>★</span>}
                        </div>
                      </div>
                      {query.trim() && pageMatchByDomain.get(site.domain) && <div className="site-match"><span>{t('matchReason')}</span><strong>{highlightText(pageMatchByDomain.get(site.domain)?.title || pageMatchByDomain.get(site.domain)?.url || '', query)}</strong></div>}
                      <div className="site-meta"><span>{site.visitCount.toLocaleString(locale)} {t('visits')} · {site.pageCount.toLocaleString(locale)} {t('pages')}</span><span>{formatDate(site.lastVisitTime, locale)}</span></div>
                    </div>
                  );
                })}
              </div>
              {status === 'ready' && filtered.length > websitePageSize && <div className="website-pagination"><button disabled={websitePage === 1} onClick={() => setWebsitePage((page) => Math.max(1, page - 1))}>{t('previousPage')}</button><span>{t('pageStatus').replace('{page}', websitePage.toLocaleString(locale)).replace('{total}', websitePageCount.toLocaleString(locale))}</span><button disabled={websitePage === websitePageCount} onClick={() => setWebsitePage((page) => Math.min(websitePageCount, page + 1))}>{t('nextPage')}</button></div>}
            </section>
          </>
        ) : view === 'timeline' ? (
          <section className="content-card timeline-card">
            <div className="timeline-toolbar">
              <div><h2>{t('timeline')}</h2><p>{timelineTotal.toLocaleString(locale)} {t('timelineCount')}</p></div>
              <div className="range-tabs">
                {([
                  ['all', t('allTime')],
                  ['today', t('today')],
                  ['yesterday', t('yesterday')],
                  ['week', t('last7Days')],
                ] as Array<[TimelineRange, string]>).map(([id, label]) => (
                  <button key={id} className={timelineRange === id ? 'active' : ''} onClick={() => setTimelineRange(id)}>{label}</button>
                ))}
              </div>
              <div className="timeline-actions">
                <button onClick={exportTimeline}>{t('exportCsv')}</button>
                <button onClick={() => { setSelecting(!selecting); setSelectedUrls(new Set()); }}>{selecting ? t('cancelSelection') : t('manageHistory')}</button>
                {selecting && <button onClick={() => setSelectedUrls(new Set(timelineRecords.map((record) => record.url)))}>{t('selectAll')}</button>}
                {selecting && <button className="danger" disabled={!selectedUrls.size || calculatingDelete} onClick={() => void deleteSelectedHistory()}>{calculatingDelete ? t('calculatingImpact') : t('deleteSelected').replace('{count}', selectedUrls.size.toLocaleString(locale))}</button>}
              </div>
            </div>
            <div className="timeline-filter-bar" aria-label={t('filters')}>
              <strong>{t('filters')}</strong>
              <label><span>{t('fromDate')}</span><input type="date" value={dateFrom} max={dateTo || undefined} onChange={(event) => setDateFrom(event.target.value)} /></label>
              <label><span>{t('toDate')}</span><input type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => setDateTo(event.target.value)} /></label>
              <label><span>{t('hour')}</span><select value={hourFilter} onChange={(event) => setHourFilter(event.target.value)}><option value="all">{t('allHours')}</option>{Array.from({ length: 24 }, (_, hour) => <option value={hour} key={hour}>{String(hour).padStart(2, '0')}:00–{String(hour).padStart(2, '0')}:59</option>)}</select></label>
              <label className="domain-filter"><span>{t('domain')}</span><select value={domainFilter} onChange={(event) => setDomainFilter(event.target.value)}><option value="all">{t('allDomains')}</option>{timelineDomains.map((domain) => <option value={domain} key={domain}>{domain}</option>)}</select></label>
              {hasTimelineFilters && <button onClick={clearTimelineFilters}>{t('clearFilters')}</button>}
            </div>
            {status === 'loading' && <div className="state">{t('loading')}</div>}
            {status === 'error' && <div className="state error">{t('error')}</div>}
            {status === 'ready' && timelineGroups.length === 0 && <div className="state">{t('empty')}</div>}
            <div className="timeline-list">
              {status === 'ready' && timelineGroups.map((group) => {
                const firstRecord = group[0];
                if (!firstRecord) return null;
                return (
                <section className="day-group" key={dateKey(firstRecord.lastVisitTime)}>
                  <div className="day-heading">
                    <strong>{new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(firstRecord.lastVisitTime)}</strong>
                    <span>{group.length}</span>
                  </div>
                  {createTimelineRuns(group, timelineRunIds).map((run) => {
                    const first = run.records[0]!;
                    const faviconKey = `${first.id}:${first.url}`;
                    if (run.records.length === 1) return (
                      <a className={isPrivateRecord(first) ? 'timeline-item private-record' : 'timeline-item'} href={selecting ? undefined : first.url} target={selecting ? undefined : '_blank'} rel="noreferrer" key={run.id} title={selecting ? t('selected') : t('openPage')} onClick={(event) => { if (selecting) { event.preventDefault(); toggleTimelineRunSelection(run.records); } else if (isPrivateRecord(first)) { event.preventDefault(); void openPrivateRecord(first.url); } }}>
                        {selecting && <input className="history-check" type="checkbox" checked={selectedUrls.has(first.url)} onClick={(event) => event.stopPropagation()} onChange={() => toggleTimelineRunSelection(run.records)} />}
                        <time>{formatTime(first.lastVisitTime, locale)}</time>
                        <div className="favicon small">{!failedFavicons[faviconKey] && <img src={browserAdapter.getFaviconUrl(first.url)} alt="" onError={() => setFailedFavicons((current) => ({ ...current, [faviconKey]: true }))} />}<span>{run.domain.charAt(0).toUpperCase()}</span></div>
                        <div className="timeline-copy"><strong>{highlightText(first.title || t('untitled'), query)}{isPrivateRecord(first) && <em className="private-badge">🔒</em>}</strong><span>{highlightText(run.domain, query)}</span></div>
                        <span className="visit-badge">{first.visitCount}×</span>
                      </a>
                    );
                    const expanded = expandedTimelineRuns.has(run.id);
                    const selectedCount = run.records.filter((record) => selectedUrls.has(record.url)).length;
                    const website = websites.find((site) => site.domain === run.domain);
                    const runName = profiles[run.domain]?.customName || website?.displayName || run.domain;
                    const last = run.records[run.records.length - 1]!;
                    return (
                      <div className={`timeline-run ${expanded ? 'expanded' : ''} ${run.records.some(isPrivateRecord) ? 'private-record' : ''}`} key={run.id}>
                        <div className="timeline-run-summary">
                          {selecting && <input className="history-check run-check" type="checkbox" checked={selectedCount === run.records.length} ref={(input) => { if (input) input.indeterminate = selectedCount > 0 && selectedCount < run.records.length; }} onChange={() => toggleTimelineRunSelection(run.records)} />}
                          <time>{formatTime(first.lastVisitTime, locale)}{first.lastVisitTime !== last.lastVisitTime ? `–${formatTime(last.lastVisitTime, locale)}` : ''}</time>
                          <div className="favicon small">{!failedFavicons[faviconKey] && <img src={browserAdapter.getFaviconUrl(first.url)} alt="" onError={() => setFailedFavicons((current) => ({ ...current, [faviconKey]: true }))} />}<span>{run.domain.charAt(0).toUpperCase()}</span></div>
                          <button className="timeline-run-toggle" type="button" aria-expanded={expanded} onClick={() => toggleTimelineRun(run.id)}><span className="timeline-copy"><strong>{highlightText(runName, query)}{run.records.some(isPrivateRecord) && <em className="private-badge">🔒</em>}</strong><span>{highlightText(run.domain, query)}</span></span><span className="run-count">{run.records.length} {t('pages')}</span><b>{expanded ? '−' : '+'}</b></button>
                        </div>
                        {expanded && <div className="timeline-run-children">{run.records.map((record) => (
                          <a className={isPrivateRecord(record) ? 'timeline-child private-record' : 'timeline-child'} href={selecting ? undefined : record.url} target={selecting ? undefined : '_blank'} rel="noreferrer" key={record.id} onClick={(event) => { if (selecting) { event.preventDefault(); toggleTimelineRunSelection([record]); } else if (isPrivateRecord(record)) { event.preventDefault(); void openPrivateRecord(record.url); } }}>
                            {selecting ? <input type="checkbox" checked={selectedUrls.has(record.url)} onClick={(event) => event.stopPropagation()} onChange={() => toggleTimelineRunSelection([record])} /> : <span className="child-select-space" />}
                            <time>{formatTime(record.lastVisitTime, locale)}</time><strong>{highlightText(record.title || t('untitled'), query)}{isPrivateRecord(record) && ' 🔒'}</strong><span>{record.visitCount}×</span>
                          </a>
                        ))}</div>}
                      </div>
                    );
                  })}
                </section>
                );
              })}
            </div>
            {timelineTotal === 500 && <p className="limit-note">{t('recordsLimited')}</p>}
          </section>
        ) : view === 'tabs' ? (
          <TabOrganizerView
            locale={locale}
            searchQuery={tabQuery}
            siteProfiles={profiles}
            proAccess={Boolean(entitlement?.isPro)}
            proAccessLoading={authStatus === 'loading' || (authStatus === 'signedIn' && entitlementStatus === 'loading')}
            onRequestPro={() => {
              if (authStatus !== 'signedIn') {
                openAuthModal(false);
                return;
              }
              if (entitlement?.isPro || entitlementStatus === 'loading') return;
              openBillingPreview();
            }}
          />
        ) : view === 'account' ? (
          <section className="content-card account-card">
            <div className="account-hero">
              <div className="account-icon">◎</div>
              <div><h2>{t('accountTitle')}</h2><p>{t('accountDescription')}</p></div>
            </div>
            <div className="account-privacy"><span>🔒</span><div><strong>{t('accountPrivacyTitle')}</strong><p>{t('accountPrivacyNote')}</p></div></div>
            {authStatus === 'loading' ? (
              <div className="account-state">{t('accountLoading')}</div>
            ) : authAccount ? (
              <div className="account-signed-in">
                <div className="account-identity">
                  <div className="account-avatar">{(authAccount.displayName || authAccount.email || 'B').charAt(0).toUpperCase()}</div>
                  <div>
                    <small>{t('accountCurrentAccount')}</small>
                    <strong>{authAccount.displayName || authAccount.email || authAccount.id}</strong>
                    {authAccount.displayName && authAccount.email && <small className="account-email-address">{authAccount.email}</small>}
                    <div className="account-plan-row"><span className={`account-plan-pill ${entitlement?.isPro ? 'pro' : entitlement?.plan === 'pro' ? 'expired' : ''}`}>{entitlementStatus === 'loading' ? '…' : entitlementStatus === 'error' ? t('accountEntitlementUnavailable') : entitlement?.isPro ? entitlement.source === 'trial' ? t('accountTrialPlan') : paidPlanLabel() : entitlement?.plan === 'pro' ? t('accountExpiredPlan') : t('accountFreePlan')}</span><button className="account-entitlement-refresh" disabled={entitlementStatus === 'loading'} title={t('accountRefreshMembership')} onClick={() => void refreshEntitlement()}>↻</button></div>
                    {entitlement?.isPro && entitlement.source === 'trial' && entitlement.validUntil && <small className="account-trial-until">{t('accountTrialUntil').replace('{date}', formatMembershipDate(entitlement.validUntil))}</small>}
                  </div>
                </div>
                {entitlement?.plan === 'pro' && (entitlement.source === 'payment' || entitlement.source === 'lifetime') && (
                  <div className={`account-membership-card ${entitlement.isPro ? '' : 'expired'}`}>
                    <div className="account-membership-heading">
                      <span className="account-membership-pro">PRO</span>
                      <div><strong>{paidPlanLabel()}</strong><p>{t('accountPaidMembership')}</p></div>
                    </div>
                    <div className="account-membership-details">
                      <div><span>{t('accountPaidValidity')}</span><strong>{paidValidityText()}</strong></div>
                      <div><span>{t('accountPaidRenewal')}</span><strong>{paidRenewalText()}</strong></div>
                    </div>
                  </div>
                )}
                {billingMembership?.provider === 'dodo' && (billingMembership.planId === 'pro_monthly' || billingMembership.planId === 'pro_yearly') && (
                  <div className="account-membership-actions account-membership-actions-standalone">
                    <div>
                      <strong>{t('accountManageSubscription')}</strong>
                      <p>{t('accountManageSubscriptionHint')}</p>
                    </div>
                    <button className="account-secondary" disabled={subscriptionPortalBusy} onClick={() => void openSubscriptionPortal()}>
                      {subscriptionPortalBusy ? t('accountManageSubscriptionOpening') : t('accountManageSubscription')} ↗
                    </button>
                  </div>
                )}
                {subscriptionPortalError && <small className="account-error">{subscriptionPortalError}</small>}
                {(!entitlement?.isPro || entitlement.source === 'trial') && (
                  <div className="account-billing-preview">
                    <div className="account-billing-copy">
                      <div><span className="billing-preview-badge">{t('billingPreviewBadge')}</span><strong>{t('billingPreviewTitle')}</strong></div>
                      <p>{t('billingPreviewDescription')}</p>
                    </div>
                    <button className="account-primary" onClick={openBillingPreview}>{t('billingPreviewOpen')}</button>
                  </div>
                )}
                <div className="account-provider-list"><span>{t('accountLoginMethods')}</span><div>{authAccount.providers.map((provider) => <em key={provider}>{provider === 'email' ? '✉ Email' : provider === 'google' ? 'G Google' : provider === 'microsoft' ? 'Microsoft' : 'Apple'}</em>)}</div></div>
                <div className="account-boundary"><strong>{t('accountSyncTitle')}</strong><p>{t('accountSyncNote')}</p></div>
                {authError && <small className="account-error">{authError}</small>}
                <button className="account-secondary" disabled={authBusy} onClick={() => void signOutAccount()}>{t('accountSignOut')}</button>
              </div>
            ) : (
              <div className="account-state account-signed-out"><p>{t('accountEmailLoginDesc')}</p><button className="account-primary" onClick={() => openAuthModal(true)}>{t('authModalTitle')}</button></div>
            )}
          </section>
        ) : view === 'feedback' ? (
          <section className="content-card feedback-card">
            <div className="feedback-hero">
              <div className="feedback-icon">✉</div>
              <div><h2>{t('feedbackTitle')}</h2><p>{t('feedbackDescription')}</p></div>
            </div>
            <div className="feedback-privacy"><span>🔒</span><div><strong>{t('feedbackPrivacyTitle')}</strong><p>{t('feedbackPrivacyNote')}</p></div></div>
            <div className="feedback-contact">
              <span>{t('feedbackEmailLabel')}</span>
              <strong>{FEEDBACK_EMAIL}</strong>
            </div>
            <div className="feedback-actions">
              <button className="feedback-primary" onClick={openFeedbackEmail}>✉ {t('feedbackOpenEmail')}</button>
              <button onClick={() => void copyFeedbackText('email', FEEDBACK_EMAIL)}>{feedbackCopied === 'email' ? `✓ ${t('feedbackCopied')}` : t('feedbackCopyEmail')}</button>
              <button onClick={() => void copyFeedbackText('template', feedbackTemplate())}>{feedbackCopied === 'template' ? `✓ ${t('feedbackCopied')}` : t('feedbackCopyTemplate')}</button>
            </div>
            <p className="feedback-fallback">{t('feedbackFallbackHint')}</p>
            <details className="feedback-preview"><summary>{t('feedbackPreview')}</summary><pre>{feedbackTemplate()}</pre></details>
          </section>
        ) : view === 'settings' ? (
          <section className="content-card settings-card">
            <div className="settings-heading"><h2>{t('settingsTitle')}</h2><p>{t('settingsDescription')}</p></div>
            <div className="setting-section backup-settings">
              <div className="setting-copy"><h3>{t('backupTitle')}</h3><p>{t('backupDescription')}</p></div>
              <div className="backup-security-note"><span>🔒</span><div><strong>{t('backupPrivacyTitle')}</strong><p>{t('backupPrivacyNote')}</p></div></div>
              <div className="backup-actions">
                <button className="backup-primary" disabled={backupBusy} onClick={() => void exportFullBackup()}>↓ {t('backupExport')}</button>
                <button disabled={backupBusy} onClick={() => backupFileInput.current?.click()}>↑ {t('backupImport')}</button>
                <input ref={backupFileInput} className="backup-file-input" type="file" accept=".bhbackup,application/json" onChange={(event) => void selectBackupFile(event)} />
              </div>
              <small className="backup-local-note">{t('backupLocalHistoryNote')}</small>
              {backupNotice && <div className="backup-result success">✓ {backupNotice.kind === 'export'
                ? t('backupExportSuccess')
                : t('backupRestoreSuccess')
                  .replace('{history}', backupNotice.history.toLocaleString(locale))
                  .replace('{sites}', backupNotice.sites.toLocaleString(locale))
                  .replace('{private}', backupNotice.privateRecords.toLocaleString(locale))}</div>}
              {backupError && !backupCandidate && <div className="backup-result error">{backupError}</div>}
            </div>
            <div className="setting-section private-settings">
              <div className="setting-copy"><h3>{t('vaultSettingsTitle')}</h3><p>{t('vaultSettingsDesc')}</p></div>
              {!privateProAccessReady ? <div className="private-pro-settings-lock">
                <div className="private-pro-settings-copy"><span>PRO</span><div><strong>{t('privateProSettingsTitle')}</strong><p>{t('privateProSettingsDesc')}</p></div></div>
                {vaultConfigured && <div className="private-pro-retained">🔒 {t('privateProDataKept')}</div>}
                <div className="private-pro-settings-actions"><button className="vault-primary" onClick={() => setPrivateProGateOpen(true)}>{t('privateProFeature')}</button>{vaultConfigured && <button className="danger-text" onClick={openVaultReset}>{t('vaultResetAction')}</button>}</div>
              </div> : !vaultConfigured ? <div className="vault-auth-panel setup-form">
                <div><h3>{t('vaultSetupTitle')}</h3><p>{t('vaultSetupDesc')}</p></div>
                <label><span>{t('vaultPassword')}</span><input type="password" autoComplete="new-password" value={vaultPassword} onChange={(event) => setVaultPassword(event.target.value)} /></label>
                <label><span>{t('vaultConfirmPassword')}</span><input type="password" autoComplete="new-password" value={vaultConfirmPassword} onChange={(event) => setVaultConfirmPassword(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void setupVault(); }} /></label>
                <div className="vault-form-feedback">{vaultError && <small className="vault-error">{vaultError}</small>}</div>
                <button className="vault-primary" disabled={archiveLoading} onClick={() => void setupVault()}>{t('vaultCreate')}</button>
                {needsIncognitoPermission && incognitoPermissionGuide('incognito-guide setup-incognito-guide')}
              </div> : <>
                <div className="private-setting-row"><div><strong>🔒 {t('vaultEncrypted')}</strong><small>{t('vaultEncryptedDesc')}</small></div><button className="vault-secondary" onClick={() => void togglePrivateMode()}>{vaultUnlocked ? t('vaultLock') : t('vaultUnlock')}</button></div>
                <div className="private-setting-row"><div><strong>{t('incognitoCapture')}</strong><small>{t('incognitoCaptureDesc')}</small></div><button className={incognitoCaptureEnabled ? 'archive-toggle enabled' : 'archive-toggle'} onClick={() => void toggleIncognitoCapture()}><span />{incognitoCaptureEnabled ? t('enabled') : t('disabled')}</button></div>
                {needsIncognitoPermission && incognitoPermissionGuide()}
                {incognitoCaptureEnabled && incognitoAccessAllowed === true && <div className="incognito-guide ready"><div><strong>{t('incognitoPermissionReady')}</strong><small>{t('incognitoPermissionReadyDesc')}</small></div></div>}
                <div className="private-setting-row"><label className="vault-timeout"><span>{t('vaultAutoLock')}</span><select value={vaultAutoLockSeconds} onChange={(event) => void changeVaultAutoLock(event.target.value)}><option value="30">{t('vaultSeconds30')}</option><option value="60">{t('vaultMinute1')}</option><option value="300">{t('vaultMinutes5')}</option><option value="900">{t('vaultMinutes15')}</option></select></label></div>
                <div className="private-setting-actions"><button onClick={() => { setChangePasswordOpen((value) => !value); setVaultError(''); setPasswordChanged(false); }}>{t('changePassword')}</button><button className="danger-text" onClick={openVaultReset}>{t('vaultForgotPassword')}</button>{passwordChanged && <span className="saved-message">✓ {t('passwordChanged')}</span>}</div>
                {changePasswordOpen && <div className="password-change-form"><label><span>{t('currentPassword')}</span><input type="password" value={currentVaultPassword} onChange={(event) => setCurrentVaultPassword(event.target.value)} /></label><label><span>{t('newPassword')}</span><input type="password" value={newVaultPassword} onChange={(event) => setNewVaultPassword(event.target.value)} /></label><label><span>{t('vaultConfirmPassword')}</span><input type="password" value={newVaultConfirmPassword} onChange={(event) => setNewVaultConfirmPassword(event.target.value)} /></label>{vaultError && <small className="vault-error">{vaultError}</small>}<button className="vault-primary" onClick={() => void submitPasswordChange()}>{t('changePassword')}</button></div>}
              </>}
            </div>
            <div className="setting-section">
              <div className="setting-copy"><h3>{t('language')}</h3><p>{t('languageDescription')}</p></div>
              <div className="language-grid">
                {supportedLocales.map((item) => (
                  <button className={locale === item.id ? 'language-option active' : 'language-option'} key={item.id} onClick={() => void changeLocale(item.id)}>
                    <span className="language-code">{item.id}</span><strong>{item.nativeName}</strong>{locale === item.id && <small>✓ {t('selected')}</small>}
                  </button>
                ))}
              </div>
              <div className="language-notes"><span>● {t('followsBrowser')}</span><span>● {t('rtlReady')}</span><span>● {t('localSetting')}</span></div>
            </div>
            <div className="setting-section tag-management">
              <div className="setting-copy"><h3>{t('tagManagement')}</h3><p>{t('tagManagementDesc')}</p></div>
              {tagUsage.length === 0 ? <div className="tag-empty">{t('noTags')}</div> : <div className="global-tag-list">{tagUsage.map(([tag, count]) => (
                <div className="global-tag-row" key={tag}>
                  <strong>#{tag}</strong><span>{t('tagSiteCount').replace('{count}', count.toLocaleString(locale))}</span>
                  <input value={tagRenameDrafts[tag] ?? tag} maxLength={MAX_TAG_LENGTH} onChange={(event) => setTagRenameDrafts((current) => ({ ...current, [tag]: event.target.value }))} aria-label={t('renameTag')} />
                  <button disabled={!tagRenameDrafts[tag] || tagRenameDrafts[tag] === tag} onClick={() => void replaceGlobalTag(tag, tagRenameDrafts[tag] || tag)}>{t('renameTag')}</button>
                  <select value={tagMergeTargets[tag] || ''} onChange={(event) => setTagMergeTargets((current) => ({ ...current, [tag]: event.target.value }))}><option value="">{t('mergeInto')}</option>{availableTags.filter((item) => item !== tag).map((item) => <option value={item} key={item}>{item}</option>)}</select>
                  <button disabled={!tagMergeTargets[tag]} onClick={() => void replaceGlobalTag(tag, tagMergeTargets[tag] || '')}>{t('mergeTag')}</button>
                  <button className="danger-text" onClick={() => void deleteGlobalTag(tag)}>{t('deleteTag')}</button>
                </div>
              ))}</div>}
              <div className="batch-tag-panel">
                <div className="setting-copy"><h3>{t('batchAddTag')}</h3><p>{t('batchAddTagDesc')}</p></div>
                <div className="batch-tag-controls"><input value={batchTag} maxLength={MAX_TAG_LENGTH} onChange={(event) => setBatchTag(event.target.value)} placeholder={t('tagName')} list="existing-tags" /><datalist id="existing-tags">{availableTags.map((tag) => <option value={tag} key={tag} />)}</datalist><input value={batchSiteQuery} onChange={(event) => setBatchSiteQuery(event.target.value)} placeholder={t('searchWebsites')} /><button onClick={() => setBatchSelectedDomains(new Set(batchVisibleWebsites.map((site) => site.domain)))}>{t('selectVisible')}</button><button onClick={() => setBatchSelectedDomains(new Set())}>{t('clearSelection')}</button></div>
                <div className="batch-site-list">{batchVisibleWebsites.map((site) => <label key={site.domain}><input type="checkbox" checked={batchSelectedDomains.has(site.domain)} onChange={(event) => setBatchSelectedDomains((current) => { const next = new Set(current); event.target.checked ? next.add(site.domain) : next.delete(site.domain); return next; })} /><span><strong>{profiles[site.domain]?.customName || site.displayName}</strong><small>{site.domain}</small></span></label>)}</div>
                <div className="batch-apply"><span>{t('selectedWebsiteCount').replace('{count}', batchSelectedDomains.size.toLocaleString(locale))}</span><button disabled={!batchTag.trim() || !batchSelectedDomains.size} onClick={() => void applyBatchTag()}>{t('applyTag')}</button></div>
              </div>
            </div>
          </section>
        ) : <section className="content-card placeholder"><div className="placeholder-icon">{navigation.find((item) => item.id === view)?.icon}</div><h2>{navigation.find((item) => item.id === view)?.label}</h2><p>{t('comingSoon')}</p></section>}
      </main>
      {selectedSite && profileDraft && (
        <div className="drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeSiteDetails(); }}>
          <aside className="site-drawer" aria-label={t('websiteDetails')}>
            <div className="drawer-header">
              <div className="favicon large"><img src={browserAdapter.getFaviconUrl(selectedSite.url, 48)} alt="" /><span>{selectedSite.domain.charAt(0).toUpperCase()}</span></div>
              <div className="drawer-site-copy">
                <h2>{profileDraft.customName || selectedSite.displayName}</h2>
                <a
                  className="drawer-domain-link"
                  href={selectedSiteHomeUrl}
                  target="_blank"
                  rel="noreferrer"
                  title={t('openHomepage')}
                  onClick={(event) => {
                    if (privateDomains.has(selectedSite.domain)) {
                      event.preventDefault();
                      void openPrivateRecord(selectedSiteHomeUrl);
                    }
                  }}
                >
                  {selectedSite.domain}<span className="external-link-mark" aria-hidden="true">↗</span>
                </a>
              </div>
              <button className="close-button" onClick={closeSiteDetails} aria-label={t('cancel')}>×</button>
            </div>
            <div className="drawer-homepage-actions">
              <a
                className="homepage-action open"
                href={selectedSiteHomeUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => {
                  if (privateDomains.has(selectedSite.domain)) {
                    event.preventDefault();
                    void openPrivateRecord(selectedSiteHomeUrl);
                  }
                }}
              ><span aria-hidden="true">↗</span>{t('openHomepage')}</a>
              <button className={homepageCopied ? 'homepage-action copy copied' : 'homepage-action copy'} type="button" onClick={() => void copySelectedHomepage()}>
                <span aria-hidden="true">{homepageCopied ? '✓' : '⧉'}</span>{homepageCopied ? t('homepageCopied') : t('copyHomepage')}
              </button>
            </div>
            <div className="drawer-form">
              <label><span>{t('customName')}</span><input value={profileDraft.customName} onChange={(event) => setProfileDraft({ ...profileDraft, customName: event.target.value })} placeholder={t('customNamePlaceholder')} /></label>
              <label><span>{t('note')}</span><textarea value={profileDraft.note} onChange={(event) => setProfileDraft({ ...profileDraft, note: event.target.value })} placeholder={t('notePlaceholder')} rows={3} /></label>
              <div className="tag-editor"><span className="field-label">{t('tags')}</span><div className="tag-input-box">{profileDraft.tags.map((tag) => <span className="tag-chip" key={tag}>{tag}<button type="button" onClick={() => removeTag(tag)} aria-label={`${t('removeTag')} ${tag}`}>×</button></span>)}{profileDraft.tags.length < MAX_SITE_TAGS && <input value={tagInput} maxLength={MAX_TAG_LENGTH} onChange={(event) => { const value = event.target.value; /[,，;；、\n]/u.test(value) ? addTags(value) : setTagInput(value); }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); addTags(tagInput); } else if (event.key === 'Backspace' && !tagInput && profileDraft.tags.length) removeTag(profileDraft.tags[profileDraft.tags.length - 1]!); }} onBlur={() => { if (tagInput.trim()) addTags(tagInput); }} placeholder={profileDraft.tags.length ? '' : t('tagInputHint')} />}</div><small className="tag-help">{t('tagHelp').replace('{count}', String(MAX_SITE_TAGS))}</small>{availableTags.filter((tag) => !profileDraft.tags.includes(tag) && (!tagInput || normalizeSearchText(tag).includes(normalizeSearchText(tagInput)))).slice(0, 8).length > 0 && <div className="tag-suggestions">{availableTags.filter((tag) => !profileDraft.tags.includes(tag) && (!tagInput || normalizeSearchText(tag).includes(normalizeSearchText(tagInput)))).slice(0, 8).map((tag) => <button type="button" key={tag} onClick={() => addTags(tag)}>+ {tag}</button>)}</div>}</div>
              <label className="pin-toggle"><input type="checkbox" checked={profileDraft.pinned} onChange={(event) => setProfileDraft({ ...profileDraft, pinned: event.target.checked })} /><span>{t('pinSite')}</span></label>
              <div className="site-status-actions">
                <div className="site-status-action private-status-action">
                  {privateDomains.has(selectedSite.domain)
                    ? <button className="vault-danger" onClick={() => void deleteSelectedPrivateSite()}>🔒 {t('deletePrivateSite')}</button>
                    : <button className="private-mode-action-button" onClick={() => void addSelectedSiteToPrivate()}>◇ {t('addPrivateSite')}</button>}
                </div>
                <div className="site-status-action wastebasket-status-action">
                  <button className={profileDraft.hidden ? 'wastebasket-action-button restore' : 'wastebasket-action-button'} onClick={() => void toggleSiteHidden()}>
                    <span aria-hidden="true">{profileDraft.hidden ? '↶' : '▣'}</span>{profileDraft.hidden ? t('restoreSite') : t('hideSite')}
                  </button>
                  {profileDraft.hidden && !privateDomains.has(selectedSite.domain) && (
                    <button className="wastebasket-delete-button" onClick={() => void deleteSelectedWastebasketSite()}>
                      <span aria-hidden="true">×</span>{t('deleteWastebasketSite')}
                    </button>
                  )}
                </div>
              </div>
              <div className="drawer-actions"><button className="secondary" onClick={closeSiteDetails}>{t('cancel')}</button><button className="primary" onClick={() => void saveProfile()}>{t('save')}</button></div>
              {profileSaved && <p className="saved-message">● {t('saved')}</p>}
            </div>
            <div className="recent-pages">
              <div className="recent-pages-title"><h3>{t('recentPages')}</h3><span>{selectedSite.pageCount} {t('pageCount')}</span></div>
              <label className="detail-search"><span>⌕</span><input value={detailQuery} onChange={(event) => { setDetailQuery(event.target.value); setDetailPageLimit(20); }} placeholder={t('detailSearch')} />{detailQuery && <button type="button" onClick={() => { setDetailQuery(''); setDetailPageLimit(20); }} aria-label={t('clearSearch')}>×</button>}</label>
              {selectedPages.map((record) => <div className={isPrivateRecord(record) ? 'recent-page-row private-record' : 'recent-page-row'} key={record.id}><a href={record.url} target="_blank" rel="noreferrer" onClick={(event) => { if (isPrivateRecord(record)) { event.preventDefault(); void openPrivateRecord(record.url); } }}><strong>{record.title || t('untitled')}{isPrivateRecord(record) && <em className="private-badge">🔒</em>}</strong><span>{formatDate(record.lastVisitTime, locale)}</span></a>{isPrivateRecord(record) ? <button className="danger-text" onClick={() => void deletePrivatePage(record)}>{t('deletePrivatePage')}</button> : <button onClick={() => void addPageToPrivate(record)}>{t('addPrivatePage')}</button>}</div>)}
              {matchingSelectedPages.length === 0 && <div className="detail-search-empty">{t('empty')}</div>}
              {selectedPages.length < matchingSelectedPages.length && <div className="load-more-pages"><span>{t('showingPages').replace('{shown}', selectedPages.length.toLocaleString(locale)).replace('{total}', matchingSelectedPages.length.toLocaleString(locale))}</span><button onClick={() => setDetailPageLimit((limit) => limit + 20)}>{t('loadMore')}</button></div>}
            </div>
          </aside>
        </div>
      )}
      {pendingDelete && (
        <div className="undo-toast" role="status">
          <span>{t('deleteScheduled').replace('{seconds}', String(Math.max(0, Math.ceil((pendingDelete.executeAt - deleteClock) / 1000))))}</span>
          <button onClick={() => setPendingDelete(null)}>{t('undo')}</button>
        </div>
      )}
      {backupCandidate && backupSummary && (
        <div className="drawer-backdrop vault-modal" onMouseDown={(event) => { if (event.target === event.currentTarget) closeBackupRestore(); }}>
          <section className="backup-restore-dialog" role="dialog" aria-modal="true" aria-labelledby="backup-restore-title">
            <button className="close-button" disabled={backupBusy} onClick={closeBackupRestore}>×</button>
            <div className="backup-restore-heading"><span>↥</span><div><h2 id="backup-restore-title">{t('backupRestoreTitle')}</h2><p>{t('backupMergeNote')}</p></div></div>
            <div className="backup-summary-grid">
              <div><strong>{backupSummary.publicHistoryCount.toLocaleString(locale)}</strong><span>{t('backupHistoryCount')}</span></div>
              <div><strong>{backupSummary.siteProfileCount.toLocaleString(locale)}</strong><span>{t('backupSiteCount')}</span></div>
              <div><strong>{backupSummary.privateRecordCount.toLocaleString(locale)}</strong><span>{t('backupPrivateCount')}</span></div>
            </div>
            <small className="backup-version-note">BestHistory {backupSummary.appVersion} · {formatDate(backupSummary.createdAt, locale)}</small>
            {backupSummary.hasPrivateData ? <div className="backup-private-restore">
              <div className="backup-private-copy"><strong>🔒 {t('backupPrivateIncluded')}</strong><p>{t('backupPrivatePasswordHelp')}</p></div>
              <label><span>{t('backupPrivatePassword')}</span><input type="password" autoComplete="current-password" value={backupPassword} onChange={(event) => { setBackupPassword(event.target.value); setBackupError(''); }} /></label>
            </div> : <div className="backup-no-private">{t('backupNoPrivate')}</div>}
            {backupError && <small className="backup-modal-error">{backupError}</small>}
            <div className="backup-restore-actions">
              {backupSummary.hasPrivateData && <button className="backup-primary" disabled={backupBusy || !backupPassword} onClick={() => void restoreFullBackup(true)}>{backupBusy ? '…' : t('backupRestoreAll')}</button>}
              <button disabled={backupBusy} onClick={() => void restoreFullBackup(false)}>{backupBusy ? '…' : backupSummary.hasPrivateData ? t('backupRestorePublicOnly') : t('backupRestore')}</button>
              <button disabled={backupBusy} onClick={closeBackupRestore}>{t('cancel')}</button>
            </div>
          </section>
        </div>
      )}
      {aiRecallOpen && (
        <div className="drawer-backdrop vault-modal ai-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !aiRecallBusy) setAiRecallOpen(false); }}>
          <section className="ai-dialog ai-recall-dialog" role="dialog" aria-modal="true" aria-labelledby="ai-recall-title">
            <button className="close-button" disabled={aiRecallBusy} onClick={() => setAiRecallOpen(false)}>×</button>
            <div className="ai-dialog-heading"><span className="ai-spark">✦</span><div><small>BESTHISTORY PRO AI</small><h2 id="ai-recall-title">{t('aiRecallTitle')}</h2><p>{t('aiRecallSubtitle')}</p></div></div>
            <label className="ai-recall-input"><textarea autoFocus rows={3} value={aiRecallQuery} onChange={(event) => setAiRecallQuery(event.target.value)} placeholder={t('aiRecallPlaceholder')} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') void runAiRecall(); }} /><button disabled={aiRecallBusy || aiRecallQuery.trim().length < 2} onClick={() => void runAiRecall()}>{aiRecallBusy ? t('aiRecallSearching') : t('aiRecallSearch')}</button></label>
            <p className="ai-privacy-note">🔒 {t('aiRecallPrivacy')}</p>
            {aiRecallError && <div className="ai-error">{aiRecallError}</div>}
            {aiRecallBusy && <div className="ai-loading"><span className="ai-spinner" />{t('aiRecallSearching')}</div>}
            {!aiRecallBusy && aiRecallExpansion && (
              <div className="ai-recall-hypotheses">
                {[...aiRecallExpansion.entities, ...aiRecallExpansion.domains, ...aiRecallExpansion.keywords, ...aiRecallExpansion.categories].slice(0, 12).map((item) => <span key={item}>{item}</span>)}
              </div>
            )}
            {!aiRecallBusy && aiRecallExpansion && <div className="ai-result-title"><strong>{t('aiRecallResults')}</strong><small>{aiRecallResults.length.toLocaleString(locale)}</small></div>}
            {!aiRecallBusy && aiRecallExpansion && aiRecallResults.length === 0 && <div className="ai-empty">{t('aiRecallNoResults')}</div>}
            <div className="ai-recall-results">
              {aiRecallResults.map((result, index) => (
                <article className="ai-recall-result" key={result.url}>
                  <div className="ai-result-rank">{index + 1}</div>
                  <div className="ai-result-copy"><strong>{result.title || result.domain}</strong><small>{result.domain} · {formatDate(result.lastVisitTime, locale)}</small><code>{result.url}</code><div className="ai-reason-chips">{result.reasons.map((reason) => <span key={reason}>{aiRecallReasonLabel(reason)}</span>)}</div></div>
                  <button onClick={() => void browser.tabs.create({ url: result.url })}>{t('aiRecallOpen')}</button>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
      {aiOrganizeOpen && (
        <div className="drawer-backdrop vault-modal ai-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !aiOrganizeBusy) setAiOrganizeOpen(false); }}>
          <section className="ai-dialog ai-organize-dialog" role="dialog" aria-modal="true" aria-labelledby="ai-organize-title">
            <button className="close-button" disabled={aiOrganizeBusy} onClick={() => setAiOrganizeOpen(false)}>×</button>
            <div className="ai-dialog-heading"><span className="ai-spark">✦</span><div><small>BESTHISTORY PRO AI</small><h2 id="ai-organize-title">{t('aiOrganizeTitle')}</h2><p>{t('aiOrganizeSubtitle')}</p></div></div>
            <div className="ai-organize-scope"><strong>{t('aiOrganizeScope')}</strong><div>{([['unclassified', t('aiOrganizeScopeUnclassified')], ['current', t('aiOrganizeScopeCurrent')], ['all', t('aiOrganizeScopeAll')]] as Array<[AiOrganizeScope, string]>).map(([id, label]) => <button className={aiOrganizeScope === id ? 'active' : ''} disabled={aiOrganizeBusy} key={id} onClick={() => { setAiOrganizeScope(id); setAiOrganizeSuggestions([]); setAiOrganizeAppliedCount(0); }}>{label}<small>{getAiOrganizeTargets(id).length.toLocaleString(locale)}</small></button>)}</div></div>
            {!aiOrganizeSuggestions.length && !aiOrganizeBusy && <button className="ai-primary-action" disabled={getAiOrganizeTargets(aiOrganizeScope).length === 0} onClick={() => void runAiOrganize()}>✦ {t('aiOrganizeStart')}</button>}
            {aiOrganizeBusy && <div className="ai-loading"><span className="ai-spinner" />{t('aiOrganizeProgress').replace('{done}', aiOrganizeProgress.done.toLocaleString(locale)).replace('{total}', aiOrganizeProgress.total.toLocaleString(locale))}</div>}
            {aiOrganizeError && <div className="ai-error">{aiOrganizeError}</div>}
            {!aiOrganizeBusy && aiOrganizeSuggestions.length === 0 && aiOrganizeProgress.total > 0 && !aiOrganizeError && <div className="ai-empty">{t('aiOrganizeNoSuggestions')}</div>}
            {!aiOrganizeBusy && aiOrganizeSuggestions.length > 0 && (
              <>
                <div className="ai-organize-toolbar"><div><strong>{t('aiOrganizeSuggestions')}</strong><small>{t('aiOrganizeSiteCount').replace('{count}', aiOrganizeSuggestions.length.toLocaleString(locale))}</small></div><div><button onClick={() => setAiOrganizeSelectedDomains(new Set(aiOrganizeSuggestions.map((item) => item.domain)))}>{t('aiOrganizeSelectAll')}</button><button onClick={() => setAiOrganizeSelectedDomains(new Set())}>{t('aiOrganizeClear')}</button></div></div>
                {aiOrganizeNewTags.length > 0 && <div className="ai-new-tags"><div><strong>{t('aiOrganizeNewTags')}</strong><small>{t('aiOrganizeNewTagHint')}</small></div><div>{aiOrganizeNewTags.map((tag) => <button className={aiOrganizeApprovedNewTags.has(tag) ? 'active' : ''} key={tag} onClick={() => setAiOrganizeApprovedNewTags((current) => { const next = new Set(current); next.has(tag) ? next.delete(tag) : next.add(tag); return next; })}>#{tag}<em>{t('aiOrganizeNewBadge')}</em></button>)}</div></div>}
                <div className="ai-site-suggestions">{aiOrganizeSuggestions.map((suggestion) => { const site = websites.find((item) => item.domain === suggestion.domain); const profile = profiles[suggestion.domain]; const existingLower = new Set(availableTags.map((tag) => tag.toLocaleLowerCase())); return <article className={aiOrganizeSelectedDomains.has(suggestion.domain) ? 'selected' : ''} key={suggestion.domain}><label><input type="checkbox" checked={aiOrganizeSelectedDomains.has(suggestion.domain)} onChange={() => setAiOrganizeSelectedDomains((current) => { const next = new Set(current); next.has(suggestion.domain) ? next.delete(suggestion.domain) : next.add(suggestion.domain); return next; })} /><span><strong>{profile?.customName || site?.displayName || suggestion.domain}</strong><small>{suggestion.domain}</small></span></label><div className="ai-site-tag-lines">{profile?.tags.length ? <div><small>{t('aiOrganizeExisting')}</small><span>{profile.tags.map((tag) => <em key={tag}>#{tag}</em>)}</span></div> : null}<div><small>{t('aiOrganizeSuggested')}</small><span>{suggestion.suggestedTags.map((tag) => <em className={!existingLower.has(tag.toLocaleLowerCase()) ? 'new' : ''} key={tag}>#{tag}{!existingLower.has(tag.toLocaleLowerCase()) && <b>{t('aiOrganizeNewBadge')}</b>}</em>)}</span></div></div></article>; })}</div>
                {aiOrganizeAppliedCount > 0 && <div className="ai-success">✓ {t('aiOrganizeApplied').replace('{count}', aiOrganizeAppliedCount.toLocaleString(locale))}</div>}
                <div className="ai-dialog-actions"><button className="account-secondary" onClick={() => setAiOrganizeOpen(false)}>{t('cancel')}</button><button className="account-primary" disabled={!aiOrganizeSelectedDomains.size} onClick={() => void applyAiOrganizeSuggestions()}>{t('aiOrganizeApply').replace('{count}', aiOrganizeSelectedDomains.size.toLocaleString(locale))}</button></div>
              </>
            )}
            <p className="ai-privacy-note">🔒 {t('aiOrganizePrivacy')}</p>
          </section>
        </div>
      )}
      {authModalOpen && authStatus !== 'signedIn' && (
        <div className="drawer-backdrop vault-modal auth-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !authBusy) setAuthModalOpen(false); }}>
          <section className="auth-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
            <button className="close-button auth-modal-close" disabled={authBusy} onClick={() => setAuthModalOpen(false)} aria-label={t('cancel')}>×</button>
            <div className="auth-modal-brand"><img src="/icon/128.png" alt="" aria-hidden="true" /><span>BestHistory</span></div>
            <div className="auth-modal-heading"><h2 id="auth-modal-title">{t('authModalTitle')}</h2><p>{t('authModalDescription')}</p></div>
            <div className="auth-compare">
              <strong className="auth-compare-title">{t('authCompareTitle')}</strong>
              <div className="auth-compare-grid" role="table" aria-label={t('authCompareTitle')}>
                <div className="auth-compare-head" role="row"><span role="columnheader" /><b role="columnheader">{t('authCompareGuest')}</b><b role="columnheader">{t('authCompareAccount')}</b><b role="columnheader">{t('authComparePro')}</b></div>
                {[
                  [t('authCompareCore'), '✓', '✓', '✓'],
                  [t('authCompareTabs'), '✓', '✓', '✓'],
                  [t('authCompareIdentity'), '—', '✓', '✓'],
                  [t('authComparePrivate'), '—', t('authCompareTrialAccess'), '✓'],
                  [t('authCompareAi'), '—', t('authCompareTrialAccess'), '✓'],
                  [t('authCompareRecovery'), '—', '✓', '✓'],
                ].map(([label, guest, account, pro]) => <div className="auth-compare-row" role="row" key={label}><span role="rowheader">{label}</span><em role="cell">{guest}</em><em role="cell">{account}</em><em className="pro" role="cell">{pro}</em></div>)}
              </div>
              <p className="auth-compare-trial">✦ {t('authCompareTrialNote')}</p>
            </div>
            {authStep === 'email' ? (
              <>
                <button className="auth-google-button" disabled={authBusy} onClick={() => void signInWithGoogle()}><span className="auth-google-mark" aria-hidden="true">G</span><span>{authGoogleBusy ? t('authGoogleConnecting') : t('authContinueGoogle')}</span></button>
                <div className="auth-modal-divider"><span>{t('authOrEmail')}</span></div>
                <div className="auth-email-section">
                  <div className="account-login-heading"><h3>{t('accountEmailLogin')}</h3><p>{t('accountEmailLoginDesc')}</p></div>
                  <label><span>{t('accountEmail')}</span><input type="email" autoComplete="email" autoFocus value={authEmail} onChange={(event) => { setAuthEmail(event.target.value); setAuthError(''); }} onKeyDown={(event) => { if (event.key === 'Enter') void sendLoginOtp(); }} placeholder="name@example.com" /></label>
                  <button className="account-primary auth-email-submit" disabled={authBusy} onClick={() => void sendLoginOtp()}>{authBusy ? t('accountSending') : t('accountSendCode')}</button>
                </div>
              </>
            ) : (
              <div className="auth-email-section auth-otp-section">
                <div className="account-login-heading"><h3>{t('accountEnterCode')}</h3><p>{t('accountCodeDescription').replace('{email}', authPendingEmail)}</p></div>
                <label><span>{t('accountCode')}</span><input className="account-otp" inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={6} value={authOtp} onChange={(event) => { setAuthOtp(event.target.value.replace(/\D/g, '').slice(0, 6)); setAuthError(''); }} onKeyDown={(event) => { if (event.key === 'Enter') void verifyLoginOtp(); }} placeholder="000000" /></label>
                <button className="account-primary auth-email-submit" disabled={authBusy || authOtp.length !== 6} onClick={() => void verifyLoginOtp()}>{authBusy ? t('accountVerifying') : t('accountVerify')}</button>
                <div className="account-login-links"><button disabled={authBusy || authResendSeconds > 0} onClick={() => void sendLoginOtp(authPendingEmail)}>{authResendSeconds > 0 ? t('accountResendWait').replace('{seconds}', String(authResendSeconds)) : t('accountResend')}</button><button disabled={authBusy} onClick={() => { setAuthStep('email'); setAuthOtp(''); setAuthError(''); setAuthNotice(''); }}>{t('accountChangeEmail')}</button></div>
              </div>
            )}
            {authError && <small className="account-error auth-modal-message">{authError}</small>}
            {authNotice && <small className="account-success auth-modal-message">{authNotice}</small>}
            <div className="auth-modal-privacy"><span aria-hidden="true">🔒</span><p>{t('authModalPrivacy')}</p></div>
          </section>
        </div>
      )}
      {billingModalOpen && authStatus === 'signedIn' && (
        <div className="billing-pricing-backdrop">
          <section className="billing-pricing-page" role="dialog" aria-modal="true" aria-labelledby="billing-pricing-title">
            <div className="billing-pricing-wrap">
              <div className="billing-pricing-top">
                <div className="billing-pricing-brand">BestHistory</div>
                <div className="billing-pricing-actions">
                  <select className="billing-pricing-language" value={locale} onChange={(event) => void changeLocale(event.target.value as Locale)} aria-label={t('language')}>
                    {supportedLocales.map((item) => <option key={item.id} value={item.id}>{item.nativeName}</option>)}
                  </select>
                  <button className="billing-pricing-return" disabled={billingBusy} onClick={closeBillingPreview}>{t('billingPricingBack')}</button>
                </div>
              </div>
              {billingStep === 'plans' && (
                <>
                  <section className="billing-pricing-hero"><h2 id="billing-pricing-title">BestHistory Pro</h2><p>{t('billingPricingLead')}</p></section>
                  <section className="billing-pricing-grid" aria-label="BestHistory Pro plans">
                    <article className="billing-pricing-card">
                      <div className="billing-pricing-plan">{t('billingPricingMonthly')}</div><div className="billing-pricing-price">$2.99</div><div className="billing-pricing-period">{t('billingPricingMonthlyPeriod')}</div><div className="billing-pricing-saving" />
                      <ul><li>{t('billingPricingProAccess')}</li><li>{t('billingPricingMonthlySub')}</li><li>{t('billingPricingCancelRenewal')}</li></ul>
                      <button type="button" disabled={billingBusy} onClick={() => void startCheckout('pro_monthly')}>{t('billingPricingBuyMonthly')}</button>
                    </article>
                    <article className="billing-pricing-card featured">
                      <div className="billing-pricing-badge">{t('billingPricingSave30')}</div><div className="billing-pricing-plan">{t('billingPricingAnnual')}</div><div className="billing-pricing-price">$24.99</div><div className="billing-pricing-period">{t('billingPricingAnnualPeriod')}</div><div className="billing-pricing-saving">{t('billingPricingEffective')}</div>
                      <ul><li>{t('billingPricingProAccess')}</li><li>{t('billingPricingAnnualSub')}</li><li>{t('billingPricingLowerMonthly')}</li></ul>
                      <button type="button" disabled={billingBusy} onClick={() => void startCheckout('pro_yearly')}>{t('billingPricingBuyAnnual')}</button>
                    </article>
                    <article className="billing-pricing-card">
                      <div className="billing-pricing-plan">{t('billingPricingLifetime')}</div><div className="billing-pricing-price">$59.99</div><div className="billing-pricing-period">{t('billingPricingOneTime')}</div><div className="billing-pricing-saving">{t('billingPricingNoRecurring')}</div>
                      <ul><li>{t('billingPricingProAccess')}</li><li>{t('billingPricingOnePurchase')}</li><li>{t('billingPricingNoRenewal')}</li></ul>
                      <button type="button" disabled={billingBusy} onClick={() => void startCheckout('pro_lifetime')}>{t('billingPricingBuyLifetime')}</button>
                    </article>
                  </section>
                  {billingBusy && <div className="billing-pricing-status"><div className="billing-wait-spinner" aria-hidden="true" />{t('billingWaitingTitle')}</div>}
                  {billingError && <div className="billing-pricing-error">{billingError}</div>}
                  <div className="billing-pricing-foot">{t('billingPricingFooter')}</div>
                </>
              )}
              {billingStep === 'waiting' && (
                <div className="billing-pricing-result waiting">
                  <div className="billing-wait-spinner" aria-hidden="true" />
                  <h2>{t('billingWaitingTitle')}</h2>
                  <p>{t('billingWaitingDesc')}</p>
                </div>
              )}
              {billingStep === 'success' && (
                <div className="billing-pricing-result success"><div className="billing-pricing-result-icon">✓</div><h2>{t('billingMockSuccessTitle')}</h2><p>{t('billingAutoSuccessDesc')}</p></div>
              )}
            </div>
          </section>
        </div>
      )}
      {privateProGateOpen && (
        <div className="drawer-backdrop vault-modal" onMouseDown={(event) => { if (event.target === event.currentTarget) setPrivateProGateOpen(false); }}>
          <section className="private-pro-dialog" role="dialog" aria-modal="true" aria-labelledby="private-pro-title">
            <button className="close-button" onClick={() => setPrivateProGateOpen(false)}>×</button>
            <span className="private-pro-label">{t('privateProFeature')}</span>
            <h2 id="private-pro-title">{privateAccessState === 'signedOut' ? t('privateProSignInTitle') : privateAccessState === 'expired' ? t('privateProExpiredTitle') : privateAccessState === 'unavailable' ? t('privateProUnavailableTitle') : privateAccessState === 'checking' ? t('privateProUnavailableTitle') : t('privateProFreeTitle')}</h2>
            <p className="private-pro-slogan">{t('privateProSlogan')}</p>
            <p className="private-pro-desc">{privateAccessState === 'signedOut' ? t('privateProSignInDesc') : privateAccessState === 'expired' ? t('privateProExpiredDesc') : privateAccessState === 'unavailable' || privateAccessState === 'checking' ? t('privateProUnavailableDesc') : t('privateProFreeDesc')}</p>
            <div className="private-pro-benefits">
              <div><span>◉</span><strong>{t('privateBenefitHidden')}</strong></div>
              <div><span>◐</span><strong>{t('privateBenefitIncognito')}</strong></div>
              <div><span>⌁</span><strong>{t('privateBenefitLocal')}</strong></div>
              <div><span>🔒</span><strong>{t('privateBenefitLock')}</strong></div>
            </div>
            {vaultConfigured && <div className="private-pro-retained">🔒 {t('privateProDataKept')}</div>}
            <div className="private-pro-actions">
              {privateAccessState === 'signedOut' ? <button className="vault-primary" onClick={() => { setPrivateProGateOpen(false); openAuthModal(false); }}>{t('privateProSignIn')}</button> : null}
              {privateAccessState === 'free' ? <><button className="vault-primary" onClick={() => { setPrivateProGateOpen(false); openBillingPreview(); }}>{t('privateProUpgradeSoon')}</button><button className="vault-secondary" disabled={entitlementStatus === 'loading'} onClick={() => void refreshEntitlement()}>{t('privateProRefresh')}</button></> : null}
              {privateAccessState === 'expired' ? <button className="vault-primary" onClick={() => { setPrivateProGateOpen(false); openBillingPreview(); }}>{t('privateProUpgradeSoon')}</button> : null}{privateAccessState === 'unavailable' || privateAccessState === 'checking' ? <button className="vault-primary" disabled={!authAccount || entitlementStatus === 'loading'} onClick={() => void refreshEntitlement()}>{entitlementStatus === 'loading' ? '…' : t('privateProRefresh')}</button> : null}
              <button className="vault-secondary" onClick={() => setPrivateProGateOpen(false)}>{t('cancel')}</button>
            </div>
          </section>
        </div>
      )}
      {vaultSetupOpen && !vaultConfigured && (
        <div className="drawer-backdrop vault-modal" onMouseDown={(event) => { if (event.target === event.currentTarget) { setVaultSetupOpen(false); setPendingPrivateAction(null); } }}>
          <section className="vault-setup-dialog" role="dialog" aria-modal="true" aria-labelledby="private-setup-title">
            <button className="close-button" onClick={() => { setVaultSetupOpen(false); setPendingPrivateAction(null); }}>×</button>
            <div className="vault-setup-hero">
              <small>{t('privateSetupTitle')}</small>
              <h2 id="private-setup-title">{t('privateSetupSlogan')}</h2>
              <strong>{t('privateSetupSubtitle')}</strong>
              <p>{t('privateSetupIntro')}</p>
            </div>
            <div className="vault-benefits">
              <div><span>◉</span><strong>{t('privateBenefitHidden')}</strong></div>
              <div><span>◐</span><strong>{t('privateBenefitIncognito')}</strong></div>
              <div><span>⌁</span><strong>{t('privateBenefitLocal')}</strong></div>
              <div><span>🔒</span><strong>{t('privateBenefitLock')}</strong></div>
            </div>
            {needsIncognitoPermission && incognitoPermissionGuide('incognito-guide setup-incognito-guide')}
            {incognitoCaptureEnabled && incognitoAccessAllowed === true && <div className="incognito-guide ready setup-incognito-guide"><div><strong>{t('incognitoPermissionReady')}</strong><small>{t('incognitoPermissionReadyDesc')}</small></div></div>}
            <div className="vault-setup-form">
              <div><h3>{t('privateSetupPasswordHeading')}</h3><p>{t('privateSetupPasswordHelp')}</p></div>
              <label><span>{t('vaultPassword')}</span><input type="password" autoFocus autoComplete="new-password" value={vaultPassword} onChange={(event) => setVaultPassword(event.target.value)} /></label>
              <label><span>{t('vaultConfirmPassword')}</span><input type="password" autoComplete="new-password" value={vaultConfirmPassword} onChange={(event) => setVaultConfirmPassword(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void setupVault(); }} /></label>
              <label className="setup-lock-select"><span>{t('vaultAutoLock')}</span><select value={vaultAutoLockSeconds} onChange={(event) => setVaultAutoLockSeconds(Number(event.target.value) as VaultAutoLockSeconds)}><option value="30">{t('vaultSeconds30')}</option><option value="60">{t('vaultMinute1')}</option><option value="300">{t('vaultMinutes5')}</option><option value="900">{t('vaultMinutes15')}</option></select></label>
              {vaultError && <small className="vault-error">{vaultError}</small>}
              <button className="vault-primary setup-submit" disabled={archiveLoading} onClick={() => void setupVault()}>{t('privateSetupCreate')}</button>
            </div>
            <p className="vault-setup-limitation">{t('privateSetupLimitation')}</p>
          </section>
        </div>
      )}
      {vaultUnlockOpen && !vaultUnlocked && (
        <div className="drawer-backdrop vault-modal" onMouseDown={(event) => { if (event.target === event.currentTarget) setVaultUnlockOpen(false); }}>
          <section className="vault-unlock-dialog" role="dialog" aria-modal="true"><button className="close-button" onClick={() => setVaultUnlockOpen(false)}>×</button><h2>🔒 {t('unlockPrivateMode')}</h2><p>{t('vaultUnlockDesc')}</p>{needsIncognitoPermission && incognitoPermissionGuide('incognito-guide unlock-incognito-guide')}<input type="password" autoFocus autoComplete="current-password" placeholder={t('vaultPassword')} value={vaultPassword} onChange={(event) => setVaultPassword(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void unlockPrivateVault(); }} />{vaultError && <small className="vault-error">{vaultError}</small>}<button className="vault-primary" disabled={archiveLoading} onClick={() => void unlockPrivateVault()}>{t('vaultUnlock')}</button><button className="vault-forgot" onClick={() => { setVaultUnlockOpen(false); openVaultReset(); }}>{t('vaultForgotPassword')}</button></section>
        </div>
      )}
      {vaultResetOpen && (
        <div className="drawer-backdrop vault-modal" onMouseDown={(event) => { if (event.target === event.currentTarget) closeVaultReset(); }}>
          <section className="vault-reset-panel vault-reset-dialog" role="dialog" aria-modal="true">
            <div className="vault-reset-heading"><span>⚠</span><div><h3>{t('vaultResetTitle')}</h3><p>{t('vaultResetWarning')}</p></div></div>
            <div className="vault-reset-effects"><p className="recoverable">✓ {t('vaultResetRecoverable')}</p><p className="permanent">× {t('vaultResetPermanentLoss')}</p></div>
            <label><span>{t('vaultResetTypePrompt').replace('{phrase}', t('vaultResetPhrase'))}</span><input autoFocus value={vaultResetInput} onChange={(event) => { setVaultResetInput(event.target.value); setVaultResetError(''); }} placeholder={t('vaultResetPhrase')} /></label>
            {vaultResetError && <small className="vault-error">{vaultResetError}</small>}
            <div className="vault-reset-actions"><button className="vault-secondary" onClick={closeVaultReset}>{t('cancel')}</button><button className="vault-danger" disabled={archiveLoading} onClick={() => void destroyAndResetVault()}>{t('vaultResetAction')}</button></div>
          </section>
        </div>
      )}
    </div>
  );
}
