-- Row Level Security for every table. NOTE (confirmed against the running local database,
-- see supabase/tests/database/04_rls.sql): this Postgres instance grants anon/authenticated/
-- service_role broad table-level privileges by default the moment a table is created —
-- the explicit `grant select on ...` statements below are therefore NOT the actual access
-- gate, RLS is. A SELECT on a table with RLS enabled and no matching policy returns zero
-- rows (not a permission error); an INSERT/UPDATE with a failing WITH CHECK/USING clause is
-- what actually errors. Every "no grant" claim in the comments below should be read as
-- "no RLS policy", not "no table privilege" — both produce the same effective default-deny,
-- just via a different mechanism (rows silently filtered vs. a grant-level error). Column-
-- scoped grants (orders.status, reviews.status/moderated_at) are kept as-documented intent
-- for which single column the admin app should touch, even though they aren't the enforcement
-- layer either.
--
-- admin_users has NO policies at all — intentional default-deny. RLS with zero policies means
-- every operation (including SELECT, from any role, including an admin's own authenticated
-- session) is denied; only the table owner (postgres) and SECURITY DEFINER functions bypass
-- this.

alter table categories enable row level security;
alter table products enable row level security;
alter table product_images enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table reviews enable row level security;
alter table promo_codes enable row level security;
alter table admin_users enable row level security;

-- categories: public read, admin write
grant select on categories to anon, authenticated;
grant insert, update, delete on categories to authenticated;

create policy "public read categories" on categories for select using (true);
create policy "admin insert categories" on categories for insert with check (is_admin());
create policy "admin update categories" on categories for update using (is_admin()) with check (is_admin());
create policy "admin delete categories" on categories for delete using (is_admin());

-- products: public read of active rows (admins see everything, including archived), admin write
grant select on products to anon, authenticated;
grant insert, update, delete on products to authenticated;

create policy "public read active products" on products for select using (is_active or is_admin());
create policy "admin insert products" on products for insert with check (is_admin());
create policy "admin update products" on products for update using (is_admin()) with check (is_admin());
create policy "admin delete products" on products for delete using (is_admin());

-- product_images: public read; INSERT/DELETE deliberately have NO grant to anon/authenticated
-- at all (only the service_role-keyed Route Handler writes here, for the Storage cleanup
-- step — see plan §4). Reordering (UPDATE display_order) goes through the admin app directly.
grant select on product_images to anon, authenticated;
grant update on product_images to authenticated;

create policy "public read product images" on product_images for select using (true);
create policy "admin reorder product images" on product_images for update using (is_admin()) with check (is_admin());

-- orders: never publicly readable (customers only ever see their own order via the track_order
-- RPC, which returns JSON, not table rows). No INSERT grant at all — creation is exclusively
-- through the create_order RPC (SECURITY DEFINER, bypasses RLS as the owning role). No DELETE
-- policy, ever — matches the original API, which never exposed a delete-order endpoint.
grant select on orders to authenticated;
grant update (status) on orders to authenticated;

create policy "admin read orders" on orders for select using (is_admin());
create policy "admin update order status" on orders for update using (is_admin()) with check (is_admin());

-- order_items: admin-only read, no direct writes at all (RPC only, via create_order).
grant select on order_items to authenticated;

create policy "admin read order items" on order_items for select using (is_admin());

-- reviews: public read of approved reviews only (admins see everything incl. pending/rejected).
-- No INSERT grant — submission is exclusively through the submit_review RPC (proof-of-purchase
-- enforced there). Moderation can only touch status/moderated_at, never rating/comment/etc.
grant select on reviews to anon, authenticated;
grant update (status, moderated_at) on reviews to authenticated;
grant delete on reviews to authenticated;

create policy "read approved reviews or admin" on reviews for select using (status = 'approved' or is_admin());
create policy "admin moderate reviews" on reviews for update using (is_admin()) with check (is_admin());
create policy "admin delete reviews" on reviews for delete using (is_admin());

-- promo_codes: never public (not even "list active codes") — admin-only in every direction.
grant select, insert, update, delete on promo_codes to authenticated;

create policy "admin read promo codes" on promo_codes for select using (is_admin());
create policy "admin insert promo codes" on promo_codes for insert with check (is_admin());
create policy "admin update promo codes" on promo_codes for update using (is_admin()) with check (is_admin());
create policy "admin delete promo codes" on promo_codes for delete using (is_admin());

-- Sanity check to run manually after this migration: every table in `public` must have RLS
-- enabled. A table with RLS left disabled is silently world-readable/writable via the anon
-- key (which is public in the frontend bundle by design). This query must return zero rows:
--
--   select relname from pg_class
--   where relnamespace = 'public'::regnamespace and relkind = 'r' and not relrowsecurity;
