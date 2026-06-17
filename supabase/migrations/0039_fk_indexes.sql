-- 0039_fk_indexes.sql — add covering indexes for unindexed foreign keys.
--
-- Supabase's "unindexed foreign keys" advisor: a foreign key whose columns have no
-- covering index forces a sequential scan on the child table whenever the parent row
-- is deleted/updated (ON DELETE CASCADE / SET NULL) and slows joins/filters on that
-- column. Below is every FK in `public` that lacked a leading-column index, generated
-- from pg_constraint. All are single-column FKs. Idempotent (IF NOT EXISTS).

create index if not exists idx_adoption_listing_media_media_id on public.adoption_listing_media (media_id);
create index if not exists idx_adoption_listing_saves_user_id on public.adoption_listing_saves (user_id);
create index if not exists idx_adoption_listings_poster_user_id on public.adoption_listings (poster_user_id);
create index if not exists idx_adoption_records_chat_thread_id on public.adoption_records (chat_thread_id);
create index if not exists idx_adoption_records_listing_id on public.adoption_records (listing_id);
create index if not exists idx_adoption_records_poster_user_id on public.adoption_records (poster_user_id);
create index if not exists idx_adoption_requests_thread_id on public.adoption_requests (thread_id);
create index if not exists idx_adoption_update_media_media_id on public.adoption_update_media (media_id);
create index if not exists idx_adoption_updates_author_user_id on public.adoption_updates (author_user_id);
create index if not exists idx_adoption_updates_record_id on public.adoption_updates (record_id);
create index if not exists idx_blocked_users_blocked_id on public.blocked_users (blocked_id);
create index if not exists idx_circle_join_requests_user_id on public.circle_join_requests (user_id);
create index if not exists idx_circle_members_user_id on public.circle_members (user_id);
create index if not exists idx_circle_message_media_circle_id on public.circle_message_media (circle_id);
create index if not exists idx_circle_message_media_media_id on public.circle_message_media (media_id);
create index if not exists idx_circle_message_media_message_id on public.circle_message_media (message_id);
create index if not exists idx_circle_messages_sender_user_id on public.circle_messages (sender_user_id);
create index if not exists idx_circle_messages_shared_post_id on public.circle_messages (shared_post_id);
create index if not exists idx_circles_created_by on public.circles (created_by);
create index if not exists idx_comment_reactions_user_id on public.comment_reactions (user_id);
create index if not exists idx_comments_author_user_id on public.comments (author_user_id);
create index if not exists idx_comments_parent_id on public.comments (parent_id);
create index if not exists idx_communities_cover_media_id on public.communities (cover_media_id);
create index if not exists idx_communities_created_by on public.communities (created_by);
create index if not exists idx_community_comment_helpful_user_id on public.community_comment_helpful (user_id);
create index if not exists idx_community_comments_author_user_id on public.community_comments (author_user_id);
create index if not exists idx_community_comments_parent_id on public.community_comments (parent_id);
create index if not exists idx_community_comments_post_id on public.community_comments (post_id);
create index if not exists idx_community_events_created_by on public.community_events (created_by);
create index if not exists idx_community_join_requests_user_id on public.community_join_requests (user_id);
create index if not exists idx_community_post_companions_companion_id on public.community_post_companions (companion_id);
create index if not exists idx_community_post_helpful_user_id on public.community_post_helpful (user_id);
create index if not exists idx_community_post_saves_user_id on public.community_post_saves (user_id);
create index if not exists idx_community_posts_author_user_id on public.community_posts (author_user_id);
create index if not exists idx_community_posts_image_media_id on public.community_posts (image_media_id);
create index if not exists idx_companion_followers_user_id on public.companion_followers (user_id);
create index if not exists idx_companions_avatar_media_id on public.companions (avatar_media_id);
create index if not exists idx_companions_owner_id on public.companions (owner_id);
create index if not exists idx_media_assets_owner_id on public.media_assets (owner_id);
create index if not exists idx_message_media_media_id on public.message_media (media_id);
create index if not exists idx_messages_post_id on public.messages (post_id);
create index if not exists idx_messages_record_id on public.messages (record_id);
create index if not exists idx_messages_sender_user_id on public.messages (sender_user_id);
create index if not exists idx_notifications_actor_user_id on public.notifications (actor_user_id);
create index if not exists idx_post_alert_deliveries_user_id on public.post_alert_deliveries (user_id);
create index if not exists idx_post_companions_companion_id on public.post_companions (companion_id);
create index if not exists idx_post_forwards_post_id on public.post_forwards (post_id);
create index if not exists idx_post_forwards_user_id on public.post_forwards (user_id);
create index if not exists idx_post_media_media_id on public.post_media (media_id);
create index if not exists idx_post_saves_user_id on public.post_saves (user_id);
create index if not exists idx_posts_companion_author_id on public.posts (companion_author_id);
create index if not exists idx_reports_reporter_user_id on public.reports (reporter_user_id);
create index if not exists idx_rescue_case_followers_user_id on public.rescue_case_followers (user_id);
create index if not exists idx_rescue_cases_post_id on public.rescue_cases (post_id);
create index if not exists idx_rescue_cases_poster_user_id on public.rescue_cases (poster_user_id);
create index if not exists idx_rescue_help_offers_helper_user_id on public.rescue_help_offers (helper_user_id);
create index if not exists idx_rescue_help_offers_reviewed_by_user_id on public.rescue_help_offers (reviewed_by_user_id);
create index if not exists idx_rescue_update_media_media_id on public.rescue_update_media (media_id);
create index if not exists idx_rescue_updates_case_id on public.rescue_updates (case_id);
create index if not exists idx_reviews_author_user_id on public.reviews (author_user_id);
create index if not exists idx_threads_adoption_listing_id on public.threads (adoption_listing_id);
create index if not exists idx_threads_adoption_record_id on public.threads (adoption_record_id);
create index if not exists idx_treat_gifts_from_user_id on public.treat_gifts (from_user_id);
create index if not exists idx_users_avatar_media_id on public.users (avatar_media_id);
