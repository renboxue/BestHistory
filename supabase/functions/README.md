> **Historical implementation notes:** The following section describes the earlier Step 39 Paddle Sandbox development milestone; it is not a current production configuration guide. For current self-host cautions, use `supabase/selfhost/README.md`.

# BestHistory trusted Edge Functions

Current billing phase: **Step 39 — Paddle Sandbox checkout_ref binding (P1–P5)**.

## Current Paddle checkout flow

- `billing-create-checkout-context` — authenticated extension request -> creates a 32-byte opaque `checkout_ref`, stores only SHA-256 hash, 30-minute TTL, returns the official BestHistory pricing URL.
- `billing-get-checkout-context` — public endpoint used only by `https://besthistory.boxuezhiban.cn/pricing/`; validates the opaque ref and returns the linked account email/locale. It never returns BestHistory user UUID or login tokens.
- `billing-checkout-status` — public ref-bound polling endpoint. In Step 39 it normally remains pending because payment webhook/entitlement activation is completed in Step 40.
- `billing-paddle-webhook` — existing trusted webhook implementation is retained but is **not deployed/declared complete by Step 39**. Step 40 will align it with the final entitlement resolver, adjustments, refund/chargeback rules and 5-second signature tolerance before end-to-end activation testing.
- `billing-customer-portal` — prepared server-only Customer Portal helper; final account-page wiring is a later payment step.

The old `billing-create-checkout` server-created Paddle transaction path is obsolete and removed. The browser extension now opens the BestHistory website; only the website loads Paddle.js.

## Paddle Sandbox website

Public static pricing source:

- `docs/pricing/index.html`
- `https://besthistory.boxuezhiban.cn/pricing/`

The page:

- requires `?ref=<opaque checkout_ref>` before purchase buttons are enabled;
- validates that ref against `billing-get-checkout-context`;
- uses the safe Paddle Sandbox client-side token;
- supports Monthly / Annual / Lifetime;
- passes `app_code=besthistory`, `checkout_ref`, and `billing_plan` in Paddle `customData`;
- uses the linked BestHistory account email as Paddle customer email;
- treats `checkout.completed` only as UI feedback and never grants Pro itself;
- supports all 18 BestHistory public-site languages.

## Step 39 secrets

No Paddle API key or webhook secret is required for P1–P5 because Paddle.js creates the Sandbox checkout on the BestHistory website.

The following remain server-only and are required only when Step 40 is deployed/tested:

- `PADDLE_API_KEY`
- `PADDLE_WEBHOOK_SECRET`
- `PADDLE_SANDBOX_TEST_USER_IDS` for Sandbox entitlement provisioning safety

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are provided to hosted Edge Functions by Supabase.

## Sandbox safety

Creating a Sandbox checkout context is allowed for any authenticated BestHistory account so P1–P5 can be tested without a special server secret. This does **not** grant Pro.

Sandbox entitlement provisioning remains protected in the webhook path by `PADDLE_SANDBOX_TEST_USER_IDS`. Step 40 must configure that allowlist before any Sandbox webhook is allowed to change paid entitlement.

## Step 38 AI functions

- `ai-recall-expand`
- `ai-organize-websites`

These remain independent of billing-provider implementation and continue to use the existing entitlement resolver.
