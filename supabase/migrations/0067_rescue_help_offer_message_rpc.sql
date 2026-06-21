-- seed_rescue_help_offer_message: persist accepted offer text as helper's first chat message.
-- Poster opens chat on accept; helper cannot be impersonated via normal messages_insert RLS.

create or replace function seed_rescue_help_offer_message(
  p_thread_id      uuid,
  p_case_id        uuid,
  p_helper_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message text;
begin
  if p_thread_id is null or p_case_id is null or p_helper_user_id is null then
    raise exception 'p_thread_id, p_case_id, and p_helper_user_id must not be null';
  end if;

  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1 from thread_participants
    where thread_id = p_thread_id and user_id = auth.uid()
  ) then
    raise exception 'Not a participant in this thread';
  end if;

  select trim(o.message) into v_message
  from rescue_help_offers o
  where o.case_id = p_case_id
    and o.helper_user_id = p_helper_user_id
    and o.status = 'accepted'
    and o.message is not null
    and trim(o.message) <> '';

  if v_message is null then
    return;
  end if;

  if exists (
    select 1 from messages
    where thread_id = p_thread_id
      and kind = 'text'
      and sender_user_id = p_helper_user_id
      and deleted_at is null
      and text = v_message
  ) then
    return;
  end if;

  insert into messages (thread_id, kind, sender_user_id, text)
  values (p_thread_id, 'text', p_helper_user_id, v_message);
end;
$$;

grant execute on function seed_rescue_help_offer_message(uuid, uuid, uuid) to authenticated;
