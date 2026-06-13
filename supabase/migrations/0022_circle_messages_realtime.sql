-- Add circle_messages to the Supabase realtime publication so that
-- postgres_changes subscriptions in useCircleMessages fire on INSERT.
-- Without this, the client channel is established but never receives events.
alter publication supabase_realtime add table circle_messages;
