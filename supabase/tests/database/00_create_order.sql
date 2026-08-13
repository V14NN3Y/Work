-- Tests for public.create_order(): stock locking/decrement, promo locking/consumption,
-- unique order_ref generation, and atomicity (a failure partway through must roll back
-- every write the function made, including stock already decremented for earlier items).
begin;
select plan(11);

-- Fixtures
insert into categories (id, name) values ('11111111-1111-1111-1111-111111111111', 'Test Category');

insert into products (id, title, price, stock_quantity, is_active, category_id) values
  ('00000000-0000-0000-0000-000000000001', 'Produit A', 1000, 5, true, '11111111-1111-1111-1111-111111111111'),
  ('00000000-0000-0000-0000-000000000002', 'Produit B', 2000, 1, true, '11111111-1111-1111-1111-111111111111'),
  ('00000000-0000-0000-0000-000000000003', 'Produit Inactif', 500, 5, false, '11111111-1111-1111-1111-111111111111');

insert into promo_codes (id, code, discount_type, discount_value, usage_limit, usage_count, is_active) values
  ('22222222-2222-2222-2222-222222222222', 'PGTAPCO10', 'percentage', 10, 1, 0, true);

-- 1. Empty items array is rejected before any locking/writes.
select throws_ok(
  $$ select public.create_order('Client', '+22912345678', 'Cotonou', 6.4, 2.4, '[]'::jsonb) $$,
  'PT400',
  'La commande doit contenir au moins un article',
  'create_order rejects an empty items array'
);

-- 2. Unknown/inactive product id is reported as "missing" (anti-enumeration between
--    truly-unknown and merely-inactive: both look identical to the caller).
select throws_ok(
  format($$ select public.create_order('Client', '+22912345678', 'Cotonou', 6.4, 2.4,
    '[{"product_id":"%s","quantity":1}]'::jsonb) $$, '00000000-0000-0000-0000-000000000003'),
  'PT404',
  format('Produit(s) introuvable(s): %s', '00000000-0000-0000-0000-000000000003'),
  'create_order rejects an inactive product as not found'
);

-- 3. Insufficient stock is rejected, and the successful decrement of an earlier item in the
--    same request is rolled back along with it (atomicity — the core property of running this
--    as one Postgres transaction instead of several separate client-side requests).
select throws_ok(
  format($$ select public.create_order('Client', '+22912345678', 'Cotonou', 6.4, 2.4,
    '[{"product_id":"%s","quantity":1},{"product_id":"%s","quantity":5}]'::jsonb) $$,
    '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'),
  'PT409',
  'Stock insuffisant pour ''Produit B'' (disponible: 1)',
  'create_order rejects insufficient stock on the second item'
);
select is(
  (select stock_quantity from products where id = '00000000-0000-0000-0000-000000000001'),
  5,
  'stock for the first item is rolled back when a later item fails (atomicity)'
);

-- 4. Successful order: stock decrements, promo is consumed, discount is applied, order_ref
--    matches the expected CMD<YYMMDD><6 hex> shape.
select ok(
  (public.create_order('Aïcha K.', '+22912345678', 'Cotonou, Fidjrossè', 6.4, 2.4,
    format('[{"product_id":"%s","quantity":2}]', '00000000-0000-0000-0000-000000000001')::jsonb,
    'pgtapco10') ->> 'order_ref') ~ '^CMD[0-9]{6}[0-9A-F]{6}$',
  'create_order returns a well-formed order_ref (case-insensitive promo code accepted)'
);
select is(
  (select stock_quantity from products where id = '00000000-0000-0000-0000-000000000001'),
  3,
  'stock is decremented by the ordered quantity'
);
select is(
  (select usage_count from promo_codes where id = '22222222-2222-2222-2222-222222222222'),
  1,
  'promo usage_count is incremented exactly once'
);
select is(
  (select discount_amount from orders where promo_code = 'PGTAPCO10'),
  200.00,
  'discount is 10% of the 2000 FCFA subtotal'
);
select is(
  (select total_amount from orders where promo_code = 'PGTAPCO10'),
  1800.00,
  'total_amount is subtotal minus discount'
);

-- 5. A second order against the now-exhausted (usage_limit=1) promo code is rejected —
--    single-request proof that the eligibility check is enforced; concurrent-request proof
--    (the actual race condition) lives in supabase/tests/concurrency/promo-race.ts.
select throws_ok(
  format($$ select public.create_order('Client', '+22912345678', 'Cotonou', 6.4, 2.4,
    '[{"product_id":"%s","quantity":1}]'::jsonb, 'PGTAPCO10') $$, '00000000-0000-0000-0000-000000000001'),
  'PT400',
  'Ce code promo a atteint sa limite d''utilisation.',
  'create_order rejects a promo code that has hit its usage_limit'
);

-- 6. Unknown promo code is a distinct, clearly-labelled error (not silently ignored).
select throws_ok(
  format($$ select public.create_order('Client', '+22912345678', 'Cotonou', 6.4, 2.4,
    '[{"product_id":"%s","quantity":1}]'::jsonb, 'NOPE') $$, '00000000-0000-0000-0000-000000000001'),
  'PT404',
  'Code promo introuvable.',
  'create_order rejects an unknown promo code'
);

select * from finish();
rollback;
