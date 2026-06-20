-- Split public adopter signals: trust flag + overdue ring (independent fields).

drop function if exists public.get_adopter_public_flags(uuid[]);

create or replace function get_adopter_public_flags(p_user_ids uuid[])
returns table (
  user_id uuid,
  trust_flag text,
  update_requested boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_user_ids is null or coalesce(array_length(p_user_ids, 1), 0) = 0 then
    return;
  end if;

  return query
  with target_users as (
    select distinct unnest(p_user_ids) as uid
  ),
  status as (
    select
      tu.uid as user_id,
      exists (
        select 1
        from adoption_records ar
        where ar.adopter_user_id = tu.uid
          and ar.status not in ('pending_confirmation', 'closed')
          and (
            ar.status = 'update_due'
            or (ar.next_update_due_at is not null and ar.next_update_due_at < now())
          )
      ) as update_requested,
      case
        when exists (
          select 1
          from adoption_records ar
          where ar.adopter_user_id = tu.uid
            and ar.status not in ('pending_confirmation', 'closed')
            and ar.poster_recommendation = 'not_recommended'
        ) then 'not_recommended'
        when exists (
          select 1
          from adoption_records ar
          where ar.adopter_user_id = tu.uid
            and ar.status <> 'pending_confirmation'
            and (
              ar.poster_recommendation = 'recommended'
              or (ar.poster_endorsed = true and ar.poster_recommendation is null)
            )
        ) then 'recommended'
        else null
      end as trust_flag
    from target_users tu
  )
  select
    s.user_id,
    s.trust_flag,
    s.update_requested
  from status s
  where s.trust_flag is not null or s.update_requested;
end;
$$;

grant execute on function public.get_adopter_public_flags(uuid[]) to authenticated;
