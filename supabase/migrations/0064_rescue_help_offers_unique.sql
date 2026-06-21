-- Replace partial unique index with a full unique constraint so PostgREST upsert
-- on (case_id, helper_user_id) works. One row per helper per case; re-offer updates
-- the same row back to status = 'offered'.

-- Keep the newest row per (case_id, helper_user_id) before adding the constraint.
delete from rescue_help_offers a
using rescue_help_offers b
where a.case_id = b.case_id
  and a.helper_user_id = b.helper_user_id
  and a.created_at < b.created_at;

drop index if exists rescue_help_offers_active_idx;

alter table rescue_help_offers
  add constraint rescue_help_offers_case_helper_unique unique (case_id, helper_user_id);
