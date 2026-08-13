-- submit_review: proof-of-purchase review submission, ported from routers/reviews.py.
-- Reuses the exact same anti-enumeration pattern as track_order (identical generic 404
-- whether the ref is unknown or the phone is wrong) for the identity-proving step, then — once
-- identity IS proven — uses a DIFFERENT error class (PT400) for "order not eligible" (wrong
-- product, not completed yet). This distinction between "who are you" (404) and "you can't do
-- this" (400) matters: collapsing them back into one error class would leak information the
-- 404 branch is specifically designed to hide, or hide information (ineligibility reason) that
-- doesn't need hiding once identity is already proven.
create or replace function public.submit_review(
  p_product_id uuid,
  p_order_ref  text,
  p_phone      text,
  p_rating     int,
  p_comment    text default null
)
returns reviews
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_order  orders%rowtype;
  v_phone  text;
  v_owns   boolean;
  v_review reviews%rowtype;
  v_msg    text := 'Commande introuvable. Vérifiez la référence et le numéro de téléphone.';
begin
  if not exists (select 1 from products where id = p_product_id) then
    raise sqlstate 'PT404' using message = 'Produit introuvable';
  end if;

  v_phone := regexp_replace(p_phone, '[\s-]', '', 'g');
  if v_phone !~ '^\+?[0-9]{8,15}$' then
    raise sqlstate 'PT404' using message = v_msg;
  end if;

  select * into v_order from orders where order_ref = upper(trim(p_order_ref));
  if v_order.id is null
     or digest(coalesce(v_order.phone_number, ''), 'sha256') <> digest(v_phone, 'sha256')
  then
    raise sqlstate 'PT404' using message = v_msg;
  end if;

  select exists(
    select 1 from order_items where order_id = v_order.id and product_id = p_product_id
  ) into v_owns;

  if v_order.status <> 'completed' or not v_owns then
    raise sqlstate 'PT400' using message =
      'Vous ne pouvez laisser un avis que pour un produit reçu (commande terminée).';
  end if;

  insert into reviews (product_id, order_id, customer_name, rating, comment, status)
  values (p_product_id, v_order.id, v_order.customer_name, p_rating, p_comment, 'pending')
  returning * into v_review;

  return v_review;
exception
  when unique_violation then
    raise sqlstate 'PT409' using message =
      'Vous avez déjà laissé un avis pour ce produit avec cette commande.';
end;
$$;

revoke execute on function public.submit_review(uuid, text, text, int, text) from public;
grant execute on function public.submit_review(uuid, text, text, int, text) to anon, authenticated;
