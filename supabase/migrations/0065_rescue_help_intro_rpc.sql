-- seed_rescue_help_intro: persist rescue DM context marker as a system message.
-- Client inserts with sender_user_id = null are blocked by messages_insert RLS.

create or replace function seed_rescue_help_intro(
  p_thread_id  uuid,
  p_intro_text text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case_id text;
  v_marker  text;
begin
  if p_thread_id is null then
    raise exception 'p_thread_id must not be null';
  end if;

  if p_intro_text is null or left(p_intro_text, 12) <> 'RESCUE_CASE:' then
    raise exception 'p_intro_text must start with RESCUE_CASE:';
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

  -- Extract case id from "RESCUE_CASE:{uuid}|..."
  v_case_id := split_part(substring(p_intro_text from 13), '|', 1);
  if v_case_id = '' then
    raise exception 'Invalid rescue intro text';
  end if;

  v_marker := 'RESCUE_CASE:' || v_case_id || '|';

  if exists (
    select 1 from messages
    where thread_id = p_thread_id
      and kind = 'system'
      and deleted_at is null
      and text like v_marker || '%'
  ) then
    return;
  end if;

  insert into messages (thread_id, kind, sender_user_id, text)
  values (p_thread_id, 'system', null, p_intro_text);
end;
$$;

grant execute on function seed_rescue_help_intro(uuid, text) to authenticated;
