import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const warnings = [];
const ignoredDirs = new Set(['.git', 'node_modules', '.output', '.wxt', 'dist', 'build', 'Downloads']);
const textExtensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.json', '.md', '.txt', '.sql', '.css', '.html', '.yml', '.yaml', '.toml']);

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const files = walk(root);
const relative = (file) => path.relative(root, file);

for (const file of files) {
  const rel = relative(file);
  if (/^\.env(?:\.|$)/.test(path.basename(file))) failures.push(`Environment file must not ship: ${rel}`);
  if (!textExtensions.has(path.extname(file).toLowerCase())) continue;
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { continue; }
  const checks = [
    [/\bservice_role\b\s*[:=]\s*['\"][A-Za-z0-9._-]{20,}/i, 'Supabase service_role credential'],
    [/\bsb_secret_[A-Za-z0-9_-]{20,}/, 'Supabase secret key'],
    [/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/, 'AWS access key'],
    [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, 'Private key'],
    [/\b(?:smtp[_-]?password|aws[_-]?secret[_-]?access[_-]?key)\b\s*[:=]\s*['\"][^'\"]{8,}/i, 'SMTP/AWS secret'],
    [/\bpdl_(?:sdbx|live)_apikey_[A-Za-z0-9_-]{20,}/, 'Paddle API key'],
    [/\bpdl_ntfset_[A-Za-z0-9_-]{20,}/, 'Paddle webhook secret'],
  ];
  for (const [pattern, label] of checks) if (pattern.test(text)) failures.push(`${label} found in ${rel}`);
}

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const wxt = fs.readFileSync(path.join(root, 'wxt.config.ts'), 'utf8');
const manifestVersion = wxt.match(/version:\s*['\"]([^'\"]+)['\"]/i)?.[1];
if (!manifestVersion) failures.push('Could not read manifest version from wxt.config.ts');
else if (manifestVersion !== packageJson.version) failures.push(`Version mismatch: package.json=${packageJson.version}, manifest=${manifestVersion}`);
if (/default_popup/i.test(wxt)) failures.push('default_popup is still configured; toolbar should open BestHistory directly.');
if (/<all_urls>|https?:\/\/\*\//i.test(wxt)) warnings.push('Broad host permission detected; review before release.');
if (/service_role|sb_secret_/i.test(fs.readFileSync(path.join(root, 'src/config/supabase.ts'), 'utf8'))) failures.push('A privileged Supabase credential appears in src/config/supabase.ts');


const billingServiceSource = fs.readFileSync(path.join(root, 'src/billing/billing-service.ts'), 'utf8');
// PADDLE_AUTH_HEADER_GUARD
if (!billingServiceSource.includes("supabase.auth.getSession()")) failures.push('Authenticated billing calls must explicitly read the current Supabase session.');
if (!billingServiceSource.includes("Authorization: `Bearer ${accessToken}`")) failures.push('Authenticated billing calls must explicitly send the current Supabase access token.');
if (!billingServiceSource.includes("apikey: SUPABASE_PUBLISHABLE_KEY")) failures.push('Authenticated billing calls must explicitly send the frontend-safe Supabase publishable key.');
if (!billingServiceSource.includes("fetch(`${SUPABASE_URL}/functions/v1/${name}`")) failures.push('Authenticated billing must use a deterministic HTTPS request to the trusted Supabase function host.');
if (billingServiceSource.includes("supabase.functions.invoke('billing-create-paddle-transaction'")) failures.push('Paddle transaction creation must not depend on implicit Supabase Functions auth headers.');
if (billingServiceSource.includes("supabase.functions.invoke('billing-checkout-status'")) failures.push('Paddle checkout-status polling must not depend on implicit Supabase Functions auth headers.');
if (!billingServiceSource.includes("'billing-create-paddle-transaction', withBestHistoryClientMeta({")) failures.push('Paddle billing must pre-create the exact transaction through the trusted Supabase backend.');
if (!billingServiceSource.includes('browser.windows.create')) failures.push('Extension checkout must isolate Paddle.js in a normal HTTPS popup window.');
if (billingServiceSource.includes('window.location.assign')) failures.push('Extension checkout must not navigate the main BestHistory tab away.');
if (!billingServiceSource.includes("parsed.hostname === 'besthistory.boxuezhiban.cn'") || !billingServiceSource.includes("parsed.pathname === '/checkout/'")) failures.push('Extension billing must restrict checkout to the independently verified BestHistory HTTPS checkout host.');
if (billingServiceSource.includes("parsed.pathname === '/functions/v1/billing-checkout-page'")) failures.push('Extension billing must not use the Supabase Edge HTML checkout host.');
if (/billing-create-checkout-context/.test(billingServiceSource)) failures.push('Extension billing still depends on the obsolete checkout_ref purchase flow.');
if (/LocalMockBillingService|completeMockCheckout|createMockCheckout/.test(billingServiceSource)) failures.push('Mock billing implementation is still active.');
if (/PADDLE_API_KEY|PADDLE_WEBHOOK_SECRET|SUPABASE_SERVICE_ROLE_KEY/.test(billingServiceSource)) failures.push('Privileged billing secret names must not be referenced by extension billing code.');

const paddleSharedSource = fs.readFileSync(path.join(root, 'supabase/functions/_shared/paddle.ts'), 'utf8');
for (const name of ['PADDLE_PRICE_ID_MONTHLY','PADDLE_PRICE_ID_YEARLY','PADDLE_PRICE_ID_LIFETIME','PADDLE_CLIENT_TOKEN','PADDLE_ENV']) {
  if (!paddleSharedSource.includes(name)) failures.push(`Paddle server adapter must read ${name} from Supabase Edge Function environment configuration.`);
}
if (/pri_01m0y8qr1c3ffr964bp7a9ss1t|pri_01m0y8v82sxexbwyety9276pzr|pri_01m0y8xm16wg5ghbpn9edghjf1/.test(paddleSharedSource)) failures.push('Paddle server adapter must not hard-code Sandbox price IDs.');
const billingPublicConfigSource = fs.readFileSync(path.join(root, 'supabase/functions/billing-public-config/index.ts'), 'utf8');
if (!billingPublicConfigSource.includes('paddleClientToken()') || !billingPublicConfigSource.includes('paddlePublicPrices()')) failures.push('billing-public-config must expose only frontend-safe environment/token/price configuration.');
if (/PADDLE_API_KEY|PADDLE_WEBHOOK_SECRET/.test(billingPublicConfigSource)) failures.push('billing-public-config must never expose Paddle privileged credentials.');

const extensionBillingText = [
  billingServiceSource,
  fs.readFileSync(path.join(root, 'entrypoints/app/App.tsx'), 'utf8'),
  fs.readFileSync(path.join(root, 'wxt.config.ts'), 'utf8'),
].join('\n');
if (/cdn\.paddle\.com|Paddle\.(?:Initialize|Checkout|Environment)|test_b87d133e3906a5974c5a3d9c5bc/.test(extensionBillingText)) failures.push('Paddle.js/client token must stay on the BestHistory website, never in extension runtime code.');

const pricingPagePath = path.join(root, 'Docs/pricing/index.html');
if (!fs.existsSync(pricingPagePath)) failures.push('Missing Docs/pricing/index.html Paddle pricing page.');
else {
  const pricingPage = fs.readFileSync(pricingPagePath, 'utf8');
  const requiredPricingFragments = [
    'https://cdn.paddle.com/paddle/v2/paddle.js',
    'billing-public-config',
    'config.clientToken',
    'config.environment',
    'data.prices.monthly',
    'data.prices.annual',
    'data.prices.lifetime',
    'billing-get-checkout-context',
    'billing-checkout-status',
    'checkout_ref:CHECKOUT_REF',
    "event.name==='checkout.completed'",
  ];
  for (const fragment of requiredPricingFragments) if (!pricingPage.includes(fragment)) failures.push(`Pricing page missing required environment-neutral Paddle fragment: ${fragment}`);
  if (/test_[A-Za-z0-9]{20,}|pri_01m0y8qr1c3ffr964bp7a9ss1t|pri_01m0y8v82sxexbwyety9276pzr|pri_01m0y8xm16wg5ghbpn9edghjf1/.test(pricingPage)) failures.push('Pricing page must not hard-code Sandbox client tokens or Sandbox price IDs.');
  if (/PADDLE_API_KEY|PADDLE_WEBHOOK_SECRET|SUPABASE_SERVICE_ROLE_KEY|pdl_(?:sdbx|live)_apikey_|pdl_ntfset_/.test(pricingPage)) failures.push('Privileged Paddle/Supabase secrets must never appear in the public pricing page.');

  const match = pricingPage.match(/const T=(\{.*?\});\nconst PLANS=/s);
  if (!match) failures.push('Could not parse pricing-page translations.');
  else {
    try {
      const pricingTranslations = JSON.parse(match[1]);
      const expectedWebLocales = ['zh-CN','zh-TW','en','ja','ko','es','pt','fr','de','it','nl','ru','ar','hi','id','tr','bn','vi'];
      const actualLocales = Object.keys(pricingTranslations);
      if (actualLocales.length !== 18 || expectedWebLocales.some((locale) => !pricingTranslations[locale])) failures.push(`Pricing page must contain all 18 locales; found ${actualLocales.length}.`);
      const englishKeys = Object.keys(pricingTranslations.en || {}).sort();
      for (const locale of expectedWebLocales) {
        const localeKeys = Object.keys(pricingTranslations[locale] || {}).sort();
        if (localeKeys.join('\n') !== englishKeys.join('\n')) failures.push(`Pricing page locale ${locale} does not contain the complete translation key set.`);
      }
    } catch (error) {
      failures.push(`Pricing-page translation JSON is invalid: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

const checkoutContextFunction = fs.readFileSync(path.join(root, 'supabase/functions/billing-create-checkout-context/index.ts'), 'utf8');
const getCheckoutContextFunction = fs.readFileSync(path.join(root, 'supabase/functions/billing-get-checkout-context/index.ts'), 'utf8');
const checkoutRefShared = fs.readFileSync(path.join(root, 'supabase/functions/_shared/checkout-ref.ts'), 'utf8');
if (!checkoutContextFunction.includes('newCheckoutRef()') || !checkoutContextFunction.includes('checkoutRefHash(checkoutRef)')) failures.push('Checkout context must use a high-entropy opaque ref and persist only its hash.');
if (!checkoutContextFunction.includes('30 * 60 * 1000')) failures.push('Sandbox checkout_ref must expire after 30 minutes.');
if (!getCheckoutContextFunction.includes(".eq('ref_hash', refHash)")) failures.push('Pricing-page checkout validation must look up the hashed checkout_ref.');
if (!checkoutRefShared.includes('crypto.getRandomValues') || !checkoutRefShared.includes("crypto.subtle.digest('SHA-256'")) failures.push('checkout_ref generation/hash boundary is incomplete.');
if (fs.existsSync(path.join(root, 'supabase/functions/billing-create-checkout/index.ts'))) failures.push('Obsolete server-created Paddle transaction checkout function must be removed after checkout_ref migration.');

const appSource = fs.readFileSync(path.join(root, 'entrypoints/app/App.tsx'), 'utf8');
const backgroundSource = fs.readFileSync(path.join(root, 'entrypoints/background.ts'), 'utf8');
if (!wxt.includes("https://besthistory.boxuezhiban.cn/checkout/*")) failures.push('Manifest must allow only the verified BestHistory checkout origin to message the extension.');
if (/externally_connectable:[\s\S]*fuepiplrpixvfxctqdpo\.supabase\.co/.test(wxt)) failures.push('Supabase API origin must not be externally_connectable for payment callbacks.');
if (!backgroundSource.includes("senderParsed.hostname === 'besthistory.boxuezhiban.cn'") || !backgroundSource.includes("senderParsed.pathname === '/checkout/'")) failures.push('Background must trust only the exact BestHistory HTTPS checkout path for payment callbacks.');
if (backgroundSource.includes("senderParsed.pathname === '/functions/v1/billing-checkout-page'")) failures.push('Background must not trust the obsolete Supabase Edge HTML checkout page.');
if (!appSource.includes('billingService.getRecentOrders(5)')) failures.push('Startup payment recovery must scan recent pre-bound transactions so a newer draft cannot hide an older completed purchase.');
const pricingUiFragments = ['billing-pricing-wrap','billing-pricing-grid','billingPricingSave30','billingPricingEffective','billingPricingBuyAnnual'];
for (const fragment of pricingUiFragments) if (!appSource.includes(fragment)) failures.push(`Extension pricing UI missing /pricing/ parity fragment: ${fragment}`);

const checkoutPagePath = path.join(root, 'Docs/checkout/index.html');
if (!fs.existsSync(checkoutPagePath)) failures.push('Missing Docs/checkout/index.html Paddle checkout host page.');
else {
  const checkoutPage = fs.readFileSync(checkoutPagePath, 'utf8');
  const requiredCheckoutFragments = [
    'https://cdn.paddle.com/paddle/v2/paddle.js',
    'billing-public-config',
    'config.clientToken',
    'config.environment',
    "QUERY.get('_ptxn')",
    'Paddle.Checkout.open({',
    'transactionId:TXN',
    'billing-checkout-status',
    "event?.name==='checkout.completed'",
  ];
  for (const fragment of requiredCheckoutFragments) if (!checkoutPage.includes(fragment)) failures.push(`Checkout page missing required environment-neutral Paddle fragment: ${fragment}`);
  if (/test_[A-Za-z0-9]{20,}/.test(checkoutPage)) failures.push('Checkout page must not hard-code a Sandbox client token.');
  if (/PADDLE_API_KEY|PADDLE_WEBHOOK_SECRET|SUPABASE_SERVICE_ROLE_KEY|pdl_(?:sdbx|live)_apikey_|pdl_ntfset_/.test(checkoutPage)) failures.push('Privileged Paddle/Supabase secrets must never appear in the public checkout page.');

// The obsolete Supabase Edge HTML checkout page may remain as dead source temporarily,
// but it is no longer a runtime dependency or release requirement.
  const checkoutMatch = checkoutPage.match(/const T=(\{.*?\});\nconst API_BASE=/s);
  if (!checkoutMatch) failures.push('Could not parse checkout-page translations.');
  else {
    try {
      const checkoutTranslations = JSON.parse(checkoutMatch[1]);
      const expectedWebLocales = ['zh-CN','zh-TW','en','ja','ko','es','pt','fr','de','it','nl','ru','ar','hi','id','tr','bn','vi'];
      const actualLocales = Object.keys(checkoutTranslations);
      if (actualLocales.length !== 18 || expectedWebLocales.some((locale) => !checkoutTranslations[locale])) failures.push(`Checkout page must contain all 18 locales; found ${actualLocales.length}.`);
      const englishKeys = Object.keys(checkoutTranslations.en || {}).sort();
      for (const locale of expectedWebLocales) {
        const localeKeys = Object.keys(checkoutTranslations[locale] || {}).sort();
        if (localeKeys.join('\n') !== englishKeys.join('\n')) failures.push(`Checkout page locale ${locale} does not contain the complete translation key set.`);
      }
    } catch (error) {
      failures.push(`Checkout-page translation JSON is invalid: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

const createPaddleTransactionFunction = fs.readFileSync(path.join(root, 'supabase/functions/billing-create-paddle-transaction/index.ts'), 'utf8');
if (!createPaddleTransactionFunction.includes("paddleRequest('/transactions'")) failures.push('Trusted backend must create the Paddle transaction before checkout.');
if (!createPaddleTransactionFunction.includes('provider_order_id: transactionId') || !createPaddleTransactionFunction.includes('user_id: user.id')) failures.push('Paddle transaction ID must be persisted against BestHistory user_id before checkout URL is returned.');
if (!createPaddleTransactionFunction.includes("new URL('https://besthistory.boxuezhiban.cn/checkout/')")) failures.push('Server-created Paddle transaction must return the independently verified BestHistory HTTPS checkout host.');
if (createPaddleTransactionFunction.includes("/functions/v1/billing-checkout-page")) failures.push('Transaction creation must not return the Supabase Edge HTML checkout page.');
if (createPaddleTransactionFunction.includes("checkout: { url:")) failures.push('Transaction creation must use the pre-created transaction ID, not a Paddle-generated checkout URL.');
if (/checkout_ref/.test(createPaddleTransactionFunction)) failures.push('New server-created Paddle transaction flow must not depend on checkout_ref.');

const transactionStatusFunction = fs.readFileSync(path.join(root, 'supabase/functions/billing-checkout-status/index.ts'), 'utf8');
if (!transactionStatusFunction.includes('finalizePreboundPaddleTransaction')) failures.push('Checkout status must use the deterministic exact-transaction finalizer.');
const billingSyncSource = fs.readFileSync(path.join(root, 'supabase/functions/_shared/billing-sync.ts'), 'utf8');
if (!billingSyncSource.includes('finalizePreboundPaddleTransaction')) failures.push('Missing exact Paddle transaction finalizer.');
if (!billingSyncSource.includes("paddleRequest(`/transactions/${encodeURIComponent(transactionId)}`)")) failures.push('Exact finalizer must verify the pre-bound transaction with Paddle server API.');
if (!billingSyncSource.includes('PADDLE_BOUND_PLAN_MISMATCH')) failures.push('Exact finalizer must verify the paid Paddle price matches the pre-bound BestHistory plan.');

const paddleWebhookSource = fs.readFileSync(path.join(root, 'supabase/functions/billing-paddle-webhook/index.ts'), 'utf8');
for (const eventType of [
  'subscription.created',
  'subscription.updated',
  'subscription.activated',
  'subscription.trialing',
  'subscription.past_due',
  'subscription.paused',
  'subscription.resumed',
  'subscription.canceled',
]) {
  if (!paddleWebhookSource.includes(`'${eventType}'`)) failures.push(`Paddle webhook must handle ${eventType} for paid entitlement lifecycle safety.`);
}
if (!paddleWebhookSource.includes('SUBSCRIPTION_EVENTS.has(event.event_type)')) failures.push('Paddle subscription lifecycle events must route through the canonical subscription sync path.');

const i18nSource = fs.readFileSync(path.join(root, 'src/i18n/messages.ts'), 'utf8');
// STEP5B_V2_PRODUCTION_AUTH_COPY_GUARD
const accountProviderNoteCount = (i18nSource.match(/accountFutureProvidersNote:/g) || []).length;
const authEmailNotAuthorizedCount = (i18nSource.match(/authEmailNotAuthorized:/g) || []).length;
if (accountProviderNoteCount !== 18) failures.push(`Expected production account provider notes in all 18 locales; found ${accountProviderNoteCount}.`);
if (authEmailNotAuthorizedCount !== 18) failures.push(`Expected authEmailNotAuthorized copy in all 18 locales; found ${authEmailNotAuthorizedCount}.`);
if (!i18nSource.includes("accountFutureProvidersNote:'Google sign-in is available now.")) failures.push('English account copy must state that Google sign-in is available now.');
if (!i18nSource.includes("accountFutureProvidersNote:'Google 登录现已可用；")) failures.push('Simplified Chinese account copy must state that Google sign-in is available now.');
if (/accountFutureProvidersNote:'Google, Microsoft, and Apple will be added/.test(i18nSource) || /accountFutureProvidersNote:'后续将在同一 BestHistory 账户体系中加入 Google、Microsoft 和 Apple/.test(i18nSource)) failures.push('Account UI still describes Google sign-in as a future feature.');
if (/authEmailNotAuthorized:[^\n]*Supabase/i.test(i18nSource)) failures.push('Production auth error copy must not mention the obsolete Supabase test/project-team mail restriction.');

const localeType = i18nSource.match(/export type Locale = ([^;]+);/)?.[1] || '';
const localeCount = (localeType.match(/'[^']+'/g) || []).length;
if (localeCount !== 18) failures.push(`Expected 18 supported locales, found ${localeCount}.`);
if (!i18nSource.includes('const tabOrganizerTranslations: Record<Locale, Record<TabOrganizerKey, string>>')) failures.push('Tab organizer translations must be complete for every locale; Partial/fallback packs are not allowed.');
if (!i18nSource.includes('key in tabOrganizerTranslations.en\n    ? tabOrganizerTranslations[locale][key as TabOrganizerKey]')) failures.push('Tab organizer translator must not fall back to English for missing locale strings.');
if (!i18nSource.includes('const billingUiTranslations: Record<Locale, Record<BillingUiKey, string>>')) failures.push('Billing translations must be complete for every locale.');
if (!i18nSource.includes('key in billingUiTranslations.en\n    ? billingUiTranslations[locale][key as BillingUiKey]')) failures.push('Billing translator must not fall back to English for missing locale strings.');
if (!i18nSource.includes('const entitlementUiTranslations: Record<Locale, Record<EntitlementUiKey, string>>')) failures.push('Entitlement/account membership translations must be complete for every locale.');
if (!i18nSource.includes('accountPaidYearly') || !i18nSource.includes('accountPaidUntil') || !i18nSource.includes('accountPaidRenewalCanceled')) failures.push('Paid membership UI translations are incomplete.');
const accountAppSource = fs.readFileSync(path.join(root, 'entrypoints/app/App.tsx'), 'utf8');
const billingClientSource = fs.readFileSync(path.join(root, 'src/billing/billing-service.ts'), 'utf8');
if (!billingClientSource.includes(".from('subscriptions')") || !billingClientSource.includes(".eq('status', 'paid')")) failures.push('Account membership details must read the canonical paid order/subscription metadata.');
if (billingClientSource.includes(".eq('provider_environment', 'sandbox')")) failures.push('Extension membership/order reads must not be hard-wired to Sandbox; Live migration should be server-side without another UI rewrite.');
if (!accountAppSource.includes('billingService.getMembership()') || !accountAppSource.includes('account-membership-card')) failures.push('Account UI must load and render paid membership details.');
if (accountAppSource.includes("t('billingLatestMock')")) failures.push('User-facing account UI must not show a stale latest test-order status as membership state.');
if (!accountAppSource.includes('BillingMembership')) failures.push('Account app must import the BillingMembership type used by paid membership state.');
if (accountAppSource.includes('billing-pricing-notice') || accountAppSource.includes('billing-debug-panel billing-pricing-debug')) failures.push('Production extension pricing UI must not render Sandbox/test notices or developer billing debug panels.');
if (/billingPreviewBadge:\s*[\"\']PADDLE SANDBOX/i.test(i18nSource)) failures.push('Extension upgrade UI must use production-facing Pro labels, not Paddle Sandbox labels.');
if (!i18nSource.includes('const proTabIntelligenceTranslations: Record<Locale, Record<ProTabIntelligenceKey, string>>')) failures.push('Pro tab intelligence translations must be complete for every locale.');
if (!i18nSource.includes('key in proTabIntelligenceTranslations.en\n    ? proTabIntelligenceTranslations[locale][key as ProTabIntelligenceKey]')) failures.push('Pro tab intelligence translator must not fall back to English for missing locale strings.');
if (!i18nSource.includes('const aiProTranslations: Record<Locale, Record<AiProKey, string>>')) failures.push('Pro AI translations must be complete for every locale.');
if (!i18nSource.includes('key in aiProTranslations.en\n    ? aiProTranslations[locale][key as AiProKey]')) failures.push('Pro AI translator must not fall back to English for missing locale strings.');

const aiClientSource = fs.readFileSync(path.join(root, 'src/ai/ai-service.ts'), 'utf8');
if (!aiClientSource.includes("supabase.functions.invoke('ai-recall-expand'")) failures.push('AI Recall must call the trusted Supabase backend.');
if (!aiClientSource.includes("supabase.functions.invoke('ai-organize-websites'")) failures.push('AI website organization must call the trusted Supabase backend.');
const extensionAiText = [aiClientSource, fs.readFileSync(path.join(root, 'src/ai/recall-search.ts'), 'utf8'), fs.readFileSync(path.join(root, 'entrypoints/app/App.tsx'), 'utf8')].join('\n');
if (/AI_API_KEY|AI_BASE_URL|AI_MODEL|ARK_API_KEY|DOUBAO_API_KEY/.test(extensionAiText)) failures.push('AI provider secret/config names must not be referenced by extension runtime code.');
const aiSharedSource = fs.readFileSync(path.join(root, 'supabase/functions/_shared/ai.ts'), 'utf8');
const aiRecallFunction = fs.readFileSync(path.join(root, 'supabase/functions/ai-recall-expand/index.ts'), 'utf8');
const aiOrganizeFunction = fs.readFileSync(path.join(root, 'supabase/functions/ai-organize-websites/index.ts'), 'utf8');
if (!aiRecallFunction.includes('await requireProUser(req)') || !aiOrganizeFunction.includes('await requireProUser(req)')) failures.push('Every Pro AI Edge Function must verify a Pro/Trial entitlement before provider calls.');
if (!aiSharedSource.includes('/responses')) failures.push('AI provider adapter must use the configured Responses API boundary.');
if (!aiSharedSource.includes("thinking: { type: 'disabled' }")) failures.push('AI provider adapter must disable deep thinking for low-cost BestHistory A/B tasks.');
if (aiSharedSource.includes("response_format: { type: 'json_object' }")) failures.push('Ark Responses API must not send the unsupported top-level response_format field.');

console.log('BestHistory release preflight');
console.log(`Version: ${packageJson.version}`);
console.log(`Scanned source files: ${files.length}`);
for (const warning of warnings) console.log(`WARNING: ${warning}`);
if (failures.length) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(1);
}
console.log('SECRET_SCAN=PASS');
console.log('VERSION_CHECK=PASS');
console.log('POPUP_CHECK=PASS');
console.log('I18N_18_LOCALE_CHECK=PASS');
console.log('PADDLE_CLIENT_BOUNDARY_CHECK=PASS');
console.log('AI_CLIENT_BOUNDARY_CHECK=PASS');
console.log('RELEASE_PREFLIGHT=PASS');
