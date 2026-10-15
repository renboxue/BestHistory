-- BestHistory Step 40
-- Paddle Sandbox end-to-end provisioning: canonical entitlement priority,
-- billing customers/adjustments, reconciliation support, and service-role access.

alter table public.entitlements
  add column if not exists trial_valid_until timestamptz;

update public.entitlements
set trial_valid_until = valid_until
where source = 'trial'
  and trial_valid_until is null;

alter table public.billing_checkout_contexts
  add column if not exists last_reconcile_at timestamptz;

create table if not exists public.billing_customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  provider_environment text not null default 'sandbox' check (provider_environment in ('sandbox','live')),
  provider_customer_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, provider_environment, provider_customer_id)
);

create index if not exists billing_customers_user_idx on public.billing_customers(user_id);
alter table public.billing_customers enable row level security;
revoke all on table public.billing_customers from anon, authenticated;

drop trigger if exists billing_customers_set_updated_at on public.billing_customers;
create trigger billing_customers_set_updated_at
before update on public.billing_customers
for each row execute procedure public.set_updated_at();

create table if not exists public.billing_adjustments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  provider_environment text not null default 'sandbox' check (provider_environment in ('sandbox','live')),
  provider_adjustment_id text not null,
  provider_transaction_id text not null,
  provider_subscription_id text,
  action text not null,
  adjustment_type text,
  status text not null,
  amount_minor bigint,
  currency text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, provider_environment, provider_adjustment_id)
);

create index if not exists billing_adjustments_user_idx on public.billing_adjustments(user_id);
create index if not exists billing_adjustments_transaction_idx on public.billing_adjustments(provider_transaction_id);
alter table public.billing_adjustments enable row level security;
revoke all on table public.billing_adjustments from anon, authenticated;

drop trigger if exists billing_adjustments_set_updated_at on public.billing_adjustments;
create trigger billing_adjustments_set_updated_at
before update on public.billing_adjustments
for each row execute procedure public.set_updated_at();

grant usage on schema public to service_role;
grant select, insert, update, delete on table public.billing_checkout_contexts to service_role;
grant select, insert, update, delete on table public.billing_customers to service_role;
grant select, insert, update, delete on table public.billing_adjustments to service_role;
grant select, insert, update, delete on table public.billing_orders to service_role;
grant select, insert, update, delete on table public.subscriptions to service_role;
grant select, insert, update, delete on table public.payment_events to service_role;
grant select, insert, update, delete on table public.entitlements to service_role;

create or replace function public.handle_new_besthistory_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  trial_days integer := 30;
  trial_end timestamptz;
begin
  insert into public.profiles(user_id, preferred_locale)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'language', 'en'))
  on conflict (user_id) do nothing;

  select greatest(0, least(365, coalesce((pc.value ->> 'days')::integer, 30)))
    into trial_days
  from public.product_config pc
  where pc.key = 'pro_trial_days';

  trial_days := coalesce(trial_days, 30);

  if trial_days > 0 then
    trial_end := now() + pg_catalog.make_interval(days => trial_days);
    insert into public.entitlements(user_id, plan, status, source, valid_until, grace_until, trial_valid_until)
    values (new.id, 'pro', 'trialing', 'trial', trial_end, null, trial_end)
    on conflict (user_id) do nothing;
  else
    insert into public.entitlements(user_id, plan, status, source, valid_until, grace_until, trial_valid_until)
    values (new.id, 'free', 'active', 'system', null, null, null)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

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
      when e.plan = 'pro'
       and e.status = 'past_due'
       and (e.grace_until is null or e.grace_until <= now())
      then 'expired'
      else e.status
    end as status,
    e.source,
    e.valid_until,
    e.grace_until,
    (
      e.plan = 'pro'
      and (
        (
          e.status in ('active', 'trialing')
          and (
            e.valid_until is null
            or e.valid_until > now()
            or (e.grace_until is not null and e.grace_until > now())
          )
        )
        or (
          e.status = 'past_due'
          and e.grace_until is not null
          and e.grace_until > now()
        )
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

insert into public.product_config(key, value)
values
  ('billing_backend_version', '{"version":4,"provider":"paddle","environment":"sandbox","checkout_binding":"opaque_ref","webhook":true,"reconciliation":true}'::jsonb),
  ('billing_entitlement_priority', '["lifetime","paid_subscription","trial","free"]'::jsonb),
  ('billing_past_due_grace_days', '{"days":7}'::jsonb)
on conflict (key) do update set value = excluded.value, updated_at = now();

notify pgrst, 'reload schema';
