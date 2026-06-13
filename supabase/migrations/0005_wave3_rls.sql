-- 0005_wave3_rls.sql — Wave 3: Adoption RLS + Postgres RPCs + milestone sweep
-- Tables were created in 0001_init.sql.  This migration enables RLS, adds all
-- adoption/messaging policies, and installs the functions consumed by Wave 3.

-- ────────────────────────────────────────────────────────────────────────────
-- Enable RLS
-- ────────────────────────────────────────────────────────────────────────────
alter table adoption_listings        enable row level security;
alter table adoption_listing_media   enable row level security;
alter table adoption_listing_saves   enable row level security;
alter table adoption_requests        enable row level security;
alter table adoption_records         enable row level security;
alter table adoption_updates         enable row level security;
alter table adoption_update_media    enable row level security;
alter table threads                  enable row level security;
alter table thread_participants      enable row level security;
alter table messages                 enable row level security;
alter table message_media            enable row level security;

-- ────────────────────────────────────────────────────────────────────────────
-- adoption_listings
-- ────────────────────────────────────────────────────────────────────────────
-- Public (Available/Urgent) + own + any listing you have a request on
create policy "adoption_listings_select" on adoption_listings
  for select using (
    deleted_at is null and (
      status in ('Available','Urgent')
      or poster_user_id = auth.uid()
      or exists (
        select 1 from adoption_requests ar
        where ar.listing_id = adoption_listings.id
          and (ar.requester_user_id = auth.uid() or ar.poster_user_id = auth.uid())
      )
    )
  );

create policy "adoption_listings_insert" on adoption_listings
  for insert with check (poster_user_id = auth.uid());

create policy "adoption_listings_update" on adoption_listings
  for update using (poster_user_id = auth.uid());

create policy "adoption_listings_delete" on adoption_listings
  for delete using (poster_user_id = auth.uid());

-- ────────────────────────────────────────────────────────────────────────────
-- adoption_listing_media
-- ────────────────────────────────────────────────────────────────────────────
create policy "adoption_listing_media_select" on adoption_listing_media
  for select using (
    exists (
      select 1 from adoption_listings al
      where al.id = adoption_listing_media.listing_id
        and al.deleted_at is null
        and (al.status in ('Available','Urgent') or al.poster_user_id = auth.uid())
    )
  );

create policy "adoption_listing_media_insert" on adoption_listing_media
  for insert with check (
    exists (
      select 1 from adoption_listings
      where id = adoption_listing_media.listing_id and poster_user_id = auth.uid()
    )
  );

create policy "adoption_listing_media_delete" on adoption_listing_media
  for delete using (
    exists (
      select 1 from adoption_listings
      where id = adoption_listing_media.listing_id and poster_user_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- adoption_listing_saves
-- ────────────────────────────────────────────────────────────────────────────
create policy "adoption_listing_saves_select" on adoption_listing_saves
  for select using (user_id = auth.uid());

create policy "adoption_listing_saves_insert" on adoption_listing_saves
  for insert with check (user_id = auth.uid());

create policy "adoption_listing_saves_delete" on adoption_listing_saves
  for delete using (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────────────────────
-- adoption_requests
-- ────────────────────────────────────────────────────────────────────────────
create policy "adoption_requests_select" on adoption_requests
  for select using (
    requester_user_id = auth.uid() or poster_user_id = auth.uid()
  );

create policy "adoption_requests_insert" on adoption_requests
  for insert with check (requester_user_id = auth.uid());

-- poster approves/rejects; requester can cancel (set status or delete)
create policy "adoption_requests_update" on adoption_requests
  for update using (
    poster_user_id = auth.uid() or requester_user_id = auth.uid()
  );

create policy "adoption_requests_delete" on adoption_requests
  for delete using (requester_user_id = auth.uid());

-- ────────────────────────────────────────────────────────────────────────────
-- adoption_records  (only that record's poster + adopter)
-- ────────────────────────────────────────────────────────────────────────────
create policy "adoption_records_select" on adoption_records
  for select using (
    poster_user_id = auth.uid() or adopter_user_id = auth.uid()
  );

create policy "adoption_records_insert" on adoption_records
  for insert with check (poster_user_id = auth.uid());

create policy "adoption_records_update" on adoption_records
  for update using (
    poster_user_id = auth.uid() or adopter_user_id = auth.uid()
  );

-- ────────────────────────────────────────────────────────────────────────────
-- adoption_updates
-- ────────────────────────────────────────────────────────────────────────────
create policy "adoption_updates_select" on adoption_updates
  for select using (
    exists (
      select 1 from adoption_records ar
      where ar.id = adoption_updates.record_id
        and (ar.poster_user_id = auth.uid() or ar.adopter_user_id = auth.uid())
    )
  );

create policy "adoption_updates_insert" on adoption_updates
  for insert with check (
    author_user_id = auth.uid()
    and exists (
      select 1 from adoption_records ar
      where ar.id = adoption_updates.record_id
        and (ar.poster_user_id = auth.uid() or ar.adopter_user_id = auth.uid())
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- adoption_update_media
-- ────────────────────────────────────────────────────────────────────────────
create policy "adoption_update_media_select" on adoption_update_media
  for select using (
    exists (
      select 1 from adoption_updates au
      join adoption_records ar on ar.id = au.record_id
      where au.id = adoption_update_media.update_id
        and (ar.poster_user_id = auth.uid() or ar.adopter_user_id = auth.uid())
    )
  );

create policy "adoption_update_media_insert" on adoption_update_media
  for insert with check (
    exists (
      select 1 from adoption_updates au
      join adoption_records ar on ar.id = au.record_id
      where au.id = adoption_update_media.update_id
        and (ar.poster_user_id = auth.uid() or ar.adopter_user_id = auth.uid())
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- threads  (participants only)
-- ────────────────────────────────────────────────────────────────────────────
create policy "threads_select" on threads
  for select using (
    exists (
      select 1 from thread_participants
      where thread_id = threads.id and user_id = auth.uid()
    )
  );

create policy "threads_insert" on threads
  for insert with check (auth.uid() is not null);

create policy "threads_update" on threads
  for update using (
    exists (
      select 1 from thread_participants
      where thread_id = threads.id and user_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- thread_participants
-- ────────────────────────────────────────────────────────────────────────────
create policy "thread_participants_select" on thread_participants
  for select using (
    exists (
      select 1 from thread_participants tp2
      where tp2.thread_id = thread_participants.thread_id
        and tp2.user_id = auth.uid()
    )
  );

create policy "thread_participants_insert" on thread_participants
  for insert with check (auth.uid() is not null);

create policy "thread_participants_update" on thread_participants
  for update using (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────────────────────
-- messages
-- ────────────────────────────────────────────────────────────────────────────
create policy "messages_select" on messages
  for select using (
    deleted_at is null
    and exists (
      select 1 from thread_participants
      where thread_id = messages.thread_id and user_id = auth.uid()
    )
  );

create policy "messages_insert" on messages
  for insert with check (
    sender_user_id = auth.uid()
    and exists (
      select 1 from thread_participants
      where thread_id = messages.thread_id and user_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- message_media
-- ────────────────────────────────────────────────────────────────────────────
create policy "message_media_select" on message_media
  for select using (
    exists (
      select 1 from messages m
      join thread_participants tp on tp.thread_id = m.thread_id
      where m.id = message_media.message_id and tp.user_id = auth.uid()
    )
  );

-- ════════════════════════════════════════════════════════════════════════════
-- RPC: approve_adoption_request
-- Caller must be the listing poster.  Creates adoption thread + links it.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function approve_adoption_request(p_request_id uuid)
returns uuid
language plpgsql security definer as $$
declare
  v_req    adoption_requests%rowtype;
  v_thread_id uuid;
begin
  select * into v_req from adoption_requests where id = p_request_id;
  if not found then raise exception 'Request not found'; end if;
  if v_req.poster_user_id != auth.uid() then
    raise exception 'Only the listing poster can approve a request';
  end if;

  -- Reuse existing thread if already created
  if v_req.thread_id is not null then
    v_thread_id := v_req.thread_id;
  else
    insert into threads (type, adoption_listing_id)
    values ('adoption', v_req.listing_id)
    returning id into v_thread_id;

    insert into thread_participants (thread_id, user_id)
    values (v_thread_id, v_req.poster_user_id),
           (v_thread_id, v_req.requester_user_id)
    on conflict (thread_id, user_id) do nothing;

    update adoption_requests set thread_id = v_thread_id where id = p_request_id;
  end if;

  update adoption_requests set status = 'approved' where id = p_request_id;
  return v_thread_id;
end;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- RPC: reject_adoption_request
-- ════════════════════════════════════════════════════════════════════════════
create or replace function reject_adoption_request(p_request_id uuid)
returns void
language plpgsql security definer as $$
begin
  update adoption_requests
  set status = 'rejected'
  where id = p_request_id and poster_user_id = auth.uid();

  if not found then
    raise exception 'Only the listing poster can reject a request';
  end if;
end;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- RPC: propose_adoption
-- Poster proposes (and immediately confirms) an adoption.
-- Creates the record, seeds the bootstrap update, marks listing Adopted.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function propose_adoption(
  p_listing_id       uuid,
  p_adopter_user_id  uuid,
  p_pet_name         text,
  p_species          text,
  p_icon             text,
  p_tint             text,
  p_thread_id        uuid default null
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

  return v_record_id;
end;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- RPC: confirm_adoption
-- For the pending_confirmation → confirmed transition (adopter confirms).
-- ════════════════════════════════════════════════════════════════════════════
create or replace function confirm_adoption(p_record_id uuid)
returns void
language plpgsql security definer as $$
declare
  v_rec            adoption_records%rowtype;
  v_confirmed_at   timestamptz := now();
begin
  select * into v_rec from adoption_records where id = p_record_id;
  if not found then raise exception 'Record not found'; end if;
  if v_rec.poster_user_id != auth.uid() and v_rec.adopter_user_id != auth.uid() then
    raise exception 'Only poster or adopter can confirm an adoption';
  end if;

  update adoption_records
  set status               = 'confirmed',
      confirmed_at         = v_confirmed_at,
      completed_milestones = '{}',
      next_update_due_at   = v_confirmed_at + interval '7 days'
  where id = p_record_id;

  insert into adoption_updates (record_id, type, author_user_id, text)
  values (p_record_id, 'adopter_home', v_rec.adopter_user_id, 'First day home — settling in well.');
end;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- RPC: post_adoption_update
-- Inserts an update; advances milestone tracking if milestone_id is given.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function post_adoption_update(
  p_record_id    uuid,
  p_type         text,            -- adoption_update_type_enum cast
  p_text         text    default null,
  p_milestone_id text    default null,  -- milestone_enum cast; null = no milestone
  p_photo_count  int     default null,
  p_has_video    boolean default false
) returns uuid
language plpgsql security definer as $$
declare
  v_rec       adoption_records%rowtype;
  v_update_id uuid;
begin
  select * into v_rec from adoption_records where id = p_record_id;
  if not found then raise exception 'Record not found'; end if;
  if v_rec.poster_user_id != auth.uid() and v_rec.adopter_user_id != auth.uid() then
    raise exception 'Only poster or adopter can post an update';
  end if;

  insert into adoption_updates (
    record_id, type, author_user_id, text, milestone_id, photo_count, has_video
  ) values (
    p_record_id,
    p_type::adoption_update_type_enum,
    auth.uid(),
    p_text,
    case when p_milestone_id is not null then p_milestone_id::milestone_enum else null end,
    p_photo_count,
    p_has_video
  ) returning id into v_update_id;

  -- Advance milestone tracking
  if p_milestone_id is not null then
    update adoption_records
    set completed_milestones = array_append(
          completed_milestones,
          p_milestone_id::milestone_enum
        ),
        next_update_due_at = case p_milestone_id
          when 'week_1'  then confirmed_at + interval '30 days'
          when 'month_1' then confirmed_at + interval '90 days'
          when 'month_3' then confirmed_at + interval '180 days'
          when 'month_6' then null
          else next_update_due_at
        end,
        status = case
          when p_milestone_id = 'month_6' then 'closed'::adoption_record_status_enum
          else 'confirmed'::adoption_record_status_enum
        end
    where id = p_record_id;
  end if;

  return v_update_id;
end;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- RPC: endorse_adopter
-- ════════════════════════════════════════════════════════════════════════════
create or replace function endorse_adopter(
  p_record_id      uuid,
  p_recommendation text,  -- 'recommended' | 'not_recommended'
  p_text           text default null
) returns void
language plpgsql security definer as $$
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
  set poster_endorsed       = true,
      poster_recommendation = p_recommendation::poster_recommendation_enum
  where id = p_record_id;
end;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- RPC: adopter_respond
-- ════════════════════════════════════════════════════════════════════════════
create or replace function adopter_respond(p_record_id uuid, p_text text)
returns void
language plpgsql security definer as $$
declare
  v_adopter_id uuid;
begin
  select adopter_user_id into v_adopter_id from adoption_records where id = p_record_id;
  if v_adopter_id != auth.uid() then
    raise exception 'Only the adopter can respond';
  end if;

  insert into adoption_updates (record_id, type, author_user_id, text)
  values (p_record_id, 'adopter_response', auth.uid(), p_text);
end;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- Milestone sweep function (called by the Edge Function with service role)
-- Finds confirmed/update_due records past next_update_due_at, marks them
-- update_due, creates update_request notifications for the adopter.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function do_milestone_sweep()
returns int
language plpgsql security definer as $$
declare
  v_rec   adoption_records%rowtype;
  v_count int := 0;
begin
  for v_rec in
    select * from adoption_records
    where status in ('confirmed','update_due')
      and next_update_due_at is not null
      and next_update_due_at < now()
  loop
    update adoption_records
    set status = 'update_due'
    where id = v_rec.id;

    -- Notify adopter
    insert into notifications (
      recipient_id, type, actor_user_id, entity_type, entity_id, title, body, data
    ) values (
      v_rec.adopter_user_id,
      'update_request',
      v_rec.poster_user_id,
      'adoption_record',
      v_rec.id,
      'Home update requested · ' || v_rec.pet_name,
      'Time to share a check-in for ' || v_rec.pet_name || '.',
      jsonb_build_object(
        'record_id', v_rec.id,
        'pet_name',  v_rec.pet_name
      )
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- pg_cron (optional): enable extension and schedule milestone sweep.
-- The schedule is added via Supabase Dashboard or with the project URL known.
-- The extension must be enabled in Dashboard → Database → Extensions first.
-- Uncomment after enabling:
-- create extension if not exists pg_cron schema extensions;
-- select cron.schedule(
--   'milestone-sweep-hourly',
--   '0 * * * *',
--   $$ select net.http_post(
--     url := current_setting('app.supabase_edge_url') || '/functions/v1/milestone-sweep',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer ' || current_setting('app.service_role_key')
--     ),
--     body := '{}'::jsonb
--   ) $$
-- );
-- ════════════════════════════════════════════════════════════════════════════
