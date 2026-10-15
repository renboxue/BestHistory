import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const problems = [];
const candidates = ['src/config/supabase.ts','wxt.config.ts','entrypoints/background.ts',
  'supabase/functions/billing-checkout-page/index.ts',
  'supabase/functions/billing-create-paddle-transaction/index.ts',
  'supabase/functions/_shared/checkout-ref.ts'];
for (const f of candidates) {
  const text = fs.readFileSync(path.join(root, f), 'utf8');
  if (/fuepiplrpixvfxctqdpo|sb_publishable_mdRry|test_b87d133e/.test(text))
    problems.push(`Official hosted configuration literal still present in ${f}`);
}
// A valid AGPL release needs the full standard license, not merely an SPDX label.
const license = path.join(root, 'LICENSE');
if (!fs.existsSync(license) || !fs.readFileSync(license,'utf8').includes('GNU AFFERO GENERAL PUBLIC LICENSE'))
  problems.push('Full, unmodified AGPL-3.0-only license text not yet installed');
const blockedNames = [/^\.env(?:\.|$)/,/\.(pem|key|p12|pfx)$/i,/\.bhbackup$/i];
function walk(folder) {
  for (const name of fs.readdirSync(folder)) {
    if (['.git','node_modules','.output','.wxt','dist','Downloads'].includes(name)) continue;
    const full = path.join(folder,name), rel = path.relative(root,full), st = fs.lstatSync(full);
    if (st.isSymbolicLink()) { problems.push(`Symlink requires manual review: ${rel}`); continue; }
    if (st.isDirectory()) { walk(full); continue; }
    if (blockedNames.some(r=>r.test(name)) && !name.endsWith('.env.example'))
      problems.push(`Private file: ${rel}`);
    if (/\.(ts|tsx|js|mjs|json|sql|md|html|toml|yml)$/i.test(name)) {
      const content = fs.readFileSync(full,'utf8');
      if (/(sb_secret_[A-Za-z0-9_-]{15,}|pdl_(sdbx|live)_apikey_[A-Za-z0-9_-]{10,}|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----)/.test(content))
        problems.push(`Potential embedded secret: ${rel}`);
    }
  }
}
walk(root);
if (problems.length) { console.error('HOLD: source release is NOT cleared'); for(const p of problems)console.error(' - '+p); process.exitCode=1; }
else console.log('STATIC_SOURCE_AUDIT_PASS (still requires manual rights, Git history and server E2E review)');
