-- BestHistory Step 22
-- New accounts receive a configurable Pro trial. Existing accounts are intentionally unchanged.
-- Browser history, URLs and private data remain local-only and are not stored here.

insert into public.product_config(key, value)
values ('pro_trial_days', '{"days":30}'::jsonb)
on conflict (key) do update
set value = excluded.value;

create or replace function public.handle_new_besthistory_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  trial_days integer := 30;
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
    insert into public.entitlements(user_id, plan, status, source, valid_until, grace_until)
    values (
      new.id,
      'pro',
      'trialing',
      'trial',
      now() + pg_catalog.make_interval(days => trial_days),
      null
    )
    on conflict (user_id) do nothing;
  else
    insert into public.entitlements(user_id, plan, status, source, valid_until, grace_until)
    values (new.id, 'free', 'active', 'system', null, null)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

-- Recreate the trigger only to make the migration's intent explicit.
drop trigger if exists on_auth_user_created_besthistory on auth.users;
create trigger on_auth_user_created_besthistory
after insert on auth.users
for each row execute procedure public.handle_new_besthistory_user();
