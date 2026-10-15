# Source build and self-host notes

BestHistory 1.1.0 **uses the original Official application UI and business modules**.
This is not the separate O1A preview or the fictional-data website Demo.

## Build preparation

- Node.js and pnpm versions compatible with the lockfile are required.
- Copy `.env.example` to `.env.local` and supply **your own** public Supabase URL
  and publishable key if you want login, billing or AI integrations.
- `pnpm install --frozen-lockfile` then `pnpm compile`, `pnpm build`,
  and `pnpm build:firefox`.
- Without a backend configuration, a public build uses the non-routable
  `*.unconfigured.invalid` placeholders and has no Supabase host permissions.
  It cannot use hosted login, official AI or paid services. Local browser
  capabilities may work; their full E2E verification is pending.
- To build the **Official** release, the maintainer supplies the existing
  hosted public URL, publishable key and checkout origin from a private
  environment. The published store builds are not affected by this source patch.
- Firefox AMO signing uses a fixed Official ID in `scripts/build-firefox-release.mjs`;
  private forks should NOT upload under that identity. Create their own identity.

## Important boundaries

- Payment API keys and webhook signing secrets belong only in Supabase Secrets.
- `sb_publishable_` is public by design, **not** an admin or service-role key.
- Do not publish `.env.local`, `.bhbackup`, release signatures, cookies, customer data,
  SQL data exports or credential files.
- Historical SQL migrations are preserved as written. Do not rewrite executed
  migration versions; clean historical payment catalog separately in your own instance.
- Real Website Demo lives at `/docs/demo/` on the public docs website and uses
  simulated AI/Vault. The plugin source is the full WXT app in `entrypoints/` and `src/`.

## Current verification boundaries

Chrome and Firefox WXT builds and a targeted secret/history scan completed against the release-preparation snapshot on 2026-10-15. These checks are not exhaustive security certification. Independent self-host Supabase migrations/RLS/JWT, OAuth, AI and billing have **not** been validated end-to-end. Avoid deploying payment flows before additional review. See the repository release notes for the source snapshot and operational boundaries.
