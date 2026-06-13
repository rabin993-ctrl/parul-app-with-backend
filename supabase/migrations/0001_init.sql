-- 0001_init.sql — Parul initial schema (Wave 0)
-- Source of truth: docs/backend/02-data-model.md (with the locked-plan retrofit).
-- DEFERRED, NOT created here: vets, vet_*, payments, auth_credentials, sessions (+ their enums).
-- public.users is keyed to auth.users(id). RLS is enabled on every table (default-deny);
-- baseline policies are added for identity so auth + profile work after Wave 0. Per-domain
-- policies/RPCs/triggers are added in their respective waves.
--
-- Apply with: npm run db:push   (then: npm run gen:types)

-- ────────────────────────────────────────────────────────────────────────────
-- Extensions
-- ────────────────────────────────────────────────────────────────────────────
create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists citext;      -- case-insensitive handles/emails
-- pg_cron (used by the Wave 3 milestone sweep) — enable in Wave 3 or via
-- Dashboard → Database → Extensions if `create extension` is restricted on your tier:
-- create extension if not exists pg_cron;

-- ────────────────────────────────────────────────────────────────────────────
-- Enum types
-- ────────────────────────────────────────────────────────────────────────────
create type profile_trust_status_enum    as enum ('trusted','good','warning','flagged');
create type adopter_trust_badge_enum      as enum ('trusted','active','new','update_pending');
create type profile_visibility_enum       as enum ('everyone','circles','only_me');
create type message_policy_enum           as enum ('everyone','circles','none');

create type species_enum                  as enum ('dog','cat','other');
create type gender_enum                   as enum ('Male','Female');

create type post_tag_enum                 as enum ('discussion','adoption','lost-found','rescue','paw-posting');
create type post_adoption_status_enum     as enum ('open','adopted');
create type alert_kind_enum               as enum ('lost','found');
create type reaction_kind_enum            as enum ('paw');

create type community_category_enum       as enum ('general','rescue','health','lost-found','tips','events');
create type community_composer_enum       as enum ('discussion','lost','found','rescue','meme');
create type join_policy_enum              as enum ('open','request','invite');
create type member_role_enum              as enum ('admin','member');
create type request_state_enum            as enum ('pending','approved','rejected');

create type circle_privacy_enum           as enum ('open','request');
create type circle_message_type_enum      as enum ('text','system','shared_post');
create type shared_media_type_enum        as enum ('photo','file');

create type adoption_listing_status_enum  as enum ('Available','Urgent','Adopted');
create type vaccination_enum              as enum ('Done','Partial','Not yet');
create type age_group_enum                as enum ('puppy-kitten','young','adult','senior');
create type adoption_request_status_enum  as enum ('submitted','approved','rejected','adopted');
create type adoption_record_status_enum   as enum ('pending_confirmation','confirmed','update_due','closed');
create type adoption_update_type_enum     as enum ('adopter_home','poster_placement','poster_endorsement','adopter_response');
create type poster_recommendation_enum    as enum ('recommended','not_recommended');
create type milestone_enum                as enum ('week_1','month_1','month_3','month_6');

create type rescue_status_enum            as enum ('active','under_treatment','recovered');

create type thread_type_enum              as enum ('dm','adoption');
create type message_kind_enum             as enum ('text','system','update_request');

create type media_type_enum               as enum ('image','video','file');
create type report_target_enum            as enum ('user','post','community_post','circle','message');
create type report_state_enum             as enum ('open','reviewing','actioned','dismissed');
create type saved_item_type_enum          as enum ('feed_post','community_post');

-- ────────────────────────────────────────────────────────────────────────────
-- Shared helper: auto-maintain updated_at
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- Identity & profile
-- ════════════════════════════════════════════════════════════════════════════
create table users (
  id               uuid primary key references auth.users(id) on delete cascade,
  handle           citext unique not null,
  name             text not null,
  email            citext unique,
  phone            text unique,
  tint             text,
  avatar_media_id  uuid,                         -- -> media_assets (no hard FK)
  bio              text,
  location         text,
  website          text,
  verified         boolean not null default false,
  online_last_seen timestamptz,
  joined_at        timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);
create trigger trg_users_updated before update on users
  for each row execute function set_updated_at();

create table user_privacy_settings (
  user_id            uuid primary key references users(id) on delete cascade,
  profile_visibility profile_visibility_enum not null default 'everyone',
  post_visibility    profile_visibility_enum not null default 'everyone',
  message_policy     message_policy_enum     not null default 'everyone',
  discoverable       boolean not null default true,
  show_online        boolean not null default true,
  show_location      boolean not null default true,
  show_companions    boolean not null default true,
  notify_post_activity    boolean not null default true,
  notify_adoption_updates boolean not null default true,
  show_treats_on_profile  boolean not null default true
);

create table blocked_users (
  blocker_id uuid not null references users(id) on delete cascade,
  blocked_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

create table reviews (
  id              uuid primary key default gen_random_uuid(),
  subject_user_id uuid not null references users(id) on delete cascade,
  author_user_id  uuid not null references users(id) on delete cascade,
  rating          int  not null check (rating between 1 and 5),
  body            text not null,
  created_at      timestamptz not null default now(),
  unique (subject_user_id, author_user_id)
);

-- ════════════════════════════════════════════════════════════════════════════
-- Media
-- ════════════════════════════════════════════════════════════════════════════
create table media_assets (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid references users(id) on delete set null,
  type        media_type_enum not null,
  url         text not null,
  thumb_url   text,
  mime        text,
  width       int,
  height      int,
  bytes       bigint,
  duration_ms int,
  created_at  timestamptz not null default now()
);

-- ════════════════════════════════════════════════════════════════════════════
-- Companions
-- ════════════════════════════════════════════════════════════════════════════
create table companions (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references users(id) on delete cascade,
  name            text not null,
  handle          citext,
  species         species_enum not null,
  breed           text,
  age             text,
  gender          text,
  icon            text,
  tint            text,
  avatar_media_id uuid,
  traits          text[] not null default '{}',
  mood            text,
  about           text,
  vaccinated      boolean not null default false,
  neutered        boolean not null default false,
  microchipped    boolean not null default false,
  pawprints       int not null default 0,
  verified        boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create trigger trg_companions_updated before update on companions
  for each row execute function set_updated_at();

create table companion_followers (
  companion_id uuid not null references companions(id) on delete cascade,
  user_id      uuid not null references users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (companion_id, user_id)
);

-- ════════════════════════════════════════════════════════════════════════════
-- Paw Circles (core — created before posts because posts.circle_id -> circles)
-- ════════════════════════════════════════════════════════════════════════════
create table circles (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  location   text,
  icon       text,
  tint       text,
  icon_bg    text,
  tagline    text,
  bio        text,
  tags       text[] not null default '{}',
  privacy    circle_privacy_enum not null default 'open',
  created_by uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger trg_circles_updated before update on circles
  for each row execute function set_updated_at();

create table circle_members (
  circle_id    uuid not null references circles(id) on delete cascade,
  user_id      uuid not null references users(id) on delete cascade,
  role         member_role_enum not null default 'member',
  joined_at    timestamptz not null default now(),
  muted        boolean not null default false,
  last_read_at timestamptz,
  primary key (circle_id, user_id)
);

create table circle_join_requests (
  id         uuid primary key default gen_random_uuid(),
  circle_id  uuid not null references circles(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,
  note       text,
  state      request_state_enum not null default 'pending',
  created_at timestamptz not null default now(),
  unique (circle_id, user_id)
);

-- ════════════════════════════════════════════════════════════════════════════
-- Feed
-- ════════════════════════════════════════════════════════════════════════════
create table posts (
  id                  uuid primary key default gen_random_uuid(),
  author_user_id      uuid not null references users(id) on delete cascade,
  companion_author_id uuid references companions(id) on delete set null,
  text                text,
  tag                 post_tag_enum,
  label               text,
  is_circle           boolean not null default false,
  circle_id           uuid references circles(id) on delete set null,
  location            text,
  adoption_status     post_adoption_status_enum,
  created_at          timestamptz not null default now(),
  edited_at           timestamptz,
  deleted_at          timestamptz
);

create table post_media (
  post_id  uuid not null references posts(id) on delete cascade,
  idx      int  not null,
  media_id uuid not null references media_assets(id),
  primary key (post_id, idx)
);

create table post_companions (
  post_id      uuid not null references posts(id) on delete cascade,
  companion_id uuid not null references companions(id) on delete cascade,
  primary key (post_id, companion_id)
);

create table post_alerts (
  post_id    uuid primary key references posts(id) on delete cascade,
  kind       alert_kind_enum not null,
  area       text,
  last_seen  text,
  found_at   text,
  looks_like text,
  phone      text
);

create table post_reactions (
  post_id    uuid not null references posts(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,
  kind       reaction_kind_enum not null default 'paw',
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, kind)
);

create table post_saves (
  post_id    uuid not null references posts(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table post_forwards (
  id               uuid primary key default gen_random_uuid(),
  post_id          uuid not null references posts(id) on delete cascade,
  user_id          uuid not null references users(id) on delete cascade,
  destination_type text not null,
  destination_id   uuid,
  created_at       timestamptz not null default now()
);

create table comments (
  id             uuid primary key default gen_random_uuid(),
  post_id        uuid not null references posts(id) on delete cascade,
  parent_id      uuid references comments(id) on delete cascade,
  author_user_id uuid not null references users(id) on delete cascade,
  text           text not null,
  created_at     timestamptz not null default now(),
  deleted_at     timestamptz
);

create table comment_reactions (
  comment_id uuid not null references comments(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,
  kind       reaction_kind_enum not null default 'paw',
  primary key (comment_id, user_id, kind)
);

-- circle chat (here because circle_messages.shared_post_id -> posts)
create table circle_messages (
  id             uuid primary key default gen_random_uuid(),
  circle_id      uuid not null references circles(id) on delete cascade,
  type           circle_message_type_enum not null,
  sender_user_id uuid references users(id) on delete set null,
  text           text,
  shared_post_id uuid references posts(id) on delete set null,
  pinned         boolean not null default false,
  created_at     timestamptz not null default now(),
  deleted_at     timestamptz
);

create table circle_message_media (
  id         uuid primary key default gen_random_uuid(),
  circle_id  uuid not null references circles(id) on delete cascade,
  message_id uuid references circle_messages(id) on delete cascade,
  type       shared_media_type_enum not null,
  media_id   uuid references media_assets(id),
  name       text,
  size       text,
  created_at timestamptz not null default now()
);

-- ════════════════════════════════════════════════════════════════════════════
-- Community (Groups)
-- ════════════════════════════════════════════════════════════════════════════
create table communities (
  id                       uuid primary key default gen_random_uuid(),
  name                     text not null,
  about                    text,
  icon                     text,
  tint                     text,
  cover_media_id           uuid references media_assets(id),
  created_by               uuid not null references users(id),
  join_policy              join_policy_enum not null default 'open',
  default_category         community_category_enum not null default 'general',
  enabled_topics           community_category_enum[] not null default '{general}',
  guidelines               text[] not null default '{}',
  require_photo_lost_found boolean not null default false,
  allow_links              boolean not null default true,
  post_approval            boolean not null default false,
  members_only             boolean not null default false,
  show_location            boolean not null default true,
  discoverable             boolean not null default true,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create trigger trg_communities_updated before update on communities
  for each row execute function set_updated_at();

create table community_members (
  community_id uuid not null references communities(id) on delete cascade,
  user_id      uuid not null references users(id) on delete cascade,
  role         member_role_enum not null default 'member',
  joined_at    timestamptz not null default now(),
  primary key (community_id, user_id)
);

create table community_join_requests (
  id           uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  user_id      uuid not null references users(id) on delete cascade,
  state        request_state_enum not null default 'pending',
  created_at   timestamptz not null default now(),
  unique (community_id, user_id)
);

create table community_posts (
  id             uuid primary key default gen_random_uuid(),
  community_id   uuid not null references communities(id) on delete cascade,
  author_user_id uuid not null references users(id) on delete cascade,
  title          text not null,
  body           text not null,
  category       community_category_enum not null,
  composer_label community_composer_enum,
  alert_meta     jsonb,
  image_media_id uuid references media_assets(id),
  image_tint     text,
  trending_score numeric not null default 0,
  approved       boolean not null default true,
  created_at     timestamptz not null default now(),
  deleted_at     timestamptz
);

create table community_post_companions (
  post_id      uuid not null references community_posts(id) on delete cascade,
  companion_id uuid not null references companions(id) on delete cascade,
  primary key (post_id, companion_id)
);

create table community_post_helpful (
  post_id uuid not null references community_posts(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  primary key (post_id, user_id)
);

create table community_comments (
  id             uuid primary key default gen_random_uuid(),
  post_id        uuid not null references community_posts(id) on delete cascade,
  parent_id      uuid references community_comments(id) on delete cascade,
  author_user_id uuid not null references users(id) on delete cascade,
  text           text not null,
  created_at     timestamptz not null default now(),
  deleted_at     timestamptz
);

create table community_comment_helpful (
  comment_id uuid not null references community_comments(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,
  primary key (comment_id, user_id)
);

-- ════════════════════════════════════════════════════════════════════════════
-- Adoption
-- ════════════════════════════════════════════════════════════════════════════
create table adoption_listings (
  id             uuid primary key default gen_random_uuid(),
  poster_user_id uuid not null references users(id) on delete cascade,
  name           text not null,
  species        species_enum not null,
  breed          text,
  age            text,
  age_group      age_group_enum,
  gender         gender_enum,
  location       text,
  icon           text,
  tint           text,
  vaccination    vaccination_enum not null default 'Not yet',
  neutered       boolean not null default false,
  microchipped   boolean not null default false,
  health_notes   text,
  personality    text,
  story          text,
  requirements   text[] not null default '{}',
  urgent         boolean not null default false,
  status         adoption_listing_status_enum not null default 'Available',
  posted_at      timestamptz not null default now(),
  adopted_date   timestamptz,
  adopted_note   text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);
create trigger trg_adoption_listings_updated before update on adoption_listings
  for each row execute function set_updated_at();

create table adoption_listing_media (
  listing_id uuid not null references adoption_listings(id) on delete cascade,
  idx        int not null,
  media_id   uuid not null references media_assets(id),
  primary key (listing_id, idx)
);

create table adoption_listing_saves (
  listing_id uuid not null references adoption_listings(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,
  primary key (listing_id, user_id)
);

-- threads: adoption_record_id FK added later (circular with adoption_records)
create table threads (
  id                  uuid primary key default gen_random_uuid(),
  type                thread_type_enum not null default 'dm',
  adoption_listing_id uuid references adoption_listings(id) on delete set null,
  adoption_record_id  uuid,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create trigger trg_threads_updated before update on threads
  for each row execute function set_updated_at();

create table adoption_records (
  id                    uuid primary key default gen_random_uuid(),
  listing_id            uuid not null references adoption_listings(id) on delete cascade,
  chat_thread_id        uuid references threads(id) on delete set null,
  poster_user_id        uuid not null references users(id) on delete cascade,
  adopter_user_id       uuid not null references users(id) on delete cascade,
  pet_name              text not null,
  species               text,
  icon                  text,
  tint                  text,
  new_home              text,
  status                adoption_record_status_enum not null default 'pending_confirmation',
  confirmed_at          timestamptz,
  completed_milestones  milestone_enum[] not null default '{}',
  poster_endorsed       boolean not null default false,
  poster_recommendation poster_recommendation_enum,
  next_update_due_at    timestamptz,
  closed_reason         text,
  closed_at             timestamptz,
  created_at            timestamptz not null default now()
);

-- now that adoption_records exists, complete the circular FK on threads
alter table threads
  add constraint threads_adoption_record_fk
  foreign key (adoption_record_id) references adoption_records(id) on delete set null;

create table adoption_requests (
  id                uuid primary key default gen_random_uuid(),
  listing_id        uuid not null references adoption_listings(id) on delete cascade,
  poster_user_id    uuid not null references users(id) on delete cascade,
  requester_user_id uuid not null references users(id) on delete cascade,
  message           text,
  status            adoption_request_status_enum not null default 'submitted',
  submitted_at      timestamptz not null default now(),
  thread_id         uuid references threads(id) on delete set null,
  unique (listing_id, requester_user_id)
);

create table adoption_updates (
  id             uuid primary key default gen_random_uuid(),
  record_id      uuid not null references adoption_records(id) on delete cascade,
  type           adoption_update_type_enum not null,
  author_user_id uuid not null references users(id) on delete cascade,
  text           text,
  endorsement    poster_recommendation_enum,
  photo_count    int,
  has_video      boolean not null default false,
  milestone_id   milestone_enum,
  created_at     timestamptz not null default now()
);

create table adoption_update_media (
  update_id uuid not null references adoption_updates(id) on delete cascade,
  idx       int not null,
  media_id  uuid not null references media_assets(id),
  primary key (update_id, idx)
);

-- ════════════════════════════════════════════════════════════════════════════
-- Messaging
-- ════════════════════════════════════════════════════════════════════════════
create table thread_participants (
  thread_id            uuid not null references threads(id) on delete cascade,
  user_id              uuid not null references users(id) on delete cascade,
  muted                boolean not null default false,
  last_read_message_id uuid,                 -- -> messages.id (no hard FK)
  primary key (thread_id, user_id)
);

create table messages (
  id             uuid primary key default gen_random_uuid(),
  thread_id      uuid not null references threads(id) on delete cascade,
  kind           message_kind_enum not null default 'text',
  sender_user_id uuid references users(id) on delete set null,
  text           text,
  record_id      uuid references adoption_records(id) on delete set null,
  created_at     timestamptz not null default now(),
  deleted_at     timestamptz
);

create table message_media (
  message_id uuid not null references messages(id) on delete cascade,
  idx        int not null,
  media_id   uuid not null references media_assets(id),
  primary key (message_id, idx)
);

-- ════════════════════════════════════════════════════════════════════════════
-- Rescue
-- ════════════════════════════════════════════════════════════════════════════
create table rescue_cases (
  id             uuid primary key default gen_random_uuid(),
  poster_user_id uuid not null references users(id) on delete cascade,
  case_code      text unique,
  name           text not null,
  species        species_enum not null,
  icon           text,
  tint           text,
  status         rescue_status_enum not null default 'active',
  location       text,
  headline       text,
  story          text,
  tags           text[] not null default '{}',
  post_id        uuid references posts(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);
create trigger trg_rescue_cases_updated before update on rescue_cases
  for each row execute function set_updated_at();

create table rescue_updates (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid not null references rescue_cases(id) on delete cascade,
  text        text,
  photo_count int not null default 0,
  has_video   boolean not null default false,
  created_at  timestamptz not null default now()
);

create table rescue_update_media (
  update_id uuid not null references rescue_updates(id) on delete cascade,
  idx       int not null,
  media_id  uuid not null references media_assets(id),
  primary key (update_id, idx)
);

create table rescue_case_followers (
  case_id    uuid not null references rescue_cases(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (case_id, user_id)
);

-- ════════════════════════════════════════════════════════════════════════════
-- Treats
-- ════════════════════════════════════════════════════════════════════════════
create table treat_wallets (
  user_id         uuid primary key references users(id) on delete cascade,
  period_start_at timestamptz not null default now(),
  remaining       int not null default 100,
  allowance       int not null default 100
);

create table treat_gifts (
  id           uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references users(id) on delete cascade,
  companion_id uuid not null references companions(id) on delete cascade,
  owner_id     uuid not null references users(id) on delete cascade,
  amount       int not null default 1,
  created_at   timestamptz not null default now()
);

-- ════════════════════════════════════════════════════════════════════════════
-- Saves, notifications, reports
-- ════════════════════════════════════════════════════════════════════════════
create table saved_items (
  user_id    uuid not null references users(id) on delete cascade,
  item_type  saved_item_type_enum not null,
  item_id    uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, item_type, item_id)
);

create table notifications (
  id            uuid primary key default gen_random_uuid(),
  recipient_id  uuid not null references users(id) on delete cascade,
  type          text not null,
  title         text,
  body          text,
  actor_user_id uuid references users(id) on delete set null,
  entity_type   text,
  entity_id     uuid,
  data          jsonb,
  read          boolean not null default false,
  created_at    timestamptz not null default now()
);

create table push_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  platform   text not null,
  token      text not null,
  created_at timestamptz not null default now(),
  unique (user_id, token)
);

create table reports (
  id               uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references users(id) on delete cascade,
  target_type      report_target_enum not null,
  target_id        uuid not null,
  reason           text not null,
  details          text,
  state            report_state_enum not null default 'open',
  created_at       timestamptz not null default now()
);

-- ════════════════════════════════════════════════════════════════════════════
-- Derived view: profile trust
-- ════════════════════════════════════════════════════════════════════════════
create view profile_trust as
select u.id as user_id,
       coalesce(avg(r.rating), 0)::numeric(3,2) as rating,
       count(r.*)                               as review_count,
       coalesce(f.flag_count, 0)                as flag_count,
       (case
         when coalesce(f.flag_count, 0) >= 3 then 'flagged'
         when coalesce(f.flag_count, 0) >= 1 then 'warning'
         when count(r.*) >= 5 and avg(r.rating) >= 4.5 then 'trusted'
         else 'good'
       end)::profile_trust_status_enum as status
from users u
left join reviews r on r.subject_user_id = u.id
left join (
  select target_id, count(*) as flag_count
  from reports
  where target_type = 'user' and state in ('open','reviewing')
  group by target_id
) f on f.target_id = u.id
group by u.id, f.flag_count;

-- ════════════════════════════════════════════════════════════════════════════
-- auth.users -> public.users bootstrap (creates profile + privacy + wallet rows)
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  display_name text;
  base_handle  text;
  final_handle text;
  n int := 0;
begin
  display_name := coalesce(
    nullif(new.raw_user_meta_data->>'name', ''),
    nullif(new.raw_user_meta_data->>'display_name', ''),
    split_part(coalesce(new.email, 'friend'), '@', 1)
  );
  base_handle := regexp_replace(lower(split_part(coalesce(new.email, 'user'), '@', 1)), '[^a-z0-9_]', '', 'g');
  if base_handle = '' then base_handle := 'user'; end if;
  final_handle := base_handle;
  while exists (select 1 from public.users where handle = final_handle) loop
    n := n + 1;
    final_handle := base_handle || n::text;
  end loop;

  insert into public.users (id, handle, name, email)
  values (new.id, final_handle, display_name, new.email)
  on conflict (id) do nothing;

  insert into public.user_privacy_settings (user_id) values (new.id)
  on conflict (user_id) do nothing;

  insert into public.treat_wallets (user_id) values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ════════════════════════════════════════════════════════════════════════════
-- Indexes
-- ════════════════════════════════════════════════════════════════════════════
create index on posts (author_user_id, created_at desc) where deleted_at is null;
create index on posts (circle_id, created_at desc);
create index on comments (post_id, created_at);
create index on post_reactions (user_id);

create index on community_posts (community_id, created_at desc) where deleted_at is null;
create index on community_posts (trending_score desc);
create index on community_members (user_id);

create index on circle_messages (circle_id, created_at desc);
create index on messages (thread_id, created_at desc);
create index on thread_participants (user_id);

create index on adoption_listings (status, species) where deleted_at is null;
create index on adoption_requests (poster_user_id, status);
create index on adoption_requests (requester_user_id, status);
create index on adoption_records (adopter_user_id, status);
create index on adoption_records (next_update_due_at) where status in ('confirmed','update_due');
create index on rescue_cases (status, species) where deleted_at is null;

create index on treat_gifts (companion_id);
create index on treat_gifts (owner_id);
create index on notifications (recipient_id, read, created_at desc);
create index on reports (target_type, target_id);

-- full-text search (MVP search bars)
create index posts_fts on posts using gin (to_tsvector('simple', coalesce(text, '')));
create index adoption_listings_fts on adoption_listings
  using gin (to_tsvector('simple', name || ' ' || coalesce(breed,'') || ' ' || coalesce(location,'')));

-- ════════════════════════════════════════════════════════════════════════════
-- Row-Level Security
-- RLS is enabled on EVERY table (default-deny). Baseline identity policies are
-- added here so auth + profile work after Wave 0. Each later wave adds the
-- read/write policies for its own domain (see docs/backend/07 §7).
-- ════════════════════════════════════════════════════════════════════════════
alter table users                     enable row level security;
alter table user_privacy_settings     enable row level security;
alter table blocked_users             enable row level security;
alter table reviews                   enable row level security;
alter table media_assets              enable row level security;
alter table companions                enable row level security;
alter table companion_followers       enable row level security;
alter table circles                   enable row level security;
alter table circle_members            enable row level security;
alter table circle_join_requests      enable row level security;
alter table posts                     enable row level security;
alter table post_media                enable row level security;
alter table post_companions           enable row level security;
alter table post_alerts               enable row level security;
alter table post_reactions            enable row level security;
alter table post_saves                enable row level security;
alter table post_forwards             enable row level security;
alter table comments                  enable row level security;
alter table comment_reactions         enable row level security;
alter table circle_messages           enable row level security;
alter table circle_message_media      enable row level security;
alter table communities               enable row level security;
alter table community_members         enable row level security;
alter table community_join_requests   enable row level security;
alter table community_posts           enable row level security;
alter table community_post_companions enable row level security;
alter table community_post_helpful    enable row level security;
alter table community_comments        enable row level security;
alter table community_comment_helpful enable row level security;
alter table adoption_listings         enable row level security;
alter table adoption_listing_media    enable row level security;
alter table adoption_listing_saves    enable row level security;
alter table threads                   enable row level security;
alter table adoption_records          enable row level security;
alter table adoption_requests         enable row level security;
alter table adoption_updates          enable row level security;
alter table adoption_update_media     enable row level security;
alter table thread_participants       enable row level security;
alter table messages                  enable row level security;
alter table message_media             enable row level security;
alter table rescue_cases              enable row level security;
alter table rescue_updates            enable row level security;
alter table rescue_update_media       enable row level security;
alter table rescue_case_followers     enable row level security;
alter table treat_wallets             enable row level security;
alter table treat_gifts               enable row level security;
alter table saved_items               enable row level security;
alter table notifications             enable row level security;
alter table push_tokens               enable row level security;
alter table reports                   enable row level security;

-- Baseline identity policies (Wave 0) ─────────────────────────────────────────
-- Read any profile (privacy refinement comes in Wave 1); update only your own.
create policy users_select_all on users
  for select to authenticated using (true);
create policy users_update_self on users
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Own privacy settings only.
create policy ups_all_self on user_privacy_settings
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Own treat wallet only (read; mutations happen via RPC in Wave 6).
create policy wallet_select_self on treat_wallets
  for select to authenticated using (user_id = auth.uid());

-- Own blocks only.
create policy blocked_all_self on blocked_users
  for all to authenticated using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

-- NOTE: all other tables currently have RLS enabled with NO policies = deny-all.
-- Their per-domain policies are added in Waves 1–6. The service role (Edge
-- Functions / CLI) bypasses RLS for privileged operations and the bootstrap trigger.
