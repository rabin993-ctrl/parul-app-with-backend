-- Add feed tables to the Supabase realtime publication so that clients
-- receive INSERT/UPDATE/DELETE events without polling.
--
-- posts        → new posts from other users appear in the feed live
-- post_alerts  → alert data (lost/found area, when) is also subscribed
-- post_reactions, post_saves → reaction/save counts update in real time

do $$
begin
  -- posts
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'posts'
  ) then
    alter publication supabase_realtime add table posts;
  end if;

  -- post_alerts
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'post_alerts'
  ) then
    alter publication supabase_realtime add table post_alerts;
  end if;

  -- post_reactions
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'post_reactions'
  ) then
    alter publication supabase_realtime add table post_reactions;
  end if;

  -- post_saves
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'post_saves'
  ) then
    alter publication supabase_realtime add table post_saves;
  end if;
end $$;
