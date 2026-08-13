-- Restock-on-cancel: a trigger (not RPC-only logic) so it fires no matter which path writes
-- orders.status — the admin app's RLS-gated UPDATE, a future RPC, or a direct edit from
-- Supabase Studio. Deliberately one-directional: un-cancelling never re-decrements stock,
-- matching the asymmetry in the original admin_orders.py (preserved as-is, not "fixed").
create or replace function app_private.restock_on_cancel()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    update products p
    set stock_quantity = stock_quantity + oi.quantity
    from order_items oi
    where oi.order_id = new.id and oi.product_id = p.id;
  end if;
  return new;
end;
$$;

create trigger trg_restock_on_cancel
  before update of status on orders
  for each row
  execute function app_private.restock_on_cancel();

-- Guarded deletes: BEFORE DELETE triggers (not application-level checks) so the guard holds
-- regardless of who issues the DELETE. products.delete is blocked if any order_items still
-- reference it (order_items.product_id has no ON DELETE CASCADE — this trigger turns what
-- would otherwise be a raw foreign_key_violation into the same friendly French message the
-- FastAPI app returned).
create or replace function app_private.guard_product_delete()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if exists (select 1 from order_items where product_id = old.id) then
    raise sqlstate 'PT409' using message =
      'Ce produit a déjà été commandé et ne peut pas être supprimé définitivement. Archivez-le (is_active=false) à la place.';
  end if;
  return old;
end;
$$;

create trigger trg_guard_product_delete
  before delete on products
  for each row
  execute function app_private.guard_product_delete();

create or replace function app_private.guard_promo_delete()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.usage_count > 0 then
    raise sqlstate 'PT409' using message =
      'Ce code promo a déjà été utilisé et ne peut pas être supprimé. Désactivez-le à la place.';
  end if;
  return old;
end;
$$;

create trigger trg_guard_promo_delete
  before delete on promo_codes
  for each row
  execute function app_private.guard_promo_delete();

-- Matches the Python `.strip().upper()` applied on create/update in the old
-- admin_promo_codes.py — enforced DB-side so it also applies to Studio edits.
create or replace function app_private.normalize_promo_code()
returns trigger
language plpgsql
as $$
begin
  new.code := upper(trim(new.code));
  return new;
end;
$$;

create trigger trg_normalize_promo_code
  before insert or update on promo_codes
  for each row
  execute function app_private.normalize_promo_code();
