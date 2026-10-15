# Self-hosting BestHistory backend (pre-release review)

This repository contains the **real** Edge Functions and historical SQL migrations.
It does **not** contain BestHistory's hosted database, customer data, signing keys,
AI credits, OAuth app, or payment account. None are granted by AGPL.

1. Create a *new* Supabase project, never use the official BestHistory project.
2. Review all six `supabase/migrations/` files in chronological order, especially the
   historical `20260826154500_step39_paddle_checkout_context.sql` catalog and URL.
   This migration contains historical Sandbox IDs and the official pricing URL.
3. Apply the migrations only in your newly created project (or a local isolated instance).
   Do **not** run migration/reset commands against any existing production project.
4. Replace historic `public.product_config` payment/provider catalog in your own instance;
   these defaults are not live self-host entitlements or valid self-host checkout settings.
   Leave purchases disabled until webhook signatures and the entitlement path are audited.
5. Configure Supabase Auth and Google OAuth for **your own browser extension ID** and
   authorized callback URLs. Configure only necessary Edge secrets privately.
6. Review each Edge Function's JWT setting. Webhooks that are unauthenticated at the
   Supabase gateway **must** verify the provider signature in code; do not disable JWT
   verification on all functions. Edge signatures and RLS require independent tests.
7. Build the browser extension with `WXT_BH_SUPABASE_URL` and
   `WXT_BH_SUPABASE_PUBLISHABLE_KEY` pointing to your project. For checkout messaging,
   `WXT_BH_CHECKOUT_ORIGIN` must be your own HTTPS origin.

**Status:** Documentation only; isolated full migrations/RLS/OAuth/AI/payment E2E are
not yet complete. Treat self-host billing as disabled until you complete those checks.
