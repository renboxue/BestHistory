-- BestHistory Step 36 v2
-- Paddle Sandbox billing-order model.
-- This migration prepares trusted server-side billing. Payment secrets never belong in the extension.

create table if not exists public.billing_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  provider_environment text not null default 'sandbox' check (provider_environment in ('sandbox', 'live')),
  plan_key text not null check (plan_key in ('pro_monthly', 'pro_yearly', 'pro_lifetime')),
  status text not null default 'created' check (status in ('created', 'checkout_open', 'paid', 'canceled', 'failed', 'refunded', 'expired')),
  provider_order_id text,
  provider_checkout_id text,
  provider_customer_id text,
  provider_subscription_id text,
  currency text,
  amount_minor bigint,
  checkout_url text,
  paid_at timestamptz,
  canceled_at timestamptz,
  refunded_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_environment, provider_order_id),
  unique (provider, provider_environment, provider_checkout_id)
);

alter table public.billing_orders add column if not exists provider_environment text not null default 'sandbox';

create index if not exists billing_orders_user_id_idx on public.billing_orders(user_id);
create index if not exists billing_orders_status_idx on public.billing_orders(status);
create index if not exists billing_orders_provider_order_idx on public.billing_orders(provider, provider_environment, provider_order_id);

alter table public.billing_orders enable row level security;
revoke all on table public.billing_orders from anon, authenticated;
grant select on table public.billing_orders to authenticated;

drop policy if exists billing_orders_select_own on public.billing_orders;
create policy billing_orders_select_own
on public.billing_orders for select
to authenticated
using ((select auth.uid()) = user_id);

drop trigger if exists billing_orders_set_updated_at on public.billing_orders;
create trigger billing_orders_set_updated_at
before update on public.billing_orders
for each row execute procedure public.set_updated_at();

alter table public.subscriptions add column if not exists provider_environment text not null default 'sandbox';
alter table public.subscriptions add column if not exists plan_key text;
alter table public.payment_events add column if not exists provider_environment text not null default 'sandbox';
alter table public.payment_events add column if not exists payload jsonb;

insert into public.product_config(key, value)
values
  ('billing_provider', '{"provider":"paddle","environment":"sandbox"}'::jsonb),
  ('billing_catalog', '{"pro_monthly":{"provider":"paddle","provider_price_id":null},"pro_yearly":{"provider":"paddle","provider_price_id":null}}'::jsonb),
  ('billing_backend_version', '{"version":2,"provider":"paddle","environment":"sandbox"}'::jsonb)
on conflict (key) do update set value = excluded.value, updated_at = now();

-- Security boundary:
-- authenticated clients may SELECT their own billing_orders only.
-- INSERT/UPDATE/DELETE of orders, subscriptions, payment_events and entitlements remains trusted-backend only.
