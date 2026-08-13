-- Tests for the BEFORE UPDATE/DELETE triggers: restock-on-cancel (and its deliberate
-- one-directional asymmetry — un-cancelling must NOT re-decrement stock), the guarded deletes
-- on products/promo_codes, and promo code normalization.
begin;
select plan(10);

-- === restock_on_cancel ===================================================================
insert into products (id, title, price, stock_quantity, is_active) values
  ('88888888-8888-8888-8888-888888888888', 'Produit Restock', 1000, 10, true);

select ok(
  (public.create_order('Client', '+22991112233', 'Cotonou', 6.4, 2.4,
    format('[{"product_id":"%s","quantity":2}]', '88888888-8888-8888-8888-888888888888')::jsonb
  ) ->> 'order_ref') is not null,
  'setup: order placed, reducing stock from 10 to 8'
);
select is(
  (select stock_quantity from products where id = '88888888-8888-8888-8888-888888888888'),
  8,
  'stock is 8 after the order (sanity check before exercising the trigger)'
);

update orders set status = 'cancelled'
where id = (select order_id from order_items where product_id = '88888888-8888-8888-8888-888888888888' limit 1);

select is(
  (select stock_quantity from products where id = '88888888-8888-8888-8888-888888888888'),
  10,
  'cancelling the order restocks the product back to 10'
);

-- Re-cancelling (status stays 'cancelled') must not restock a second time.
update orders set status = 'cancelled'
where id = (select order_id from order_items where product_id = '88888888-8888-8888-8888-888888888888' limit 1);

select is(
  (select stock_quantity from products where id = '88888888-8888-8888-8888-888888888888'),
  10,
  'idempotent re-cancellation does not double-restock'
);

-- Un-cancelling (cancelled -> pending) is deliberately one-directional: it must NOT
-- re-decrement stock, preserving the asymmetry carried over from the original FastAPI app.
update orders set status = 'pending'
where id = (select order_id from order_items where product_id = '88888888-8888-8888-8888-888888888888' limit 1);

select is(
  (select stock_quantity from products where id = '88888888-8888-8888-8888-888888888888'),
  10,
  'un-cancelling an order does not re-decrement stock (documented asymmetry, not a bug)'
);

-- === guard_product_delete =================================================================
insert into products (id, title, price, stock_quantity, is_active) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Produit Jamais Commandé', 500, 5, true);

select lives_ok(
  $$ delete from products where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  'a product with no order_items can be deleted'
);
select throws_ok(
  $$ delete from products where id = '88888888-8888-8888-8888-888888888888' $$,
  'PT409',
  'Ce produit a déjà été commandé et ne peut pas être supprimé définitivement. Archivez-le (is_active=false) à la place.',
  'a product already referenced by order_items cannot be deleted (guard trigger)'
);

-- === guard_promo_delete ====================================================================
insert into promo_codes (id, code, discount_type, discount_value, usage_count, is_active) values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'UNUSED', 'fixed', 500, 0, true),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'USED', 'fixed', 500, 3, true);

select lives_ok(
  $$ delete from promo_codes where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' $$,
  'a promo code with usage_count = 0 can be deleted'
);
select throws_ok(
  $$ delete from promo_codes where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' $$,
  'PT409',
  'Ce code promo a déjà été utilisé et ne peut pas être supprimé. Désactivez-le à la place.',
  'a promo code already used at least once cannot be deleted (guard trigger)'
);

-- === normalize_promo_code ==================================================================
insert into promo_codes (id, code, discount_type, discount_value, is_active)
values ('dddddddd-dddd-dddd-dddd-dddddddddddd', '  spring25  ', 'percentage', 25, true);

select is(
  (select code from promo_codes where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  'SPRING25',
  'promo codes are trimmed and upper-cased on insert, matching the old API''s behavior'
);

select * from finish();
rollback;
