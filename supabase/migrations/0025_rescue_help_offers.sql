-- rescue_help_offers: tracks offers of help from community members for rescue cases

create table if not exists rescue_help_offers (
  id                   uuid        primary key default gen_random_uuid(),
  case_id              uuid        not null references rescue_cases(id) on delete cascade,
  helper_user_id       uuid        not null references users(id) on delete cascade,
  type                 text        not null check (type in ('foster','transport','vet','supplies','search','other')),
  message              text,
  status               text        not null default 'offered'
                                   check (status in ('offered','viewed','accepted','declined','withdrawn')),
  reviewed_by_user_id  uuid        references users(id) on delete set null,
  reviewed_at          timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- one active offer per helper per case (can re-offer after decline/withdraw)
create unique index rescue_help_offers_active_idx
  on rescue_help_offers(case_id, helper_user_id)
  where status not in ('declined', 'withdrawn');

alter table rescue_help_offers enable row level security;

-- helpers see their own offers; case owners see all offers on their cases
create policy "rescue_help_offers_select" on rescue_help_offers
  for select using (
    helper_user_id = auth.uid()
    or exists (
      select 1 from rescue_cases rc
      where rc.id = rescue_help_offers.case_id
        and rc.poster_user_id = auth.uid()
        and rc.deleted_at is null
    )
  );

create policy "rescue_help_offers_insert" on rescue_help_offers
  for insert with check (helper_user_id = auth.uid());

-- helper can withdraw; case owner can accept/decline/mark viewed
create policy "rescue_help_offers_update" on rescue_help_offers
  for update using (
    helper_user_id = auth.uid()
    or exists (
      select 1 from rescue_cases rc
      where rc.id = rescue_help_offers.case_id
        and rc.poster_user_id = auth.uid()
        and rc.deleted_at is null
    )
  );
