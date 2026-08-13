-- app_private is not in [api] schemas (see supabase/config.toml), so nothing here is ever
-- reachable via PostgREST regardless of grants — belt-and-suspenders alongside the explicit
-- revoke/grant statements on each function below.
create schema if not exists app_private;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from admin_users where id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Shared promo eligibility/discount logic — the single implementation called by BOTH
-- validate_promo_code (read-only preview) and create_order (authoritative, locked). Mirrors
-- backend/app/services/promo.py exactly so preview and authoritative logic can never drift.

create or replace function app_private.promo_check_eligibility(p_promo promo_codes, p_subtotal numeric)
returns void
language plpgsql
stable
as $$
begin
  if not p_promo.is_active then
    raise sqlstate 'PT400' using message = 'Ce code promo n''est plus actif.';
  elsif p_promo.starts_at is not null and now() < p_promo.starts_at then
    raise sqlstate 'PT400' using message = 'Ce code promo n''est pas encore valide.';
  elsif p_promo.expires_at is not null and now() > p_promo.expires_at then
    raise sqlstate 'PT400' using message = 'Ce code promo a expiré.';
  elsif p_promo.usage_limit is not null and p_promo.usage_count >= p_promo.usage_limit then
    raise sqlstate 'PT400' using message = 'Ce code promo a atteint sa limite d''utilisation.';
  elsif p_promo.min_order_amount is not null and p_subtotal < p_promo.min_order_amount then
    raise sqlstate 'PT400' using message = format('Montant minimum de commande non atteint (%s FCFA).', p_promo.min_order_amount);
  end if;
end;
$$;

create or replace function app_private.promo_calculate_discount(p_promo promo_codes, p_subtotal numeric)
returns numeric
language plpgsql
stable
as $$
declare
  v_discount numeric(10, 2);
begin
  if p_promo.discount_type = 'percentage' then
    v_discount := round(p_subtotal * p_promo.discount_value / 100, 2);
  else
    v_discount := p_promo.discount_value;
  end if;

  if p_promo.max_discount_amount is not null then
    v_discount := least(v_discount, p_promo.max_discount_amount);
  end if;

  return least(v_discount, p_subtotal);
end;
$$;

-- Returns an order + its items as one JSON payload, matching the shape OrderRead used to
-- serialize. Needed because once orders/order_items lose direct anon/authenticated SELECT
-- (see rls migration), the RPCs below are the only way a caller ever sees an order.
create or replace function app_private.order_to_jsonb(p_order_id uuid)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'id', o.id,
    'order_ref', o.order_ref,
    'customer_name', o.customer_name,
    'phone_number', o.phone_number,
    'address_text', o.address_text,
    'latitude', o.latitude,
    'longitude', o.longitude,
    'total_amount', o.total_amount,
    'status', o.status,
    'promo_code', o.promo_code,
    'discount_amount', o.discount_amount,
    'created_at', o.created_at,
    'maps_url', 'https://maps.google.com/?q=' || o.latitude::text || ',' || o.longitude::text,
    'subtotal', o.total_amount + o.discount_amount,
    'items', coalesce(
      (select jsonb_agg(jsonb_build_object(
         'id', oi.id, 'product_id', oi.product_id, 'quantity', oi.quantity, 'unit_price', oi.unit_price
       ))
       from order_items oi where oi.order_id = o.id),
      '[]'::jsonb
    )
  )
  from orders o
  where o.id = p_order_id;
$$;
