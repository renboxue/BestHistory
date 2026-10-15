import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const downloads = '/Users/renboxue/Documents/BestHistory/Downloads';
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = String(pkg.version || '1.0.0');
const outDir = path.join(root, '.output', 'chrome-mv3');
const manifestPath = path.join(outDir, 'manifest.json');
const zipPath = path.join(downloads, `BestHistory-v${version}-chrome-web-store.zip`);
const infoPath = path.join(downloads, `BestHistory-v${version}-chrome-web-store-info.txt`);

function ensure(v, msg) {
  if (!v) throw new Error(msg);
}
function run(cmd, args, cwd = root) {
  console.log(`$ ${cmd} ${args.join(' ')}`);
  execFileSync(cmd, args, { cwd, stdio: 'inherit' });
}
function rm(p) {
  try { fs.rmSync(p, { recursive: true, force: true }); } catch {}
}

console.log('===== Build Chrome MV3 =====');
run('pnpm', ['exec', 'wxt', 'build']);

ensure(fs.existsSync(manifestPath), `manifest missing: ${manifestPath}`);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

ensure(manifest.manifest_version === 3, `Expected MV3, got ${manifest.manifest_version}`);
ensure((manifest.permissions || []).includes('identity'), 'identity permission missing');
ensure((manifest.permissions || []).includes('history'), 'history permission missing');
ensure((manifest.permissions || []).includes('storage'), 'storage permission missing');
ensure((manifest.permissions || []).includes('tabs'), 'tabs permission missing');
ensure((manifest.permissions || []).includes('webNavigation'), 'webNavigation permission missing');
ensure(!manifest.update_url, 'Custom update_url must be absent for Chrome Web Store');
ensure(!JSON.stringify(manifest).includes('upext.chrome.360.cn'), '360 updater leaked into Chrome package');

console.log('CHROME_WEBSTORE_MANIFEST=PASS');

const appSource = fs.readFileSync(path.join(root, 'entrypoints/app/App.tsx'), 'utf8');
const authSource = fs.readFileSync(path.join(root, 'src/auth/auth-service.ts'), 'utf8');

ensure(appSource.includes('auth-google-button'), 'Google login button missing');
ensure(appSource.includes('signInWithGoogle'), 'Google login action missing');
ensure(authSource.includes("provider: 'google'"), 'Supabase Google provider missing');
ensure(authSource.includes('browser.identity.getRedirectURL'), 'Google redirect URL flow missing');
ensure(authSource.includes('browser.identity.launchWebAuthFlow'), 'Google OAuth launch flow missing');

console.log('GOOGLE_LOGIN=PASS');

console.log('===== Security scan =====');
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else files.push(p);
  }
}
walk(outDir);

const secretPatterns = [
  /pdl_(?:sdbx|live)_apikey_[A-Za-z0-9_-]{12,}/,
  /whsec_[A-Za-z0-9_-]{12,}/,
  /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["']?[A-Za-z0-9._-]{12,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/
];

for (const file of files) {
  if (!/\.(js|html|json|css)$/i.test(file)) continue;
  let text = '';
  try { text = fs.readFileSync(file, 'utf8'); } catch { continue; }

  if (/<script[^>]+src=["']https?:\/\//i.test(text)) {
    throw new Error(`Remote script found: ${path.relative(outDir, file)}`);
  }
  if (/\beval\s*\(/.test(text) || /\bnew\s+Function\s*\(/.test(text)) {
    throw new Error(`Dynamic execution found: ${path.relative(outDir, file)}`);
  }
  for (const pattern of secretPatterns) {
    if (pattern.test(text)) {
      throw new Error(`Potential secret found: ${path.relative(outDir, file)}`);
    }
  }
}
console.log('SECURITY_SCAN=PASS');

console.log('===== Package Chrome Web Store ZIP =====');
fs.mkdirSync(downloads, { recursive: true });
rm(zipPath);
execFileSync('zip', ['-q', '-r', zipPath, '.'], {
  cwd: outDir,
  stdio: 'inherit',
  env: { ...process.env, COPYFILE_DISABLE: '1' }
});
ensure(fs.existsSync(zipPath) && fs.statSync(zipPath).size > 0, 'Chrome upload ZIP not created');

const info = `BestHistory ${version} - Chrome Web Store

Google login: ENABLED
Manifest V3: YES
identity permission: YES
360 custom update_url: NO

Upload:
${zipPath}

Supabase Google OAuth redirect:
https://<CHROME_WEB_STORE_EXTENSION_ID>.chromiumapp.org/besthistory-auth

After Chrome Web Store assigns or confirms the extension ID,
make sure the exact redirect URL above is allowed in Supabase Auth.

Website:
https://besthistory.boxuezhiban.cn/

Privacy:
https://besthistory.boxuezhiban.cn/privacy/

Support:
admin@boxuezhiban.cn
`;

fs.writeFileSync(infoPath, info, 'utf8');

console.log(`UPLOAD_ZIP=${zipPath}`);
console.log(`INFO_FILE=${infoPath}`);
console.log('CHROME_WEBSTORE_RELEASE=PASS');
