import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = process.cwd();

const expectedLocales = [
  'zh-CN','zh-TW','en','es','pt-BR','fr','de','it','nl','ja','ko','ru','ar','hi','id','tr','bn','vi',
];
const chromeLocaleMap = {
  'zh-CN':'zh_CN','zh-TW':'zh_TW','en':'en','es':'es','pt-BR':'pt_BR','fr':'fr','de':'de','it':'it','nl':'nl',
  'ja':'ja','ko':'ko','ru':'ru','ar':'ar','hi':'hi','id':'id','tr':'tr','bn':'bn','vi':'vi',
};

const messagesPath = path.join(root, 'src/i18n/messages.ts');
const systemPath = path.join(root, 'src/i18n/system-messages.ts');
const wxtPath = path.join(root, 'wxt.config.ts');
const pkgPath = path.join(root, 'package.json');
const appPath = path.join(root, 'entrypoints/app/App.tsx');
const billingPath = path.join(root, 'src/billing/billing-service.ts');
const localesDir = path.join(root, 'public/_locales');

const failures = [];
const warnings = [];
const pass = (label) => console.log(`${label}=PASS`);
const fail = (msg) => failures.push(msg);

for (const p of [messagesPath, systemPath, wxtPath, pkgPath, appPath, billingPath]) {
  if (!fs.existsSync(p)) fail(`Missing required file: ${path.relative(root,p)}`);
}
if (failures.length) {
  for (const x of failures) console.error(`FAIL: ${x}`);
  process.exit(1);
}

const messagesSource = fs.readFileSync(messagesPath, 'utf8');
const systemSource = fs.readFileSync(systemPath, 'utf8');
const wxtSource = fs.readFileSync(wxtPath, 'utf8');
const appSource = fs.readFileSync(appPath, 'utf8');
const billingSource = fs.readFileSync(billingPath, 'utf8');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

if (pkg.version !== '1.1.0') fail(`package.json version is ${pkg.version}, expected 1.1.0`);
if (!/version\s*:\s*['"]1\.1\.0['"]/.test(wxtSource)) fail('wxt.config.ts manifest version is not 1.1.0');
if (!/default_locale\s*:\s*['"]en['"]/.test(wxtSource)) fail('manifest default_locale=en is missing');
if (!/name\s*:\s*['"]__MSG_extName__['"]/.test(wxtSource)) fail('manifest name is not __MSG_extName__');
if (!/description\s*:\s*['"]__MSG_extDescription__['"]/.test(wxtSource)) fail('manifest description is not __MSG_extDescription__');
if (!/default_title\s*:\s*['"]__MSG_extActionTitle__['"]/.test(wxtSource)) fail('manifest action title is not localized');
if (!/['"]identity['"]/.test(wxtSource)) fail('Chrome identity permission is missing; Google login would break');
if (/upext\.chrome\.360\.cn/.test(wxtSource)) fail('360 update_url leaked into Chrome Web Store channel');
if (!appSource.includes('auth-google-button') || !appSource.includes('signInWithGoogle')) fail('Google login UI/action is missing');
if (!billingSource.includes('billing-create-dodo-checkout')) fail('Active Dodo checkout client is missing');
if (!billingSource.includes('billing-create-dodo-customer-portal')) fail('Dodo subscription management portal is missing');
if (failures.length === 0) pass('CHANNEL_AND_VERSION');

function createAst(source, fileName) {
  return ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}
function propertyName(node) {
  if (!node) return null;
  if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) return String(node.text);
  return null;
}
function objectKeysForVariable(sf, variableName) {
  const keys = [];
  function walk(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === variableName && node.initializer && ts.isObjectLiteralExpression(node.initializer)) {
      for (const prop of node.initializer.properties) {
        const k = propertyName(prop.name);
        if (k) keys.push(k);
      }
    }
    ts.forEachChild(node, walk);
  }
  walk(sf);
  return keys;
}
function stringLiteralsFromMessageKeyAliases(sf) {
  const out = new Set();
  function scanType(node) {
    if (ts.isLiteralTypeNode(node) && ts.isStringLiteral(node.literal)) out.add(node.literal.text);
    ts.forEachChild(node, scanType);
  }
  function walk(node) {
    if (ts.isTypeAliasDeclaration(node) && (node.name.text === 'MessageKey' || /Key$/.test(node.name.text))) scanType(node.type);
    ts.forEachChild(node, walk);
  }
  walk(sf);
  return [...out];
}

const messageAst = createAst(messagesSource, 'messages.ts');
const systemAst = createAst(systemSource, 'system-messages.ts');
const allKeys = new Set([
  ...objectKeysForVariable(messageAst, 'en'),
  ...stringLiteralsFromMessageKeyAliases(messageAst),
  ...stringLiteralsFromMessageKeyAliases(systemAst),
]);
if (allKeys.size < 450) fail(`Unexpectedly small message-key universe: ${allKeys.size}`);

// Evaluate the real translator, not just source fragments. This catches missing
// locale values even when the UI is split across many strongly typed catalogs.
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'besthistory-i18n-v110-'));
try {
  const compilerOptions = { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext };
  const systemJs = ts.transpileModule(systemSource, { compilerOptions, fileName: 'system-messages.ts' }).outputText;
  let messagesJs = ts.transpileModule(messagesSource, { compilerOptions, fileName: 'messages.ts' }).outputText;
  messagesJs = messagesJs.replace(/from ['"]\.\/system-messages['"]/g, "from './system-messages.mjs'");
  fs.writeFileSync(path.join(tempDir, 'system-messages.mjs'), systemJs, 'utf8');
  fs.writeFileSync(path.join(tempDir, 'messages.mjs'), messagesJs, 'utf8');
  const mod = await import(pathToFileURL(path.join(tempDir, 'messages.mjs')).href + `?t=${Date.now()}`);
  const actualLocales = mod.supportedLocales.map((x) => x.id);
  if (JSON.stringify(actualLocales) !== JSON.stringify(expectedLocales)) {
    fail(`supportedLocales mismatch: ${actualLocales.join(', ')}`);
  }

  const placeholderSignature = (value) => [...String(value).matchAll(/\{[A-Za-z0-9_]+\}/g)].map((m) => m[0]).sort().join('|');
  const enT = mod.createTranslator('en');
  let sameAsEnglish = 0;
  for (const locale of expectedLocales) {
    const t = mod.createTranslator(locale);
    for (const key of allKeys) {
      const value = t(key);
      const english = enT(key);
      if (typeof value !== 'string' || !value.trim() || value === key) {
        fail(`Unresolved translation: ${locale}.${key}`);
        continue;
      }
      if (placeholderSignature(value) !== placeholderSignature(english)) {
        fail(`Placeholder mismatch: ${locale}.${key} :: EN=${english} :: LOCAL=${value}`);
      }
      if (locale !== 'en' && value === english && /[A-Za-z]{4}/.test(english) && english.length >= 8) sameAsEnglish += 1;
    }
  }
  console.log(`I18N_LOCALES=${actualLocales.length}`);
  console.log(`I18N_MESSAGE_KEYS=${allKeys.size}`);
  console.log(`I18N_SAME_AS_ENGLISH_TECHNICAL_OR_SHARED=${sameAsEnglish}`);
  if (failures.length === 0) pass('I18N_18_RUNTIME');
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

// Billing/payment/renewal audit. Current production checkout is Dodo. Stale
// Paddle Sandbox wording in the active UI was a real v1.0.0 localization defect.
const billingBlockStart = messagesSource.indexOf('const billingUiTranslations');
const billingBlockEnd = messagesSource.indexOf('type AiProKey', billingBlockStart);
const billingBlock = billingBlockStart >= 0 && billingBlockEnd > billingBlockStart
  ? messagesSource.slice(billingBlockStart, billingBlockEnd)
  : '';
if (!billingBlock) fail('Could not isolate billingUiTranslations');
if (/Paddle(?:\.js)?|PADDLE SANDBOX|Paddle Sandbox/i.test(billingBlock)) fail('Stale Paddle/Paddle Sandbox copy remains in active billing UI translations');
for (const key of [
  'billingLatestMock','billingPricingNoticeTitle','billingArchitectureNote','billingProviderMock',
  'billingMockProviderDescription','billingMockSuccessDesc','billingMockCanceledDesc','billingNoRealCharge',
]) {
  const count = (billingBlock.match(new RegExp(`\\b${key}\\s*:`, 'g')) || []).length;
  if (count !== 18) fail(`Billing key ${key} appears ${count} times; expected 18 locale values`);
}
for (const key of [
  'accountManageSubscription','accountManageSubscriptionHint','accountManageSubscriptionOpening','accountManageSubscriptionError',
  'accountPaidUntil','accountPaidAutoRenew','accountPaidRenewalCanceled','accountPaidPastDue','accountPaidEnded',
]) {
  const count = (messagesSource.match(new RegExp(`\\b${key}\\s*:`, 'g')) || []).length;
  if (count !== 18) fail(`Subscription/entitlement key ${key} appears ${count} times; expected 18 locale values`);
}
if (failures.length === 0) pass('PAYMENT_I18N');

// Official Chrome i18n layer.
if (!fs.existsSync(localesDir)) fail('public/_locales is missing');
else {
  const actualDirs = fs.readdirSync(localesDir, { withFileTypes: true }).filter((x) => x.isDirectory()).map((x) => x.name).sort();
  const expectedDirs = Object.values(chromeLocaleMap).sort();
  if (JSON.stringify(actualDirs) !== JSON.stringify(expectedDirs)) fail(`Chrome _locales directories mismatch: ${actualDirs.join(', ')}`);
  for (const locale of expectedLocales) {
    const dir = chromeLocaleMap[locale];
    const file = path.join(localesDir, dir, 'messages.json');
    if (!fs.existsSync(file)) { fail(`Missing Chrome locale file: ${dir}/messages.json`); continue; }
    let json;
    try { json = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { fail(`Invalid JSON in ${dir}/messages.json: ${e.message}`); continue; }
    for (const key of ['extName','extDescription','extActionTitle']) {
      if (!json[key] || typeof json[key].message !== 'string' || !json[key].message.trim()) fail(`Missing ${key}.message in ${dir}/messages.json`);
    }
  }
}
if (failures.length === 0) pass('CHROME_OFFICIAL_I18N');

// Light scan for untranslated raw provider/test copy in the user-facing app.
if (/Paddle Sandbox|Paddle\.js|Latest test order|simulated checkout/i.test(messagesSource)) fail('Legacy payment test copy remains in messages.ts');
if (failures.length === 0) pass('LEGACY_PAYMENT_COPY_CLEAN');

if (warnings.length) for (const x of warnings) console.warn(`WARN: ${x}`);
if (failures.length) {
  console.error(`I18N_AUDIT_FAIL_COUNT=${failures.length}`);
  for (const x of failures) console.error(`FAIL: ${x}`);
  process.exit(1);
}
console.log('I18N_AUDIT_FAIL_COUNT=0');
console.log('BESTHISTORY_V1_1_0_I18N_AUDIT=PASS');
