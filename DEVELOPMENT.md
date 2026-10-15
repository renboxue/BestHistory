# Build BestHistory from source

The browser extension source is **the same BestHistory v1.1.0 application**, not a separate demo or simplified Community edition. The public website and scripted interactive demo live in `docs/` at repository root.

## Local builds

- Use a supported Node.js version and `pnpm` compatible with `pnpm-lock.yaml`.
- `pnpm install --frozen-lockfile`
- `pnpm compile`
- `pnpm build` for Chrome Manifest V3
- `pnpm build:firefox` for Firefox Manifest V3
- In Chrome, load `.output/chrome-mv3` as an unpacked extension in Developer mode.

By default, source builds **do not connect to the hosted BestHistory Supabase project**. Optional hosted integrations require your own `.env.local` derived from `.env.example` and **your own** Supabase deployment. The default build is not guaranteed to provide hosted AI, membership, or billing features. Never put server secrets in `WXT_` client variables.

## Server implementation

The actual Edge Functions and database migrations live in `supabase/functions/` and `supabase/migrations/`. Read [OPEN_SOURCE_SETUP.md](OPEN_SOURCE_SETUP.md) and [supabase/selfhost/README.md](supabase/selfhost/README.md) before attempting a separate deployment. **Independent RLS/JWT, OAuth, AI and billing tests are not yet complete. Do not enable production billing based solely on the included sample setup.** Do not point migration or reset tools at an existing production project.

## Official builds and identity

The maintainer's official Chrome and Firefox releases are distributed separately through browser stores and use private production build configurations. Forks must supply their own app identity, OAuth credentials, provider accounts, and payment configuration. Publishing an extension using the official Firefox ID or portraying a fork as the official BestHistory product is not authorized.

## License

Code is released under `AGPL-3.0-only` in `LICENSE`. BestHistory brand name and branded PNG/SVG artwork are subject to [TRADEMARKS.md](TRADEMARKS.md); no right to misrepresent endorsement is granted. Check third-party licenses before redistributing changes.
