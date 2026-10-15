-- BestHistory Step 20
-- Account profile + server-authoritative membership model.
-- Browser history, URLs, tags and private records are intentionally NOT stored here.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferred_locale text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  status text not null default 'active' check (status in ('active', 'trialing', 'expired', 'canceled', 'past_due', 'refunded')),
  source text not null default 'system' check (source in ('system', 'payment', 'trial', 'lifetime', 'admin')),
  valid_until timestamptz,
  grace_until timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  provider_customer_id text,
  provider_subscription_id text,
  status text not null,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_subscription_id)
);

create index if not exists subscriptions_user_id_idx on public.subscriptions(user_id);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  event_type text not null,
  status text not null default 'received' check (status in ('received', 'processed', 'ignored', 'failed')),
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, event_id)
);

create table if not exists public.product_config (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.product_config(key, value)
values
  ('billing_enabled', 'false'::jsonb),
  ('pro_features', '["private_mode"]'::jsonb)
on conflict (key) do nothing;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_besthistory_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles(user_id, preferred_locale)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'language', 'en'))
  on conflict (user_id) do nothing;

  insert into public.entitlements(user_id, plan, status, source)
  values (new.id, 'free', 'active', 'system')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- Backfill users created before Step 20.
insert into public.profiles(user_id, preferred_locale)
select id, coalesce(raw_user_meta_data ->> 'language', 'en')
from auth.users
on conflict (user_id) do nothing;

insert into public.entitlements(user_id, plan, status, source)
select id, 'free', 'active', 'system'
from auth.users
on conflict (user_id) do nothing;

drop trigger if exists on_auth_user_created_besthistory on auth.users;
create trigger on_auth_user_created_besthistory
after insert on auth.users
for each row execute procedure public.handle_new_besthistory_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists entitlements_set_updated_at on public.entitlements;
create trigger entitlements_set_updated_at
before update on public.entitlements
for each row execute procedure public.set_updated_at();

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute procedure public.set_updated_at();

drop trigger if exists product_config_set_updated_at on public.product_config;
create trigger product_config_set_updated_at
before update on public.product_config
for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.entitlements enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payment_events enable row level security;
alter table public.product_config enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.entitlements from anon, authenticated;
revoke all on table public.subscriptions from anon, authenticated;
revoke all on table public.payment_events from anon, authenticated;
revoke all on table public.product_config from anon, authenticated;

grant select on table public.profiles to authenticated;
grant select on table public.entitlements to authenticated;
grant select on table public.subscriptions to authenticated;
grant select on table public.product_config to authenticated;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists entitlements_select_own on public.entitlements;
create policy entitlements_select_own
on public.entitlements for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own
on public.subscriptions for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists product_config_read_authenticated on public.product_config;
create policy product_config_read_authenticated
on public.product_config for select
to authenticated
using (true);

-- One server-time-derived entitlement response for the signed-in user.
create or replace function public.get_my_entitlement()
returns table (
  plan text,
  status text,
  source text,
  valid_until timestamptz,
  grace_until timestamptz,
  is_pro boolean,
  server_now timestamptz
)
language sql
stable
set search_path = ''
as $$
  select
    e.plan,
    case
      when e.plan = 'pro'
       and e.status in ('active', 'trialing')
       and e.valid_until is not null
       and e.valid_until <= now()
       and (e.grace_until is null or e.grace_until <= now())
      then 'expired'
      else e.status
    end as status,
    e.source,
    e.valid_until,
    e.grace_until,
    (
      e.plan = 'pro'
      and e.status in ('active', 'trialing')
      and (
        e.valid_until is null
        or e.valid_until > now()
        or (e.grace_until is not null and e.grace_until > now())
      )
    ) as is_pro,
    now() as server_now
  from public.entitlements e
  where e.user_id = (select auth.uid())

  union all

  select 'free', 'active', 'system', null::timestamptz, null::timestamptz, false, now()
  where not exists (
    select 1 from public.entitlements e where e.user_id = (select auth.uid())
  )
  limit 1;
$$;

revoke all on function public.get_my_entitlement() from public, anon;
grant execute on function public.get_my_entitlement() to authenticated;
