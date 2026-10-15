import { CHECKOUT_ORIGIN } from '@/src/config/supabase';
export default defineBackground(() => {
  const appUrl = browser.runtime.getURL('/app.html');

  void import('@/src/tabs/tab-organizer').then(({ ensureTabOrganizerAlarm }) => ensureTabOrganizerAlarm()).catch(() => undefined);

  const openOrFocusApp = async (): Promise<void> => {
    const tabs = await browser.tabs.query({});
    const existing = tabs.find((tab) => typeof tab.url === 'string' && tab.url.startsWith(appUrl));

    if (existing?.id !== undefined) {
      await browser.tabs.update(existing.id, { active: true });
      if (existing.windowId !== undefined) {
        await browser.windows.update(existing.windowId, { focused: true });
      }
      return;
    }

    await browser.tabs.create({ url: appUrl });
  };

  const isIncognitoTab = async (tabId: number): Promise<boolean> => {
    if (tabId < 0) return false;
    try {
      const tab = await browser.tabs.get(tabId);
      return Boolean(tab.incognito);
    } catch {
      return false;
    }
  };

  browser.webNavigation.onCommitted.addListener((details) => {
    if (details.frameId !== 0 || !details.url) return;
    void (async () => {
      const [{ browserAdapter }, { hasCachedProAccess }] = await Promise.all([
        import('@/src/platform/browser-adapter'),
        import('@/src/entitlements/entitlement-cache'),
      ]);
      if (!(await hasCachedProAccess())) return;
      await browserAdapter.archiveNavigationVisit(
        { id: `navigation:${details.tabId}:${details.timeStamp}`, url: details.url, title: '', lastVisitTime: details.timeStamp, visitCount: 1 },
        await isIncognitoTab(details.tabId),
      );
    })();
  });
  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'complete' || !tab.url) return;
    void (async () => {
      const [{ browserAdapter }, { hasCachedProAccess }] = await Promise.all([
        import('@/src/platform/browser-adapter'),
        import('@/src/entitlements/entitlement-cache'),
      ]);
      if (!(await hasCachedProAccess())) return;
      await browserAdapter.archiveNavigationVisit(
        { id: `tab:${tabId}:${tab.url}`, url: tab.url!, title: tab.title || '', lastVisitTime: Date.now(), visitCount: 1 },
        Boolean(tab.incognito),
      );
    })();
  });
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name !== 'besthistory:tab-organizer-auto') return;
    void import('@/src/tabs/tab-organizer').then(({ runAutoOrganizer }) => runAutoOrganizer()).catch(() => undefined);
  });

  browser.runtime.onMessageExternal.addListener((message: unknown, sender) => {
    const senderUrl = typeof sender.url === 'string' ? sender.url : sender.tab?.url;
    let trustedCheckoutSender = false;
    if (senderUrl) {
      try {
        const senderParsed = new URL(senderUrl);
        trustedCheckoutSender = (
          senderParsed.protocol === 'https:'
          && senderParsed.origin === CHECKOUT_ORIGIN
          && senderParsed.pathname === '/checkout/'
        );
      } catch { /* invalid sender URL */ }
    }
    if (!trustedCheckoutSender) return undefined;
    if (sender.tab?.id === undefined) return undefined;

    const closeCheckoutAndFocusApp = async (type: 'besthistory:payment-complete' | 'besthistory:payment-canceled', transactionId?: string) => {
      const checkoutWindowId = sender.tab?.windowId;
      // Notify the already-open extension page first; the message never grants Pro.
      // The extension always re-reads the server entitlement after receiving it.
      await browser.runtime.sendMessage({ type, transactionId }).catch(() => undefined);
      await openOrFocusApp();
      if (checkoutWindowId !== undefined) {
        try { await browser.windows.remove(checkoutWindowId); } catch { /* already closed */ }
      }
      return { ok: true };
    };

    if (
      typeof message === 'object'
      && message !== null
      && 'type' in message
      && message.type === 'besthistory:payment-canceled'
    ) {
      return closeCheckoutAndFocusApp('besthistory:payment-canceled');
    }

    if (
      typeof message !== 'object'
      || message === null
      || !('type' in message)
      || message.type !== 'besthistory:payment-complete'
    ) {
      return undefined;
    }

    const transactionId = 'transactionId' in message && typeof message.transactionId === 'string'
      ? message.transactionId
      : '';
    if (!/^txn_[a-z\d]{26}$/.test(transactionId)) return undefined;
    return closeCheckoutAndFocusApp('besthistory:payment-complete', transactionId);
  });

  browser.action.onClicked.addListener(() => {
    void openOrFocusApp();
  });

  browser.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === 'install') {
      void openOrFocusApp();
    }
  });

  browser.runtime.onMessage.addListener((message: unknown) => {
    if (
      typeof message === 'object' &&
      message !== null &&
      'type' in message &&
      message.type === 'besthistory:open-app'
    ) {
      return openOrFocusApp();
    }

    return undefined;
  });
});
