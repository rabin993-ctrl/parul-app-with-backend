-- Temporary beta tester feedback (remove after beta ends).

create table public.beta_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  areas_used text[] not null check (
    cardinality(areas_used) > 0
    and areas_used <@ array['feed', 'adoption', 'circles', 'communities', 'profile', 'rescue']::text[]
  ),
  issues text not null check (char_length(trim(issues)) >= 3),
  fix_first text not null check (char_length(trim(fix_first)) >= 3),
  recommend text not null check (recommend in ('yes', 'maybe', 'no')),
  extra_notes text,
  app_platform text,
  created_at timestamptz not null default now()
);

create index beta_feedback_created_at_idx on public.beta_feedback (created_at desc);
create index beta_feedback_user_id_idx on public.beta_feedback (user_id);

alter table public.beta_feedback enable row level security;

create policy "beta_feedback_insert_own"
  on public.beta_feedback for insert to authenticated
  with check (user_id = auth.uid());

create policy "beta_feedback_select_own"
  on public.beta_feedback for select to authenticated
  using (user_id = auth.uid());
