-- Enable Supabase Realtime for adoption + thread membership tables.
-- Client hooks subscribe to these tables; without publication entries the
-- channels connect but never receive postgres_changes events.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'adoption_requests'
  ) then
    alter publication supabase_realtime add table adoption_requests;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'adoption_listings'
  ) then
    alter publication supabase_realtime add table adoption_listings;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'adoption_records'
  ) then
    alter publication supabase_realtime add table adoption_records;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'adoption_updates'
  ) then
    alter publication supabase_realtime add table adoption_updates;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'thread_participants'
  ) then
    alter publication supabase_realtime add table thread_participants;
  end if;
end $$;
