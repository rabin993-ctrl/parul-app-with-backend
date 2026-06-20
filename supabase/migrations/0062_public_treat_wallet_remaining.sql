-- Public profile: show how many treats an owner has left to give (respects privacy).

create or replace function get_public_treat_wallets_remaining(p_user_ids uuid[])
returns table (
  user_id uuid,
  remaining int
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
begin
  if p_user_ids is null or coalesce(array_length(p_user_ids, 1), 0) = 0 then
    return;
  end if;

  return query
  with target_users as (
    select distinct unnest(p_user_ids) as uid
  )
  select
    tu.uid as user_id,
    case
      when tw.user_id is null then 100
      when extract(epoch from (v_now - tw.period_start_at)) >= (30.0 * 24 * 60 * 60)
        then tw.allowance
      else tw.remaining
    end as remaining
  from target_users tu
  left join treat_wallets tw on tw.user_id = tu.uid
  where get_show_treats_on_profile(tu.uid);
end;
$$;

grant execute on function public.get_public_treat_wallets_remaining(uuid[]) to authenticated;
