-- BestHistory Step 39.2
-- Harden checkout_ref database access for trusted Edge Functions and refresh PostgREST schema cache.

grant usage on schema public to service_role;
grant select, insert, update, delete on table public.billing_checkout_contexts to service_role;

-- billing-checkout-status reads the existing entitlement resolver output.
grant select on table public.entitlements to service_role;

-- Future billing functions read normalized billing state.
grant select, insert, update, delete on table public.billing_orders to service_role;
grant select, insert, update, delete on table public.subscriptions to service_role;
grant select, insert, update, delete on table public.payment_events to service_role;

-- Force PostgREST to see tables created by the immediately preceding migration.
notify pgrst, 'reload schema';
