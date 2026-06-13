-- ════════════════════════════════════════════════════════════════════════════
-- Wave 7: Treats / Wallet RLS + give_treat RPC
-- ════════════════════════════════════════════════════════════════════════════

-- treat_gifts select: own gifts + received gifts + any gift from a user who
-- has show_treats_on_profile enabled (enforces privacy setting in DB).
create policy treat_gifts_select on treat_gifts
  for select to authenticated using (
    from_user_id = auth.uid()
    or owner_id = auth.uid()
    or exists (
      select 1 from user_privacy_settings ups
      where ups.user_id = treat_gifts.owner_id
        and ups.show_treats_on_profile = true
    )
  );

-- give_treat: atomic decrement + insert (security definer so it can write
-- treat_wallets and treat_gifts without insert policies on those tables).
create or replace function public.give_treat(p_companion_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_wallet   treat_wallets%rowtype;
  v_now      timestamptz := now();
  v_gift_id  uuid;
begin
  -- Resolve companion owner
  select owner_id into v_owner_id
  from companions
  where id = p_companion_id
    and deleted_at is null;

  if not found then
    return json_build_object('ok', false, 'reason', 'companion_not_found');
  end if;

  -- Block giving to own companion
  if v_owner_id = auth.uid() then
    return json_build_object('ok', false, 'reason', 'own_pet');
  end if;

  -- Upsert wallet row (handle_new_user trigger normally creates it)
  insert into treat_wallets (user_id)
  values (auth.uid())
  on conflict (user_id) do nothing;

  select * into v_wallet from treat_wallets where user_id = auth.uid();

  -- Auto-reset period if 30 days have elapsed
  if extract(epoch from (v_now - v_wallet.period_start_at)) >= (30.0 * 24 * 60 * 60) then
    update treat_wallets
    set period_start_at = v_now,
        remaining = allowance
    where user_id = auth.uid()
    returning * into v_wallet;
  end if;

  -- Guard: wallet must have treats remaining
  if v_wallet.remaining <= 0 then
    return json_build_object('ok', false, 'reason', 'empty_wallet');
  end if;

  -- Decrement wallet
  update treat_wallets
  set remaining = remaining - 1
  where user_id = auth.uid();

  -- Record the gift
  insert into treat_gifts (from_user_id, companion_id, owner_id, amount)
  values (auth.uid(), p_companion_id, v_owner_id, 1)
  returning id into v_gift_id;

  return json_build_object(
    'ok',        true,
    'remaining', v_wallet.remaining - 1,
    'owner_id',  v_owner_id::text,
    'gift_id',   v_gift_id::text
  );
end;
$$;
