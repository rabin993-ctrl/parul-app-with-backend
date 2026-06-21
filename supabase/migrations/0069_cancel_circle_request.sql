-- Allow the requester to withdraw their own pending circle join request.

create or replace function cancel_circle_request(p_circle_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update circle_join_requests
  set state = 'rejected'
  where circle_id = p_circle_id
    and user_id = auth.uid()
    and state = 'pending';

  if not found then
    raise exception 'no pending request to cancel';
  end if;
end; $$;
