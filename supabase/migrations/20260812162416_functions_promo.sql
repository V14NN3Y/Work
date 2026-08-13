-- validate_promo_code: pure preview, ported from routers/promo_codes.py::validate_promo_code.
-- No FOR UPDATE, no usage_count mutation, nothing persisted — reuses the exact same
-- app_private helpers create_order calls authoritatively, so preview and real enforcement can
-- never drift apart, but a promo shown "valid" here can still fail (or lose a usage_limit
-- race) at actual create_order time. Never treat this response as a reservation.
create or replace function public.validate_promo_code(p_code text, p_subtotal numeric)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_promo promo_codes%rowtype;
begin
  select * into v_promo from promo_codes where code = upper(trim(p_code));
  if not found then
    return jsonb_build_object('valid', false, 'message', 'Code promo introuvable.');
  end if;

  begin
    perform app_private.promo_check_eligibility(v_promo, p_subtotal);
  exception
    when sqlstate 'PT400' then
      return jsonb_build_object('valid', false, 'message', sqlerrm);
  end;

  return jsonb_build_object(
    'valid', true,
    'discount_amount', app_private.promo_calculate_discount(v_promo, p_subtotal)
  );
end;
$$;

revoke execute on function public.validate_promo_code(text, numeric) from public;
grant execute on function public.validate_promo_code(text, numeric) to anon, authenticated;
