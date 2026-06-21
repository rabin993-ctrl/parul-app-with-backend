-- Restore shared feed posts in circle chat (reverses 0056 shared_post removal).

alter type public.circle_message_type_enum add value if not exists 'shared_post';

alter table public.circle_messages
  add column if not exists shared_post_id uuid references public.posts(id) on delete set null;

create index if not exists idx_circle_messages_shared_post_id
  on public.circle_messages (shared_post_id);
