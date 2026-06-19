-- Circle chat: media messages (photo/file/voice) alongside text and shared_post.

alter type public.circle_message_type_enum add value if not exists 'media';
alter type public.shared_media_type_enum add value if not exists 'audio';
