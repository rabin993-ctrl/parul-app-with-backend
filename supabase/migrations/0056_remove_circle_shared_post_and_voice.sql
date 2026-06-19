-- Circle chat: drop shared feed posts and voice notes (feature paused).

-- Voice notes are media messages with audio attachments.
delete from public.circle_messages cm
where cm.type = 'media'
  and exists (
    select 1
    from public.circle_message_media cmm
    where cmm.message_id = cm.id
      and cmm.type = 'audio'
  );

delete from public.circle_messages
where type = 'shared_post';

drop index if exists public.idx_circle_messages_shared_post_id;

alter table public.circle_messages
  drop column if exists shared_post_id;

create type public.circle_message_type_enum_v2 as enum ('text', 'system', 'media');

alter table public.circle_messages
  alter column type type public.circle_message_type_enum_v2
  using type::text::public.circle_message_type_enum_v2;

drop type public.circle_message_type_enum;
alter type public.circle_message_type_enum_v2 rename to circle_message_type_enum;

create type public.shared_media_type_enum_v2 as enum ('photo', 'file');

alter table public.circle_message_media
  alter column type type public.shared_media_type_enum_v2
  using type::text::public.shared_media_type_enum_v2;

drop type public.shared_media_type_enum;
alter type public.shared_media_type_enum_v2 rename to shared_media_type_enum;
