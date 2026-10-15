import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const downloads = '/Users/renboxue/Documents/BestHistory/Downloads';
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = String(packageJson.version || '1.0.0');
const outputDir = path.join(root, '.output', 'firefox-mv3');
const manifestPath = path.join(outputDir, 'manifest.json');
const releaseZip = path.join(downloads, `BestHistory-v${version}-firefox.zip`);
const sourceZip = path.join(downloads, `BestHistory-v${version}-firefox-source.zip`);

function run(cmd, args, options = {}) {
  console.log(`$ ${cmd} ${args.join(' ')}`);
  execFileSync(cmd, args, { cwd: root, stdio: 'inherit', ...options });
}

function ensure(condition, message) {
  if (!condition) throw new Error(message);
}

function rmIfExists(file) {
  try { fs.rmSync(file, { recursive: true, force: true }); } catch {}
}

console.log('===== Firefox MV3 build =====');
run('pnpm', ['exec', 'wxt', 'build', '-b', 'firefox', '--mv3']);

ensure(fs.existsSync(manifestPath), `Firefox manifest missing: ${manifestPath}`);

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
ensure(manifest.manifest_version === 3, `Expected MV3, got ${manifest.manifest_version}`);

manifest.incognito = 'not_allowed';

// Firefox does not support Chromium's _favicon permission/endpoint.
// BestHistory still keeps favicon fallback data from tabs/history where available.
if (Array.isArray(manifest.permissions)) {
  manifest.permissions = manifest.permissions.filter((item) => item !== 'favicon');
}

// Web-page -> extension messaging through externally_connectable is not supported
// in Firefox. Dodo checkout completion is already verified by server-side polling/
// webhook state, so this Chrome-only bridge is not required for Firefox.
delete manifest.externally_connectable;

// Fixed AMO add-on ID: required for MV3 signing and stable identity/OAuth redirect.
manifest.browser_specific_settings = {
  ...(manifest.browser_specific_settings || {}),
  gecko: {
    ...((manifest.browser_specific_settings || {}).gecko || {}),
    id: 'besthistory@boxuezhiban.cn',
    strict_min_version: '140.0',
    data_collection_permissions: {
      // Conservative, explicit declaration for BestHistory's optional account,
      // AI recall/organization and paid-entitlement features. Local browser
      // history itself remains local unless the user invokes a network feature.
      required: [
        'personallyIdentifyingInfo',
        'authenticationInfo',
        'browsingActivity',
        'searchTerms',
        'financialAndPaymentInfo'
      ]
    }
  }
};

manifest.homepage_url ||= 'https://besthistory.boxuezhiban.cn/';

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

console.log('===== Firefox manifest validation =====');
const reread = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
ensure(reread.browser_specific_settings?.gecko?.id === 'besthistory@boxuezhiban.cn', 'Missing fixed Gecko ID');
ensure(reread.browser_specific_settings?.gecko?.strict_min_version === '140.0', 'Firefox minimum version must be 140.0');
ensure(reread.incognito === 'not_allowed', 'Firefox private browsing must be disabled for this release');
ensure(!reread.externally_connectable, 'Chrome-only externally_connectable must be absent');
ensure(!(reread.permissions || []).includes('favicon'), 'Firefox manifest must not request favicon permission');
ensure((reread.permissions || []).includes('history'), 'history permission missing');
ensure((reread.permissions || []).includes('storage'), 'storage permission missing');
ensure((reread.permissions || []).includes('identity'), 'identity permission missing');
ensure(Array.isArray(reread.background?.scripts) || reread.background?.page, 'Firefox MV3 background document/scripts missing');

console.log('FIREFOX_MANIFEST=PASS');

console.log('===== web-ext lint =====');
run('pnpm', ['exec', 'web-ext', 'lint', '--source-dir', outputDir]);
console.log('WEB_EXT_LINT=PASS');

console.log('===== Package AMO upload ZIP =====');
fs.mkdirSync(downloads, { recursive: true });
rmIfExists(releaseZip);
execFileSync('zip', ['-q', '-r', releaseZip, '.'], {
  cwd: outputDir,
  stdio: 'inherit',
  env: { ...process.env, COPYFILE_DISABLE: '1' },
});
ensure(fs.existsSync(releaseZip) && fs.statSync(releaseZip).size > 0, 'Firefox release ZIP not created');
console.log(`FIREFOX_ZIP=${releaseZip}`);

console.log('===== Secret scan before reviewer source ZIP =====');
const secretPatterns = [
  /pdl_(?:sdbx|live)_apikey_[A-Za-z0-9_-]{16,}/,
  /pdl_ntfset_[A-Za-z0-9_-]{16,}/,
  /whsec_[A-Za-z0-9_-]{16,}/,
  /DODO_PAYMENTS_API_KEY\s*=\s*\S+/,
  /SUPABASE_SERVICE_ROLE_KEY\s*=\s*\S+/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/
];
const excludedDirs = new Set([
  '.git','node_modules','.output','.wxt','Downloads','dist','build',
  '.besthistory-local-backups','.besthistory-backups'
]);

function shouldSkip(rel, dirent) {
  const parts = rel.split(path.sep);
  if (parts.some((p) => excludedDirs.has(p))) return true;
  const base = path.basename(rel);
  if (base === '.DS_Store' || base === '.npmrc') return true;
  if (/^\.env(?:\.|$)/.test(base)) return true;
  if (/\.(?:pem|key|p12|pfx)$/i.test(base)) return true;
  if (rel.startsWith(`supabase${path.sep}.temp${path.sep}`)) return true;
  return false;
}

function walk(dir, prefix = '') {
  const out = [];
  for (const dirent of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? path.join(prefix, dirent.name) : dirent.name;
    if (shouldSkip(rel, dirent)) continue;
    const abs = path.join(dir, dirent.name);
    if (dirent.isDirectory()) out.push(...walk(abs, rel));
    else if (dirent.isFile()) out.push(rel);
  }
  return out;
}

const sourceFiles = walk(root);
for (const rel of sourceFiles) {
  const abs = path.join(root, rel);
  const ext = path.extname(rel).toLowerCase();
  if (!['.ts','.tsx','.js','.mjs','.json','.md','.txt','.sql','.css','.html','.yml','.yaml','.toml'].includes(ext)) continue;
  let text = '';
  try { text = fs.readFileSync(abs, 'utf8'); } catch { continue; }
  for (const pattern of secretPatterns) {
    if (pattern.test(text)) throw new Error(`Potential secret detected in source package candidate: ${rel}`);
  }
}
console.log('SOURCE_SECRET_SCAN=PASS');

console.log('===== Package reviewer source ZIP =====');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'besthistory-firefox-source-'));
try {
  for (const rel of sourceFiles) {
    const src = path.join(root, rel);
    const dst = path.join(tempRoot, rel);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
  }

  const reviewNote = `# BestHistory Firefox source review

Version: ${version}

This source package corresponds to the Firefox AMO package generated from the same working tree.

## Build environment

- Node.js 22+
- pnpm
- macOS/Linux shell
- WXT 0.21.x

## Rebuild

\`\`\`bash
pnpm install --frozen-lockfile
pnpm compile
pnpm exec wxt build -b firefox --mv3
node scripts/build-firefox-release.mjs
\`\`\`

The release script patches only Firefox-specific manifest fields after WXT emits the Firefox MV3 build:
- stable Gecko ID
- Firefox 140 minimum
- Firefox data-collection declaration
- private browsing disabled
- Chrome-only externally_connectable removed
- Chrome-only favicon permission removed

No remote JavaScript is downloaded or executed by the extension.
`;
  fs.writeFileSync(path.join(tempRoot, 'SOURCE_CODE_REVIEW_FIREFOX.md'), reviewNote, 'utf8');

  rmIfExists(sourceZip);
  execFileSync('zip', ['-q', '-r', sourceZip, '.'], {
    cwd: tempRoot,
    stdio: 'inherit',
    env: { ...process.env, COPYFILE_DISABLE: '1' },
  });
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
ensure(fs.existsSync(sourceZip) && fs.statSync(sourceZip).size > 0, 'Firefox source ZIP not created');
console.log(`FIREFOX_SOURCE_ZIP=${sourceZip}`);

console.log('===== Firefox release complete =====');
console.log('FIREFOX_RELEASE=PASS');
