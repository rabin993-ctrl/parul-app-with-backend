-- Persist companion profile tab classification (update vs gallery).
alter table posts
  add column if not exists companion_content_style text
  check (companion_content_style in ('update', 'gallery'));

comment on column posts.companion_content_style is
  'When companion_author_id is set: update = text post tab, gallery = photo grid tab.';
