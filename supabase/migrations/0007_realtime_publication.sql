-- Add messaging tables to the Supabase realtime publication so that
-- postgres_changes subscriptions in useAdoptionThreads actually fire.
-- Without this, the client subscription is established but never receives
-- any INSERT events.
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table threads;
