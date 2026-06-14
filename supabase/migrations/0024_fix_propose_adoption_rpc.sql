-- Update propose_adoption to atomically close out request statuses.
-- Adds optional p_request_id: if supplied, marks that request 'adopted' and
-- rejects all other active requests for the same listing.

create or replace function propose_adoption(
  p_listing_id       uuid,
  p_adopter_user_id  uuid,
  p_pet_name         text,
  p_species          text,
  p_icon             text,
  p_tint             text,
  p_thread_id        uuid default null,
  p_request_id       uuid default null
) returns uuid
language plpgsql security definer as $$
declare
  v_poster_user_id uuid;
  v_confirmed_at   timestamptz := now();
  v_record_id      uuid;
begin
  select poster_user_id into v_poster_user_id
  from adoption_listings where id = p_listing_id;

  if v_poster_user_id is null then raise exception 'Listing not found'; end if;
  if v_poster_user_id != auth.uid() then
    raise exception 'Only the listing poster can propose an adoption';
  end if;

  insert into adoption_records (
    listing_id, chat_thread_id, poster_user_id, adopter_user_id,
    pet_name, species, icon, tint,
    status, confirmed_at, completed_milestones, next_update_due_at
  ) values (
    p_listing_id, p_thread_id, v_poster_user_id, p_adopter_user_id,
    p_pet_name, p_species, p_icon, p_tint,
    'confirmed', v_confirmed_at, '{}', v_confirmed_at + interval '7 days'
  ) returning id into v_record_id;

  -- Seed bootstrap home update
  insert into adoption_updates (record_id, type, author_user_id, text)
  values (v_record_id, 'adopter_home', p_adopter_user_id, 'First day home — settling in well.');

  -- Mark listing adopted
  update adoption_listings
  set status = 'Adopted', adopted_date = v_confirmed_at
  where id = p_listing_id;

  -- Link thread → record
  if p_thread_id is not null then
    update threads set adoption_record_id = v_record_id where id = p_thread_id;
  end if;

  -- Update request statuses atomically
  if p_request_id is not null then
    update adoption_requests
    set status = 'adopted'
    where id = p_request_id and listing_id = p_listing_id;
  end if;

  -- Reject all other active requests for this listing
  update adoption_requests
  set status = 'rejected'
  where listing_id = p_listing_id
    and status in ('submitted', 'approved')
    and (p_request_id is null or id != p_request_id);

  return v_record_id;
end;
$$;
