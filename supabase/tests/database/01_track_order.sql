-- Tests for public.track_order(): the anti-enumeration property is the point of this
-- function, so the tests assert on it directly (comparing the two failure messages/sqlstates
-- to each other, not just to a hardcoded string twice) rather than only checking a fixed value.
begin;
select plan(6);

insert into orders (
  id, order_ref, customer_name, phone_number, address_text, latitude, longitude, total_amount
) values (
  '33333333-3333-3333-3333-333333333333', 'CMD260813ABCDEF', 'Rokia D.', '+22997001122',
  'Cotonou, Akpakpa', 6.35, 2.43, 5000
);

-- Capture both failure branches so they can be compared directly.
create temp table captured_errors (label text primary key, msg text, code text);

do $$
begin
  perform public.track_order('CMDUNKNOWNREF99', '+22997001122');
  insert into captured_errors values ('unknown_ref', null, null);
exception when others then
  insert into captured_errors values ('unknown_ref', sqlerrm, sqlstate);
end $$;

do $$
begin
  perform public.track_order('CMD260813ABCDEF', '+22900000000');
  insert into captured_errors values ('wrong_phone', null, null);
exception when others then
  insert into captured_errors values ('wrong_phone', sqlerrm, sqlstate);
end $$;

select is(
  (select code from captured_errors where label = 'unknown_ref'), 'PT404',
  'unknown order_ref raises PT404'
);
select is(
  (select code from captured_errors where label = 'wrong_phone'), 'PT404',
  'wrong phone number raises PT404 (same class as unknown ref)'
);
select is(
  (select msg from captured_errors where label = 'unknown_ref'),
  (select msg from captured_errors where label = 'wrong_phone'),
  'unknown ref and wrong phone produce a byte-identical error message (anti-enumeration)'
);

-- A malformed phone number is rejected the same way (before ever touching the orders table).
select throws_ok(
  $$ select public.track_order('CMD260813ABCDEF', 'not-a-phone') $$,
  'PT404',
  'Commande introuvable. Vérifiez la référence et le numéro de téléphone.',
  'track_order rejects a malformed phone number with the same generic message'
);

-- Successful lookup: correct ref + correct phone returns the order.
select is(
  (public.track_order('cmd260813abcdef', '+229 97 00 11 22') ->> 'order_ref'),
  'CMD260813ABCDEF',
  'track_order succeeds with correct ref/phone (case-insensitive ref, spaces in phone tolerated)'
);
select is(
  (public.track_order('CMD260813ABCDEF', '+22997001122') ->> 'total_amount')::numeric,
  5000.00,
  'track_order returns the full order payload including total_amount'
);

select * from finish();
rollback;
