-- Tests for public.submit_review(): proof-of-purchase gating, the anti-enumeration branch
-- shared with track_order, the distinct PT400 class once identity is proven, and the PT409
-- mapped from a caught unique_violation on (order_id, product_id).
begin;
select plan(9);

insert into products (id, title, price, stock_quantity, is_active) values
  ('44444444-4444-4444-4444-444444444444', 'Produit Livré', 3000, 10, true),
  ('55555555-5555-5555-5555-555555555555', 'Produit Non Commandé', 1500, 10, true);

-- A completed order containing product 44444444..., for the phone below.
insert into orders (
  id, order_ref, customer_name, phone_number, address_text, latitude, longitude, total_amount, status
) values (
  '66666666-6666-6666-6666-666666666666', 'CMD260813REVIEW', 'Fatima B.', '+22990112233',
  'Porto-Novo', 6.49, 2.62, 3000, 'completed'
);
insert into order_items (order_id, product_id, quantity, unit_price)
values ('66666666-6666-6666-6666-666666666666', '44444444-4444-4444-4444-444444444444', 1, 3000);

-- A still-pending order (not eligible yet), same customer.
insert into orders (
  id, order_ref, customer_name, phone_number, address_text, latitude, longitude, total_amount, status
) values (
  '77777777-7777-7777-7777-777777777777', 'CMD260813PENDNG', 'Fatima B.', '+22990112233',
  'Porto-Novo', 6.49, 2.62, 3000, 'pending'
);
insert into order_items (order_id, product_id, quantity, unit_price)
values ('77777777-7777-7777-7777-777777777777', '44444444-4444-4444-4444-444444444444', 1, 3000);

-- 1. Unknown product id -> PT404 with a distinct, specific message (identity isn't the
--    question here, so this branch does NOT need to hide anything).
select throws_ok(
  $$ select public.submit_review('99999999-9999-9999-9999-999999999999', 'CMD260813REVIEW', '+22990112233', 5) $$,
  'PT404',
  'Produit introuvable',
  'submit_review rejects an unknown product id with a specific message'
);

-- 2. Unknown ref / wrong phone -> PT404, generic message (same anti-enumeration pattern as
--    track_order).
select throws_ok(
  $$ select public.submit_review('44444444-4444-4444-4444-444444444444', 'CMDUNKNOWNREF', '+22990112233', 5) $$,
  'PT404',
  'Commande introuvable. Vérifiez la référence et le numéro de téléphone.',
  'submit_review rejects an unknown order ref with the generic anti-enumeration message'
);
select throws_ok(
  $$ select public.submit_review('44444444-4444-4444-4444-444444444444', 'CMD260813REVIEW', '+22900000000', 5) $$,
  'PT404',
  'Commande introuvable. Vérifiez la référence et le numéro de téléphone.',
  'submit_review rejects a wrong phone with the same generic message'
);

-- 3. Identity proven, but not eligible: product not part of this order -> PT400 (a different
--    error class from the 404s above, since at this point who-is-asking is no longer hidden).
select throws_ok(
  $$ select public.submit_review('55555555-5555-5555-5555-555555555555', 'CMD260813REVIEW', '+22990112233', 4) $$,
  'PT400',
  'Vous ne pouvez laisser un avis que pour un produit reçu (commande terminée).',
  'submit_review rejects a product that was not part of the order'
);

-- 4. Identity proven, order exists and contains the product, but isn't completed yet -> PT400.
select throws_ok(
  $$ select public.submit_review('44444444-4444-4444-4444-444444444444', 'CMD260813PENDNG', '+22990112233', 4) $$,
  'PT400',
  'Vous ne pouvez laisser un avis que pour un produit reçu (commande terminée).',
  'submit_review rejects a not-yet-completed order'
);

-- 5. Success: eligible purchase, review inserted as pending.
select is(
  (select status from public.submit_review(
    '44444444-4444-4444-4444-444444444444', 'CMD260813REVIEW', '+22990112233', 5, 'Excellent produit !'
  ))::text,
  'pending',
  'submit_review succeeds for an eligible purchase and starts as pending'
);
select is(
  (select count(*)::int from reviews
   where order_id = '66666666-6666-6666-6666-666666666666'
     and product_id = '44444444-4444-4444-4444-444444444444'),
  1,
  'exactly one review row exists after the successful submission'
);

-- 6. Duplicate submission for the same (order_id, product_id) -> caught unique_violation,
--    remapped to PT409.
select throws_ok(
  $$ select public.submit_review('44444444-4444-4444-4444-444444444444', 'CMD260813REVIEW', '+22990112233', 3) $$,
  'PT409',
  'Vous avez déjà laissé un avis pour ce produit avec cette commande.',
  'submit_review rejects a duplicate review for the same order+product'
);
select is(
  (select count(*)::int from reviews
   where order_id = '66666666-6666-6666-6666-666666666666'
     and product_id = '44444444-4444-4444-4444-444444444444'),
  1,
  'the duplicate attempt did not create a second row'
);

select * from finish();
rollback;
