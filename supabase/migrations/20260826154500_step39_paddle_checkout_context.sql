-- BestHistory Step 39
-- Paddle Sandbox checkout-context binding.
-- This preserves the existing entitlement system and introduces only a short-lived opaque checkout reference.

create table if not exists public.billing_checkout_contexts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'paddle' check (provider in ('paddle')),
  provider_environment text not null default 'sandbox' check (provider_environment in ('sandbox', 'live')),
  ref_hash text not null unique,
  ref_prefix text not null,
  account_email text not null,
  locale text not null default 'en',
  expires_at timestamptz not null,
  consumed_at timestamptz,
  last_transaction_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists billing_checkout_contexts_user_id_idx on public.billing_checkout_contexts(user_id);
create index if not exists billing_checkout_contexts_expires_at_idx on public.billing_checkout_contexts(expires_at);

alter table public.billing_checkout_contexts enable row level security;
revoke all on table public.billing_checkout_contexts from anon, authenticated;
-- No browser client SELECT/INSERT/UPDATE policy: only trusted Edge Functions use service-role access.

drop trigger if exists billing_checkout_contexts_set_updated_at on public.billing_checkout_contexts;
create trigger billing_checkout_contexts_set_updated_at
before update on public.billing_checkout_contexts
for each row execute procedure public.set_updated_at();

-- The catalog is public product configuration. These are Paddle catalog IDs, not secrets.
insert into public.product_config(key, value)
values
  ('billing_provider', '{"provider":"paddle","environment":"sandbox"}'::jsonb),
  ('billing_catalog', '{
    "product_id":"pro_01m0y7tygqe3t7cca6jtsh8hqr",
    "pro_monthly":{"provider":"paddle","provider_price_id":"pri_01m0y8qr1c3ffr964bp7a9ss1t","usd":"2.99","trial":false},
    "pro_yearly":{"provider":"paddle","provider_price_id":"pri_01m0y8v82sxexbwyety9276pzr","usd":"24.99","trial":false},
    "pro_lifetime":{"provider":"paddle","provider_price_id":"pri_01m0y8xm16wg5ghbpn9edghjf1","usd":"59.99","trial":false}
  }'::jsonb),
  ('billing_pricing_url', '"https://besthistory.boxuezhiban.cn/pricing/"'::jsonb),
  ('billing_checkout_context_ttl_minutes', '{"minutes":30}'::jsonb),
  ('billing_backend_version', '{"version":3,"provider":"paddle","environment":"sandbox","checkout_binding":"opaque_ref"}'::jsonb)
on conflict (key) do update set value = excluded.value, updated_at = now();

-- Keep Paddle's trial disabled. BestHistory's existing 30-day Pro Trial remains account-owned.
insert into public.product_config(key, value)
values ('pro_trial_days', '{"days":30}'::jsonb)
on conflict (key) do update set value = excluded.value, updated_at = now();
