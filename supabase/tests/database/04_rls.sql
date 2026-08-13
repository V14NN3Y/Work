-- Tests for Row Level Security: the global "every table has RLS enabled" sanity check from
-- the rls migration's trailing comment, plus per-role behavior for anon / authenticated
-- non-admin / authenticated admin across every table. A table with RLS silently left disabled
-- is world-readable/writable via the anon key, which ships in the public frontend bundle by
-- design — this file is what actually enforces that the sanity check gets run, not just left
-- as a comment someone has to remember to paste in by hand.
begin;
select plan(18);

-- 0. Global sanity check: no table in `public` has RLS disabled.
select is(
  (select count(*)::int from pg_class
   where relnamespace = 'public'::regnamespace and relkind = 'r' and not relrowsecurity),
  0,
  'every table in the public schema has row level security enabled'
);

-- Fixtures (as postgres, bypassing RLS).
insert into categories (id, name) values ('e0000000-0000-0000-0000-000000000001', 'RLS Test Category');
insert into products (id, title, price, stock_quantity, is_active, category_id) values
  ('e0000000-0000-0000-0000-000000000002', 'Produit Actif', 1000, 5, true, 'e0000000-0000-0000-0000-000000000001'),
  ('e0000000-0000-0000-0000-000000000003', 'Produit Archivé', 1000, 5, false, 'e0000000-0000-0000-0000-000000000001');
insert into promo_codes (id, code, discount_type, discount_value, is_active)
values ('e0000000-0000-0000-0000-000000000004', 'RLSTEST', 'fixed', 100, true);
insert into orders (
  id, order_ref, customer_name, phone_number, address_text, latitude, longitude, total_amount, status
) values (
  'e0000000-0000-0000-0000-000000000005', 'CMD260813RLSTST', 'Client RLS', '+22990000000',
  'Cotonou', 6.4, 2.4, 1000, 'completed'
);
insert into order_items (order_id, product_id, quantity, unit_price)
values ('e0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000002', 1, 1000);

-- A second order for the same product, so the pending review below doesn't collide with the
-- approved one on the (order_id, product_id) unique constraint.
insert into orders (
  id, order_ref, customer_name, phone_number, address_text, latitude, longitude, total_amount, status
) values (
  'e0000000-0000-0000-0000-000000000008', 'CMD260813RLSTS2', 'Client RLS 2', '+22990000001',
  'Cotonou', 6.4, 2.4, 1000, 'completed'
);
insert into order_items (order_id, product_id, quantity, unit_price)
values ('e0000000-0000-0000-0000-000000000008', 'e0000000-0000-0000-0000-000000000002', 1, 1000);

insert into reviews (id, product_id, order_id, customer_name, rating, status) values
  ('e0000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000002',
   'e0000000-0000-0000-0000-000000000005', 'Client RLS', 5, 'approved'),
  ('e0000000-0000-0000-0000-000000000007', 'e0000000-0000-0000-0000-000000000002',
   'e0000000-0000-0000-0000-000000000008', 'Client RLS 2', 1, 'pending');

-- Two auth.users fixtures: one promoted to admin_users, one left as a plain authenticated user.
insert into auth.users (id) values ('e0000000-0000-0000-0000-0000000000a1'), ('e0000000-0000-0000-0000-0000000000a2');
insert into admin_users (id) values ('e0000000-0000-0000-0000-0000000000a1');

-- Created up front (as postgres) so the later role-switched DO block only needs INSERT
-- privilege on it, not CREATE. Explicitly granted since temp tables don't inherit any
-- default privileges for other roles.
create temp table rls_update_result (rows_affected int);
grant insert, select on rls_update_result to authenticated;

-- === anon ==================================================================================
set local role anon;

select is(
  (select count(*)::int from categories where id = 'e0000000-0000-0000-0000-000000000001'),
  1,
  'anon can read categories'
);
select is(
  (select count(*)::int from products where id = 'e0000000-0000-0000-0000-000000000002'),
  1,
  'anon can read an active product'
);
select is(
  (select count(*)::int from products where id = 'e0000000-0000-0000-0000-000000000003'),
  0,
  'anon cannot read an archived (is_active = false) product'
);
select is(
  (select count(*)::int from reviews where id = 'e0000000-0000-0000-0000-000000000006'),
  1,
  'anon can read an approved review'
);
select is(
  (select count(*)::int from reviews where id = 'e0000000-0000-0000-0000-000000000007'),
  0,
  'anon cannot read a pending (unmoderated) review'
);
-- Note: table grants in this project are the standard Supabase default (broad grants to
-- anon/authenticated/service_role from the moment a table is created), so SELECT isn't
-- blocked at the grant level — RLS is the actual gate. With RLS enabled and either zero
-- policies or an is_admin()-gated policy, a SELECT as anon simply returns zero rows rather
-- than erroring. An INSERT is different: it can't be silently "filtered" the way a SELECT/
-- UPDATE/DELETE can, so a failing WITH CHECK genuinely raises an error (tested below).
select is(
  (select count(*)::int from orders), 0, 'anon reads zero rows from orders (RLS, not a grant error)'
);
select is(
  (select count(*)::int from order_items), 0, 'anon reads zero rows from order_items (RLS, not a grant error)'
);
select is(
  (select count(*)::int from promo_codes), 0, 'anon reads zero rows from promo_codes (RLS, not a grant error)'
);
select is(
  (select count(*)::int from admin_users), 0, 'anon reads zero rows from admin_users (RLS, not a grant error)'
);
select throws_ok(
  $$ insert into products (title, price) values ('Hack', 1) $$,
  '42501',
  'new row violates row-level security policy for table "products"',
  'anon cannot insert into products (RLS WITH CHECK fails)'
);

reset role;

-- === authenticated, non-admin ==============================================================
set local role authenticated;
set local "request.jwt.claim.sub" = 'e0000000-0000-0000-0000-0000000000a2';

select is(
  (select count(*)::int from orders),
  0,
  'a non-admin authenticated user has the SELECT grant on orders but RLS hides every row'
);

do $$
declare
  v_rows int;
begin
  update orders set status = 'cancelled' where id = 'e0000000-0000-0000-0000-000000000005';
  get diagnostics v_rows = row_count;
  insert into rls_update_result values (v_rows);
end $$;
select is(
  (select rows_affected from rls_update_result),
  0,
  'a non-admin authenticated user''s UPDATE on orders matches zero rows (RLS filters, no error)'
);

select throws_ok(
  $$ insert into categories (name) values ('Should Not Exist') $$,
  '42501',
  'new row violates row-level security policy for table "categories"',
  'a non-admin authenticated user cannot insert a category (RLS WITH CHECK fails)'
);

reset role;

-- === authenticated, admin ==================================================================
set local role authenticated;
set local "request.jwt.claim.sub" = 'e0000000-0000-0000-0000-0000000000a1';

select is(
  (select count(*)::int from orders where id = 'e0000000-0000-0000-0000-000000000005'),
  1,
  'an admin authenticated user can read orders'
);

update orders set status = 'delivering' where id = 'e0000000-0000-0000-0000-000000000005';
select is(
  (select status::text from orders where id = 'e0000000-0000-0000-0000-000000000005'),
  'delivering',
  'an admin authenticated user can update order status'
);

select lives_ok(
  $$ insert into categories (name) values ('Admin Category') $$,
  'an admin authenticated user can insert a category'
);

select is(
  (select count(*)::int from admin_users), 0,
  'even an admin authenticated user reads zero rows from admin_users (zero policies, default-deny by design)'
);

reset role;

select * from finish();
rollback;
