-- Fix poster_endorsed flag for not_recommended ratings and ensure RPC is callable.

create or replace function endorse_adopter(
  p_record_id      uuid,
  p_recommendation text,
  p_text           text default null
) returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_poster_id uuid;
begin
  select poster_user_id into v_poster_id from adoption_records where id = p_record_id;
  if v_poster_id != auth.uid() then
    raise exception 'Only the poster can endorse an adopter';
  end if;

  insert into adoption_updates (record_id, type, author_user_id, endorsement, text)
  values (
    p_record_id, 'poster_endorsement', auth.uid(),
    p_recommendation::poster_recommendation_enum, p_text
  );

  update adoption_records
  set poster_endorsed       = (p_recommendation = 'recommended'),
      poster_recommendation = p_recommendation::poster_recommendation_enum
  where id = p_record_id;
end;
$$;

grant execute on function public.endorse_adopter(uuid, text, text) to authenticated;
