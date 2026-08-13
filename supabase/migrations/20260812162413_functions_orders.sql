-- create_order: the single most complex piece of business logic in the system, ported from
-- backend/app/routers/orders.py::create_order. Runs as one Postgres transaction (a property
-- a multi-request client-side flow could never guarantee), replicating:
--   1. Lock every distinct requested *active* product row (FOR UPDATE, ordered by id — a
--      stable lock-acquisition order so two orders with overlapping-but-differently-ordered
--      item sets can never deadlock each other).
--   2. All-missing/inactive-at-once check, before any writes.
--   3. Per-item stock check + decrement (locks already held, so concurrent orders on the same
--      product serialize correctly here).
--   4. Optional promo code: lock the promo row too (FOR UPDATE — this is what prevents two
--      concurrent orders from both succeeding past usage_limit), run the shared eligibility
--      check, calculate the discount, increment usage_count — same transaction as the stock
--      decrement, so it all commits or rolls back together.
--   5. Generate a unique order_ref (retry up to 5x).
--   6. Insert order + order_items, return the full order as JSON.
create or replace function public.create_order(
  p_customer_name text,
  p_phone_number  text,
  p_address_text  text,
  p_latitude      numeric,
  p_longitude     numeric,
  p_items         jsonb,
  p_promo_code    text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  req        record;
  prod       products%rowtype;
  v_subtotal numeric(10, 2) := 0;
  v_discount numeric(10, 2) := 0;
  v_promo    promo_codes%rowtype;
  v_order    orders%rowtype;
  v_ref      text;
  v_attempt  int := 0;
  v_missing  uuid[];
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise sqlstate 'PT400' using message = 'La commande doit contenir au moins un article';
  end if;

  perform 1 from products
  where id in (select distinct (e ->> 'product_id')::uuid from jsonb_array_elements(p_items) e)
    and is_active
  order by id
  for update;

  select array_agg(req_id) into v_missing
  from (
    select distinct (e ->> 'product_id')::uuid as req_id from jsonb_array_elements(p_items) e
  ) r
  where not exists (select 1 from products p where p.id = r.req_id and p.is_active);

  if v_missing is not null then
    raise sqlstate 'PT404' using message = format('Produit(s) introuvable(s): %s', array_to_string(v_missing, ', '));
  end if;

  for req in
    select (e ->> 'product_id')::uuid as product_id, (e ->> 'quantity')::int as quantity
    from jsonb_array_elements(p_items) e
  loop
    select * into prod from products where id = req.product_id;
    if prod.stock_quantity < req.quantity then
      raise sqlstate 'PT409' using message =
        format('Stock insuffisant pour ''%s'' (disponible: %s)', prod.title, prod.stock_quantity);
    end if;
    update products set stock_quantity = stock_quantity - req.quantity where id = prod.id;
    v_subtotal := v_subtotal + prod.price * req.quantity;
  end loop;

  if p_promo_code is not null and length(trim(p_promo_code)) > 0 then
    select * into v_promo from promo_codes where code = upper(trim(p_promo_code)) for update;
    if not found then
      raise sqlstate 'PT404' using message = 'Code promo introuvable.';
    end if;
    perform app_private.promo_check_eligibility(v_promo, v_subtotal);
    v_discount := app_private.promo_calculate_discount(v_promo, v_subtotal);
    update promo_codes set usage_count = usage_count + 1 where id = v_promo.id;
  end if;

  loop
    v_attempt := v_attempt + 1;
    v_ref := 'CMD' || to_char(now() at time zone 'utc', 'YYMMDD') || upper(encode(gen_random_bytes(3), 'hex'));
    exit when not exists (select 1 from orders where order_ref = v_ref);
    if v_attempt >= 5 then
      raise sqlstate 'PT500' using message = 'Impossible de générer une référence de commande unique';
    end if;
  end loop;

  insert into orders (
    order_ref, customer_name, phone_number, address_text, latitude, longitude,
    total_amount, promo_code_id, promo_code, discount_amount
  )
  values (
    v_ref, p_customer_name, p_phone_number, p_address_text, p_latitude, p_longitude,
    v_subtotal - v_discount, v_promo.id, v_promo.code, v_discount
  )
  returning * into v_order;

  insert into order_items (order_id, product_id, quantity, unit_price)
  select
    v_order.id,
    (e ->> 'product_id')::uuid,
    (e ->> 'quantity')::int,
    (select price from products where id = (e ->> 'product_id')::uuid)
  from jsonb_array_elements(p_items) e;

  return app_private.order_to_jsonb(v_order.id);
end;
$$;

revoke execute on function public.create_order(text, text, text, numeric, numeric, jsonb, text) from public;
grant execute on function public.create_order(text, text, text, numeric, numeric, jsonb, text) to anon, authenticated;

-- track_order: anti-enumeration lookup, ported from routers/orders.py::track_order. The
-- byte-identical-response property (unknown ref vs. wrong phone) is guaranteed by this single
-- function having exactly one failure branch, rather than being split across a Route Handler
-- doing multiple separate REST calls where the two failure modes could drift apart over time.
create or replace function public.track_order(p_ref text, p_phone text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_order orders%rowtype;
  v_phone text;
  v_msg   text := 'Commande introuvable. Vérifiez la référence et le numéro de téléphone.';
begin
  v_phone := regexp_replace(p_phone, '[\s-]', '', 'g');
  if v_phone !~ '^\+?[0-9]{8,15}$' then
    raise sqlstate 'PT404' using message = v_msg;
  end if;

  select * into v_order from orders where order_ref = upper(trim(p_ref));

  -- PL/pgSQL has no equivalent to Python's secrets.compare_digest. Comparing sha256 digests
  -- of both sides (rather than the raw strings) removes the most obvious length/early-exit
  -- timing signal a plain `=` could leak — not a formally proven constant-time guarantee, but
  -- the best available analogue here. Documented, not a silent downgrade.
  if v_order.id is null
     or digest(coalesce(v_order.phone_number, ''), 'sha256') <> digest(v_phone, 'sha256')
  then
    raise sqlstate 'PT404' using message = v_msg;
  end if;

  return app_private.order_to_jsonb(v_order.id);
end;
$$;

revoke execute on function public.track_order(text, text) from public;
grant execute on function public.track_order(text, text) to anon, authenticated;
