-- ════════════════════════════════════════════════════════════════════════════
-- Community events
-- ════════════════════════════════════════════════════════════════════════════

create table community_events (
  id           uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  created_by   uuid not null references users(id) on delete cascade,
  title        text not null,
  description  text,
  location     text,
  starts_at    timestamptz not null,
  ends_at      timestamptz,
  tint         text,
  created_at   timestamptz not null default now()
);

create index on community_events (community_id, starts_at);

alter table community_events enable row level security;

-- All authenticated users can read events in any community.
create policy community_events_select on community_events
  for select to authenticated using (true);

-- Only community members can create events.
create policy community_events_insert on community_events
  for insert to authenticated
  with check (
    exists (
      select 1 from community_members
      where community_id = community_events.community_id
        and user_id = auth.uid()
    )
  );

-- Only the creator can update/delete their events.
create policy community_events_update on community_events
  for update to authenticated
  using (created_by = auth.uid());

create policy community_events_delete on community_events
  for delete to authenticated
  using (created_by = auth.uid());
