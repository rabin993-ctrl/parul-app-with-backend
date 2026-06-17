-- supabase/seed.sql — Parul demo data (Wave 7)
-- Dhaka/Bangladesh context, BDT currency (৳), no vet data (DEFERRED)
--
-- Load: npm run db:reset  OR  psql $DATABASE_URL < supabase/seed.sql
--
-- Strategy: inserting into auth.users fires the handle_new_user() trigger which
-- automatically creates public.users, user_privacy_settings, and treat_wallets rows.
-- We then DO UPDATE to fill in the profile fields the trigger cannot know.
-- Email local-parts match the desired handles so the trigger generates the right handle.

begin;

-- ════════════════════════════════════════════════════════════════════════════
-- Hardcoded UUIDs (all referenced inline below)
-- ════════════════════════════════════════════════════════════════════════════
-- Users
-- u1: rina_dhaka (Rina Akhter)         — Dhanmondi
-- u2: karim_petlover (Karim Hassan)    — Gulshan
-- u3: farhan_bd (Farhan Ahmed)         — Uttara
-- u4: tasnim_rescue (Tasnim Begum)     — Mirpur
-- u5: sohail_cats (Sohail Chowdhury)   — Banani

-- Companions
-- c1: Bruno (dog, karim)    c2: Luna (cat, rina)
-- c3: Pepper (dog, farhan)  c4: Mochi (cat, tasnim)
-- c5: Biscuit (dog, karim)  c6: Olive (cat, sohail)
-- c7: Rocky (dog, farhan)   c8: Coco (cat, sohail)

-- Posts (12)
-- Circles (2): open Dhaka Paws, request-only Rescue Network
-- Communities (2): general Dhaka Indie Lovers, rescue Foster Network Dhaka
-- Adoption listings (4): a1-a4
-- Threads / messages
-- Rescue cases: r1 active, r2 recovered
-- Notifications: n1-n7

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 1 — Auth users (trigger creates public.users + privacy + wallet)
-- ════════════════════════════════════════════════════════════════════════════
insert into auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
) values
  (
    'a1000001-0000-0000-0000-000000000001',
    'rina_dhaka@parul.app',
    crypt('password123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Rina Akhter"}'
  ),
  (
    'a1000001-0000-0000-0000-000000000002',
    'karim_petlover@parul.app',
    crypt('password123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Karim Hassan"}'
  ),
  (
    'a1000001-0000-0000-0000-000000000003',
    'farhan_bd@parul.app',
    crypt('password123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Farhan Ahmed"}'
  ),
  (
    'a1000001-0000-0000-0000-000000000004',
    'tasnim_rescue@parul.app',
    crypt('password123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Tasnim Begum"}'
  ),
  (
    'a1000001-0000-0000-0000-000000000005',
    'sohail_cats@parul.app',
    crypt('password123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Sohail Chowdhury"}'
  )
on conflict (id) do nothing;

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 2 — Enrich public.users (trigger created minimal rows; fill profile)
-- ════════════════════════════════════════════════════════════════════════════
insert into public.users (id, handle, name, email, tint, bio, location, website, verified)
values
  (
    'a1000001-0000-0000-0000-000000000001',
    'rina_dhaka',
    'Rina Akhter',
    'rina_dhaka@parul.app',
    '#F2972E',
    'Foster mum to seniors 🐾 · rescuing since 2020 · Dhanmondi Lake mornings.',
    'Dhanmondi, Dhaka',
    'pawscare.bd',
    true
  ),
  (
    'a1000001-0000-0000-0000-000000000002',
    'karim_petlover',
    'Karim Hassan',
    'karim_petlover@parul.app',
    '#14A697',
    'Rescue transport volunteer · indie dog dad · Gulshan park regular.',
    'Gulshan, Dhaka',
    null,
    true
  ),
  (
    'a1000001-0000-0000-0000-000000000003',
    'farhan_bd',
    'Farhan Ahmed',
    'farhan_bd@parul.app',
    '#E0503F',
    'Vet tech · adoption advocate · weekend foster.',
    'Uttara, Dhaka',
    null,
    true
  ),
  (
    'a1000001-0000-0000-0000-000000000004',
    'tasnim_rescue',
    'Tasnim Begum',
    'tasnim_rescue@parul.app',
    '#3B82C4',
    'Indie dog advocate · rescue volunteer · Mirpur Section 10.',
    'Mirpur, Dhaka',
    null,
    false
  ),
  (
    'a1000001-0000-0000-0000-000000000005',
    'sohail_cats',
    'Sohail Chowdhury',
    'sohail_cats@parul.app',
    '#7A5AE0',
    'Runs the weekend adoption stall · cat dad × 3 · Banani.',
    'Banani, Dhaka',
    null,
    true
  )
on conflict (id) do update set
  handle   = excluded.handle,
  name     = excluded.name,
  tint     = excluded.tint,
  bio      = excluded.bio,
  location = excluded.location,
  website  = excluded.website,
  verified = excluded.verified;

-- Demo user GPS coordinates for lost/found geo alert testing (Dhaka).
-- Required for fan_out_post_alert radius matching after db:reset.
UPDATE public.users SET
  location_lat = v.lat,
  location_lng = v.lng,
  location_updated_at = now()
FROM (VALUES
  ('a1000001-0000-0000-0000-000000000001'::uuid, 23.7461, 90.3742), -- Dhanmondi
  ('a1000001-0000-0000-0000-000000000002'::uuid, 23.7925, 90.4078), -- Gulshan
  ('a1000001-0000-0000-0000-000000000003'::uuid, 23.8103, 90.4125), -- Uttara
  ('a1000001-0000-0000-0000-000000000004'::uuid, 23.8223, 90.3654), -- Mirpur
  ('a1000001-0000-0000-0000-000000000005'::uuid, 23.8759, 90.3795)  -- Banani
) AS v(id, lat, lng)
WHERE public.users.id = v.id;

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 3 — Treat wallets (adjust balances; trigger created with remaining=100)
-- ════════════════════════════════════════════════════════════════════════════
insert into public.treat_wallets (user_id, remaining, allowance)
values
  ('a1000001-0000-0000-0000-000000000001', 175, 200),
  ('a1000001-0000-0000-0000-000000000002', 120, 200),
  ('a1000001-0000-0000-0000-000000000003', 200, 200),
  ('a1000001-0000-0000-0000-000000000004',  80, 200),
  ('a1000001-0000-0000-0000-000000000005',  50, 200)
on conflict (user_id) do update set
  remaining  = excluded.remaining,
  allowance  = excluded.allowance;

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 4 — Companions (8–10)
-- ════════════════════════════════════════════════════════════════════════════
insert into public.companions (
  id, owner_id, name, handle, species, breed, age, gender,
  icon, tint, traits, mood, about,
  vaccinated, neutered, microchipped, pawprints, verified
) values
  (
    'c0000001-0000-0000-0000-000000000001',
    'a1000001-0000-0000-0000-000000000002',
    'Bruno', 'bruno_gulshan', 'dog', 'Indie', '5 yrs', 'Male',
    'dog', '#14A697',
    array['Calm','Brave','Street-smart'],
    'Calm guardian, brave heart 🐾',
    'Street survivor, now living his best life in Gulshan.',
    true, true, true, 2400, true
  ),
  (
    'c0000001-0000-0000-0000-000000000002',
    'a1000001-0000-0000-0000-000000000001',
    'Luna', 'luna_dhanmondi', 'cat', 'Indie Shorthair', '2 yrs', 'Female',
    'cat', '#7A5AE0',
    array['Curious','Vocal','Sun-seeker'],
    'Sleepy but curious 🐾',
    'Queen of the windowsill. Will supervise all your work.',
    true, true, false, 4200, true
  ),
  (
    'c0000001-0000-0000-0000-000000000003',
    'a1000001-0000-0000-0000-000000000003',
    'Pepper', 'pepper_uttara', 'dog', 'Labrador mix', '8 wks', 'Female',
    'dog', '#E0503F',
    array['Tiny','Bouncy','Brave'],
    'Tiny tornado of joy 🐾',
    'Rescued from a storm drain during monsoon flooding. Dewormed and microchipped.',
    false, false, true, 480, false
  ),
  (
    'c0000001-0000-0000-0000-000000000004',
    'a1000001-0000-0000-0000-000000000004',
    'Mochi', 'mochi_mirpur', 'cat', 'Tabby mix', '6 mos', 'Male',
    'cat', '#3B82C4',
    array['Playful','Window-watcher','Purr machine'],
    'Quietly planning world domination 🐾',
    'Found as a solo kitten near Mirpur metro station. Neutered and fully vaccinated.',
    true, true, true, 1100, false
  ),
  (
    'c0000001-0000-0000-0000-000000000005',
    'a1000001-0000-0000-0000-000000000002',
    'Biscuit', 'biscuit_bd', 'dog', 'Indie', '2 yrs', 'Male',
    'dog', '#F2972E',
    array['Gentle','Street-smart','Loyal'],
    'Calm and steady, loves long walks 🐾',
    'Lived on a friendly Gulshan street corner before volunteers brought him in.',
    true, true, true, 1800, true
  ),
  (
    'c0000001-0000-0000-0000-000000000006',
    'a1000001-0000-0000-0000-000000000005',
    'Olive', 'olive_banani', 'cat', 'Tabby', '1 yr', 'Female',
    'cat', '#2FA46A',
    array['Slow-blinker','Gentle','Quiet'],
    'Communicates entirely through slow blinks 🐾',
    'Prefers quiet evenings and soft blankets. Currently in foster pending adoption.',
    true, true, true, 900, false
  ),
  (
    'c0000001-0000-0000-0000-000000000007',
    'a1000001-0000-0000-0000-000000000003',
    'Rocky', 'rocky_uttara', 'dog', 'Beagle', '4 yrs', 'Male',
    'dog', '#E2941A',
    array['Nosy','Loyal','Foodie'],
    'Always sniffing something new 🐾',
    'Follows his nose everywhere. Excellent boy with a good recall.',
    true, true, true, 3800, true
  ),
  (
    'c0000001-0000-0000-0000-000000000008',
    'a1000001-0000-0000-0000-000000000005',
    'Coco', 'coco_banani', 'cat', 'Persian mix', '1 yr', 'Female',
    'cat', '#D9489A',
    array['Shy','Cuddly','Fluffy'],
    'Quiet corners and warm laps 🐾',
    'Fluff in chief. Takes her time with new people but loves deeply.',
    true, false, false, 1100, false
  ),
  (
    'c0000001-0000-0000-0000-000000000009',
    'a1000001-0000-0000-0000-000000000001',
    'Max', 'max_dhanmondi', 'dog', 'Golden Retriever mix', '3 yrs', 'Male',
    'dog', '#F2972E',
    array['Gentle','Playful','Water-loving'],
    'Gentle and playful, loves the lake 🐾',
    'A soft soul who thinks he is a lap dog. Adores lake-side mornings at Dhanmondi.',
    true, true, true, 5800, true
  ),
  (
    'c0000001-0000-0000-0000-000000000010',
    'a1000001-0000-0000-0000-000000000004',
    'Noori', 'noori_mirpur', 'cat', 'Indie Shorthair', '3 yrs', 'Female',
    'cat', '#D9489A',
    array['Resilient','Sweet','Shy'],
    'Healing but hopeful 🐾',
    'Injured in a rickshaw accident near Mirpur DOHS. Recovering in foster care.',
    true, false, false, 320, false
  )
on conflict (id) do nothing;

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 5 — Circles (2)
-- ════════════════════════════════════════════════════════════════════════════
insert into public.circles (
  id, name, location, icon, tint, icon_bg, tagline, bio, tags, privacy, created_by
) values
  (
    'cc000001-0000-0000-0000-000000000001',
    'Dhaka Paws',
    'Dhaka, Bangladesh',
    'paw', '#F2972E', '#FDF4E4',
    'For Dhaka pet lovers',
    'A friendly open circle for dog and cat owners across Dhaka. Weekend walks, vet tips, fostering support.',
    array['dogs','cats','dhaka','rescues'],
    'open',
    'a1000001-0000-0000-0000-000000000001'
  ),
  (
    'cc000001-0000-0000-0000-000000000002',
    'Rescue Network Dhaka',
    'Dhaka, Bangladesh',
    'shield', '#E0503F', '#FFE8E8',
    'Coordinating emergency rescues',
    'Request-only circle for vetted rescue volunteers. Transport, foster coordination, vet funding.',
    array['rescue','emergency','transport','foster'],
    'request',
    'a1000001-0000-0000-0000-000000000003'
  )
on conflict (id) do nothing;

-- Circle members
insert into public.circle_members (circle_id, user_id, role) values
  ('cc000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000001', 'admin'),
  ('cc000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000002', 'member'),
  ('cc000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000004', 'member'),
  ('cc000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000005', 'member'),
  ('cc000001-0000-0000-0000-000000000002', 'a1000001-0000-0000-0000-000000000003', 'admin'),
  ('cc000001-0000-0000-0000-000000000002', 'a1000001-0000-0000-0000-000000000002', 'member'),
  ('cc000001-0000-0000-0000-000000000002', 'a1000001-0000-0000-0000-000000000004', 'member')
on conflict (circle_id, user_id) do nothing;

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 6 — Communities (2)
-- ════════════════════════════════════════════════════════════════════════════
insert into public.communities (
  id, name, about, icon, tint, created_by,
  join_policy, default_category, enabled_topics, guidelines
) values
  (
    'cd000001-0000-0000-0000-000000000001',
    'Dhaka Indie Lovers',
    'For the desi dogs and the people who adore them. Tips, rescues, adoption drives.',
    'dog', '#F2972E',
    'a1000001-0000-0000-0000-000000000001',
    'open', 'general',
    array['general','rescue','tips','events','lost-found']::community_category_enum[],
    array[
      'Be kind — we are all here for the animals.',
      'No buying, selling or breeding posts.',
      'Lost & Found posts need location and a clear photo.'
    ]
  ),
  (
    'cd000001-0000-0000-0000-000000000002',
    'Foster Network Dhaka',
    'Coordinating emergency fosters across Dhaka. Verified volunteers only.',
    'shield', '#E0503F',
    'a1000001-0000-0000-0000-000000000003',
    'request', 'rescue',
    array['rescue','general','tips']::community_category_enum[],
    array[
      'Rescue posts must include location and a contact number.',
      'Transport volunteers: update status in-thread.',
      'No unsolicited fundraising links.'
    ]
  )
on conflict (id) do nothing;

-- Community members
insert into public.community_members (community_id, user_id, role) values
  ('cd000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000001', 'admin'),
  ('cd000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000002', 'member'),
  ('cd000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000004', 'member'),
  ('cd000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000005', 'member'),
  ('cd000001-0000-0000-0000-000000000002', 'a1000001-0000-0000-0000-000000000003', 'admin'),
  ('cd000001-0000-0000-0000-000000000002', 'a1000001-0000-0000-0000-000000000002', 'member'),
  ('cd000001-0000-0000-0000-000000000002', 'a1000001-0000-0000-0000-000000000004', 'member')
on conflict (community_id, user_id) do nothing;

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 7 — Feed posts (12, mix of tags)
-- ════════════════════════════════════════════════════════════════════════════
insert into public.posts (
  id, author_user_id, companion_author_id, text, tag,
  label, is_circle, circle_id, location,
  adoption_status, created_at
) values
  -- paw-posting
  (
    'fa000001-0000-0000-0000-000000000001',
    'a1000001-0000-0000-0000-000000000001',
    'c0000001-0000-0000-0000-000000000009', -- Max posting
    'Park morning = best morning. Found a stick. Lost the stick. Found another stick. Life is good. 🐾',
    'paw-posting',
    null, false, null, 'Dhanmondi Lake, Dhaka',
    null, now() - interval '15 minutes'
  ),
  -- discussion in open circle
  (
    'fa000001-0000-0000-0000-000000000002',
    'a1000001-0000-0000-0000-000000000002',
    null,
    'Sunrise 5k with Bruno this morning. He found two squirrels and one very confused jogger near Gulshan Lake. 🐾',
    'discussion',
    null, true, 'cc000001-0000-0000-0000-000000000001', 'Gulshan Lake Park, Dhaka',
    null, now() - interval '1 hour'
  ),
  -- adoption post (open)
  (
    'fa000001-0000-0000-0000-000000000003',
    'a1000001-0000-0000-0000-000000000003',
    'c0000001-0000-0000-0000-000000000003', -- Pepper posting
    'Pepper is ready for her forever family. Vaccinated, dewormed, microchipped — she just needs love and a soft blanket. Serious adopters only, home check required. 💛',
    'adoption',
    'adoption', false, null, 'Uttara, Dhaka',
    'open', now() - interval '2 hours'
  ),
  -- discussion (circle-only)
  (
    'fa000001-0000-0000-0000-000000000004',
    'a1000001-0000-0000-0000-000000000001',
    null,
    'Circle-only: anyone free for a cat-sit next weekend? Luna needs her meds twice a day and trusts very few humans.',
    'discussion',
    null, true, 'cc000001-0000-0000-0000-000000000001', 'Dhanmondi, Dhaka',
    null, now() - interval '3 hours'
  ),
  -- lost-found (lost dog)
  (
    'fa000001-0000-0000-0000-000000000005',
    'a1000001-0000-0000-0000-000000000004',
    null,
    'LOST: Mochi slipped out of his harness near Mirpur Section 10 around 6pm. Tabby mix, blue collar, very food-motivated. Please call if seen — sharing widely helps.',
    'lost-found',
    'lost', false, null, 'Mirpur Section 10, Dhaka',
    null, now() - interval '5 hours'
  ),
  -- rescue post 1
  (
    'fa000001-0000-0000-0000-000000000006',
    'a1000001-0000-0000-0000-000000000001',
    null,
    'Case opened: injured dog found near Dhanmondi Lake. Possible hit-and-run. Being rushed to PawsCare clinic. Public updates will follow. 🙏',
    'rescue',
    'rescue', false, null, 'Dhanmondi Lake, Dhaka',
    null, now() - interval '2 days'
  ),
  -- rescue post 2
  (
    'fa000001-0000-0000-0000-000000000007',
    'a1000001-0000-0000-0000-000000000004',
    null,
    'Rescue case: abandoned puppy near Mirpur DOHS park. Needs foster tonight — can anyone help with transport?',
    'rescue',
    'rescue', false, null, 'Mirpur DOHS, Dhaka',
    null, now() - interval '6 hours'
  ),
  -- rescue post 3 (Noori surgery)
  (
    'fa000001-0000-0000-0000-000000000008',
    'a1000001-0000-0000-0000-000000000002',
    null,
    'Noori needs surgery after a rickshaw accident near Mirpur DOHS. Fundraising open and daily vet updates on her case page.',
    'rescue',
    'rescue', false, null, 'Mirpur, Dhaka',
    null, now() - interval '1 day'
  ),
  -- lost-found (found cat)
  (
    'fa000001-0000-0000-0000-000000000009',
    'a1000001-0000-0000-0000-000000000005',
    null,
    'Found a friendly tabby near the lake — no collar, seems well-fed. Keeping her safe until we find the owner. DM me.',
    'lost-found',
    'found', false, null, 'Banani Lake, Dhaka',
    null, now() - interval '2 hours'
  ),
  -- discussion (general tips)
  (
    'fa000001-0000-0000-0000-000000000010',
    'a1000001-0000-0000-0000-000000000001',
    null,
    'Tip for new fosters: keep meal times identical for the first week. Luna took three days to eat off-schedule — patience wins every time.',
    'discussion',
    null, false, null, 'Dhanmondi, Dhaka',
    null, now() - interval '3 days'
  ),
  -- adoption post (adopted/closed)
  (
    'fa000001-0000-0000-0000-000000000011',
    'a1000001-0000-0000-0000-000000000002',
    'c0000001-0000-0000-0000-000000000005', -- Biscuit
    'Biscuit recovered from a hit-and-run — gentle indie, kid-friendly. Looking for a patient adopter in Dhaka.',
    'adoption',
    'adoption', false, null, 'Gulshan, Dhaka',
    'adopted', now() - interval '1 month'
  ),
  -- paw-posting (companion)
  (
    'fa000001-0000-0000-0000-000000000012',
    'a1000001-0000-0000-0000-000000000003',
    'c0000001-0000-0000-0000-000000000007', -- Rocky
    'Grateful for everyone who shared Willow''s adoption post. Serious inquiries only — home visit this Saturday in Uttara. 🐾',
    'paw-posting',
    null, false, null, 'Uttara, Dhaka',
    null, now() - interval '1 week'
  )
on conflict (id) do nothing;

-- Lost/found alert metadata (include lat/lng so geo fan-out works on seed)
insert into public.post_alerts (post_id, kind, area, last_seen, phone, lat, lng, alert_radius_km) values
  (
    'fa000001-0000-0000-0000-000000000005',
    'lost',
    'Mirpur Section 10, Dhaka',
    'Today · 6:10 PM',
    '+880 1712 345 678',
    23.8223,
    90.3654,
    10
  ),
  (
    'fa000001-0000-0000-0000-000000000009',
    'found',
    'Banani Lake, Dhaka',
    null,
    '+880 1855 987 654',
    23.7949,
    90.4043,
    10
  )
on conflict (post_id) do update set
  lat = excluded.lat,
  lng = excluded.lng,
  alert_radius_km = excluded.alert_radius_km;

-- Tag some companions to posts
insert into public.post_companions (post_id, companion_id) values
  ('fa000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000009'),
  ('fa000001-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000003'),
  ('fa000001-0000-0000-0000-000000000011', 'c0000001-0000-0000-0000-000000000005'),
  ('fa000001-0000-0000-0000-000000000012', 'c0000001-0000-0000-0000-000000000007')
on conflict (post_id, companion_id) do nothing;

-- Post reactions (simulate engagement)
insert into public.post_reactions (post_id, user_id, kind) values
  ('fa000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000002', 'paw'),
  ('fa000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000005', 'paw'),
  ('fa000001-0000-0000-0000-000000000003', 'a1000001-0000-0000-0000-000000000001', 'paw'),
  ('fa000001-0000-0000-0000-000000000003', 'a1000001-0000-0000-0000-000000000004', 'paw'),
  ('fa000001-0000-0000-0000-000000000006', 'a1000001-0000-0000-0000-000000000002', 'paw'),
  ('fa000001-0000-0000-0000-000000000006', 'a1000001-0000-0000-0000-000000000003', 'paw'),
  ('fa000001-0000-0000-0000-000000000007', 'a1000001-0000-0000-0000-000000000001', 'paw'),
  ('fa000001-0000-0000-0000-000000000008', 'a1000001-0000-0000-0000-000000000001', 'paw')
on conflict (post_id, user_id, kind) do nothing;

-- Post comments
insert into public.comments (id, post_id, author_user_id, text) values
  (
    'cd000001-0001-0000-0000-000000000001',
    'fa000001-0000-0000-0000-000000000001',
    'a1000001-0000-0000-0000-000000000002',
    'Bruno approves the stick strategy 😂'
  ),
  (
    'cd000001-0001-0000-0000-000000000002',
    'fa000001-0000-0000-0000-000000000001',
    'a1000001-0000-0000-0000-000000000004',
    'Max has the right priorities!'
  ),
  (
    'cd000001-0001-0000-0000-000000000003',
    'fa000001-0000-0000-0000-000000000003',
    'a1000001-0000-0000-0000-000000000004',
    'Sharing with our foster network right now. Such a sweetheart.'
  )
on conflict (id) do nothing;

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 8 — Community posts (2 per community = 4 total)
-- ════════════════════════════════════════════════════════════════════════════
insert into public.community_posts (
  id, community_id, author_user_id, title, body, category, composer_label,
  trending_score, approved, created_at
) values
  (
    'cf000001-0000-0000-0000-000000000001',
    'cd000001-0000-0000-0000-000000000001',
    'a1000001-0000-0000-0000-000000000004',
    'Best indie-friendly vets in Dhanmondi?',
    'Looking for a calm clinic for my nervous rescue Mochi. Bonus if they do house calls for seniors. Anyone tried PawsCare on Satmasjid Road?',
    'health',
    null,
    88, true, now() - interval '2 hours'
  ),
  (
    'cf000001-0000-0000-0000-000000000002',
    'cd000001-0000-0000-0000-000000000001',
    'a1000001-0000-0000-0000-000000000002',
    'Morning walk group — Sat 7am Dhanmondi Lake path',
    'Weekly social walk for friendly dogs. Leashes required, treats optional. Newcomers very welcome!',
    'events',
    null,
    65, true, now() - interval '8 hours'
  ),
  (
    'cf000001-0000-0000-0000-000000000003',
    'cd000001-0000-0000-0000-000000000002',
    'a1000001-0000-0000-0000-000000000003',
    'Pepper found her forever home 🐾',
    'After 3 months of fostering through the Parul network, Pepper was adopted yesterday. Sharing in case anyone remembers the storm-drain rescue story from Uttara.',
    'general',
    'discussion',
    210, true, now() - interval '6 hours'
  ),
  (
    'cf000001-0000-0000-0000-000000000004',
    'cd000001-0000-0000-0000-000000000002',
    'a1000001-0000-0000-0000-000000000004',
    'Street pup with limp — need transport volunteer',
    'Spotted near Mirpur Section 10 around 5pm. Limping badly, possible fracture. Can cover vet costs at PawsCare but need someone with a car this evening.',
    'rescue',
    'rescue',
    145, true, now() - interval '1 day'
  )
on conflict (id) do nothing;

-- Community post companions
insert into public.community_post_companions (post_id, companion_id) values
  ('cf000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000004'),
  ('cf000001-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000003')
on conflict (post_id, companion_id) do nothing;

-- Community comments
insert into public.community_comments (id, post_id, author_user_id, text) values
  (
    'cc000001-0001-0000-0000-000000000001',
    'cf000001-0000-0000-0000-000000000001',
    'a1000001-0000-0000-0000-000000000003',
    'PawsCare on Satmasjid Rd — they specialize in anxious dogs and indie cats. Dr. Chowdhury is excellent.'
  ),
  (
    'cc000001-0001-0000-0000-000000000002',
    'cf000001-0000-0000-0000-000000000003',
    'a1000001-0000-0000-0000-000000000002',
    'So happy for Pepper! You are a star foster, Farhan bhai.'
  ),
  (
    'cc000001-0001-0000-0000-000000000003',
    'cf000001-0000-0000-0000-000000000004',
    'a1000001-0000-0000-0000-000000000001',
    'I can help after 6pm — will DM you now.'
  )
on conflict (id) do nothing;

-- Helpful marks
insert into public.community_post_helpful (post_id, user_id) values
  ('cf000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000002'),
  ('cf000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000003'),
  ('cf000001-0000-0000-0000-000000000003', 'a1000001-0000-0000-0000-000000000001'),
  ('cf000001-0000-0000-0000-000000000004', 'a1000001-0000-0000-0000-000000000002')
on conflict (post_id, user_id) do nothing;

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 9 — Adoption listings (4: 2 Available, 1 Urgent, 1 Adopted)
-- ════════════════════════════════════════════════════════════════════════════
insert into public.adoption_listings (
  id, poster_user_id, name, species, breed, age, age_group, gender,
  location, icon, tint, vaccination, neutered, microchipped,
  health_notes, personality, story, requirements,
  urgent, status, posted_at, adopted_date, adopted_note
) values
  -- Available
  (
    'ba000001-0000-0000-0000-000000000001',
    'a1000001-0000-0000-0000-000000000004',
    'Mochi', 'cat', 'Tabby mix', '6 months', 'puppy-kitten', 'Male',
    'Mirpur, Dhaka',
    'cat', '#3B82C4', 'Done', true, true,
    'Fully vaccinated · neutered · microchipped · regular vet checks done.',
    'Playful purr machine who loves window sunbeams and laser pointers.',
    'Found as a solo kitten near Mirpur metro. Hand-raised by our foster team for three months.',
    array['Indoor-only preferred','Another playful cat is a plus','No dogs in home'],
    false, 'Available', now() - interval '5 days', null, null
  ),
  -- Available
  (
    'ba000001-0000-0000-0000-000000000002',
    'a1000001-0000-0000-0000-000000000005',
    'Olive', 'cat', 'Tabby', '1 year', 'young', 'Female',
    'Banani, Dhaka',
    'cat', '#2FA46A', 'Done', true, true,
    'Fully vaccinated · spayed · annual check-up current.',
    'Communicates entirely through slow blinks. Best friend material.',
    'Olive prefers quiet evenings and soft blankets. Currently in a foster home pending adoption.',
    array['Calm household','No young children','Litter box in quiet corner'],
    false, 'Available', now() - interval '4 days', null, null
  ),
  -- Urgent
  (
    'ba000001-0000-0000-0000-000000000003',
    'a1000001-0000-0000-0000-000000000003',
    'Pepper', 'dog', 'Labrador mix', '8 weeks', 'puppy-kitten', 'Female',
    'Uttara, Dhaka',
    'dog', '#E0503F', 'Partial', false, true,
    'Partial vaccines in progress · dewormed · microchipped.',
    'Tiny storm-drain survivor with a brave heart. Learns fast and loves cuddles.',
    'Pepper was rescued during monsoon flooding near Uttara Sector 7. She is dewormed, microchipped, and learning to trust humans very quickly.',
    array['Puppy-experienced home','Adoption fee covers first vaccines','No stairs-only apartments'],
    true, 'Urgent', now() - interval '2 days', null, null
  ),
  -- Adopted
  (
    'ba000001-0000-0000-0000-000000000004',
    'a1000001-0000-0000-0000-000000000002',
    'Biscuit', 'dog', 'Indie', '2 years', 'young', 'Male',
    'Gulshan, Dhaka',
    'dog', '#F2972E', 'Done', true, true,
    'Fully vaccinated · neutered · healthy weight maintained.',
    'Gentle indie soul — walks and cuddles in equal measure.',
    'Biscuit lived on a friendly Gulshan street corner before volunteers brought him in. Great with adults and teens.',
    array['Daily walks','Secure balcony or yard'],
    false, 'Adopted', now() - interval '1 month',
    now() - interval '2 weeks',
    'Successfully adopted by the Hossain family in Bashundhara'
  )
on conflict (id) do nothing;

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 10 — Adoption requests, thread, record
-- ════════════════════════════════════════════════════════════════════════════

-- Thread for the confirmed adoption (Biscuit)
insert into public.threads (id, type, adoption_listing_id, adoption_record_id, created_at) values
  (
    'da000001-0000-0000-0000-000000000001',
    'adoption',
    'ba000001-0000-0000-0000-000000000004',
    null, -- will update below after record inserted
    now() - interval '3 weeks'
  ),
  -- DM thread between rina and karim
  (
    'da000001-0000-0000-0000-000000000002',
    'dm',
    null, null,
    now() - interval '1 day'
  )
on conflict (id) do nothing;

-- Thread participants
insert into public.thread_participants (thread_id, user_id) values
  ('da000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000002'),
  ('da000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000001'),
  ('da000001-0000-0000-0000-000000000002', 'a1000001-0000-0000-0000-000000000001'),
  ('da000001-0000-0000-0000-000000000002', 'a1000001-0000-0000-0000-000000000002')
on conflict (thread_id, user_id) do nothing;

-- DM messages (3)
insert into public.messages (id, thread_id, kind, sender_user_id, text, created_at) values
  (
    'db000001-0000-0000-0000-000000000001',
    'da000001-0000-0000-0000-000000000002',
    'text',
    'a1000001-0000-0000-0000-000000000001',
    'Karim bhai, can Bruno join the Dhanmondi Lake walk on Saturday? Max would love the company 🐾',
    now() - interval '23 hours'
  ),
  (
    'db000001-0000-0000-0000-000000000002',
    'da000001-0000-0000-0000-000000000002',
    'text',
    'a1000001-0000-0000-0000-000000000002',
    'Of course! Bruno has been restless all week. What time are you starting?',
    now() - interval '22 hours'
  ),
  (
    'db000001-0000-0000-0000-000000000003',
    'da000001-0000-0000-0000-000000000002',
    'text',
    'a1000001-0000-0000-0000-000000000001',
    '7am at the south gate. Bring treats — Max is very food-motivated 😄',
    now() - interval '21 hours'
  )
on conflict (id) do nothing;

-- Adoption requests
insert into public.adoption_requests (
  id, listing_id, poster_user_id, requester_user_id,
  message, status, thread_id, submitted_at
) values
  -- Pending request for Pepper
  (
    'ea000001-0000-0000-0000-000000000001',
    'ba000001-0000-0000-0000-000000000003',
    'a1000001-0000-0000-0000-000000000003',
    'a1000001-0000-0000-0000-000000000001',
    'I have a puppy-proof home in Dhanmondi and experience with young rescues. Pepper would be in safe hands. আমি সত্যিই তাকে ভালোবাসতে পারব।',
    'submitted', null,
    now() - interval '1 day'
  ),
  -- Approved request for Mochi
  (
    'ea000001-0000-0000-0000-000000000002',
    'ba000001-0000-0000-0000-000000000001',
    'a1000001-0000-0000-0000-000000000004',
    'a1000001-0000-0000-0000-000000000005',
    'I have a quiet Banani apartment with no dogs. Coco and Olive already live here — Mochi would fit right in.',
    'approved', null,
    now() - interval '2 days'
  )
on conflict (listing_id, requester_user_id) do nothing;

-- Confirmed adoption record (Biscuit → Rina)
insert into public.adoption_records (
  id, listing_id, chat_thread_id, poster_user_id, adopter_user_id,
  pet_name, species, icon, tint, new_home,
  status, confirmed_at, completed_milestones,
  poster_endorsed, poster_recommendation, created_at
) values
  (
    'eb000001-0000-0000-0000-000000000001',
    'ba000001-0000-0000-0000-000000000004',
    'da000001-0000-0000-0000-000000000001',
    'a1000001-0000-0000-0000-000000000002',
    'a1000001-0000-0000-0000-000000000001',
    'Biscuit', 'dog', 'dog', '#F2972E',
    'Dhanmondi, Dhaka',
    'confirmed', now() - interval '2 weeks',
    array['week_1']::milestone_enum[],
    true, 'recommended',
    now() - interval '3 weeks'
  )
on conflict (id) do nothing;

-- Back-fill adoption_record_id on the adoption thread
update public.threads
set adoption_record_id = 'eb000001-0000-0000-0000-000000000001'
where id = 'da000001-0000-0000-0000-000000000001'
  and adoption_record_id is null;

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 11 — Rescue cases (2: active + recovered)
-- ════════════════════════════════════════════════════════════════════════════
insert into public.rescue_cases (
  id, poster_user_id, case_code, name, species, icon, tint,
  status, location, headline, story, tags, post_id
) values
  (
    'fb000001-0000-0000-0000-000000000001',
    'a1000001-0000-0000-0000-000000000001',
    'RC-2026-001',
    'Lake Dog', 'dog', 'dog', '#E2941A',
    'active',
    'Dhanmondi Lake, Dhaka',
    'Injured indie found near Dhanmondi Lake — possible hit-and-run',
    'Spotted by a morning walker at 6am. Left hind leg injury, alert but in pain. Currently under observation at PawsCare Satmasjid. Transport covered by Rescue Network Dhaka.',
    array['hit-and-run','dhanmondi','treatment-needed'],
    'fa000001-0000-0000-0000-000000000006'
  ),
  (
    'fb000001-0000-0000-0000-000000000002',
    'a1000001-0000-0000-0000-000000000004',
    'RC-2026-002',
    'Noori', 'cat', 'cat', '#D9489A',
    'recovered',
    'Mirpur, Dhaka',
    'Noori survived surgery after rickshaw accident — now in foster care',
    'Noori was struck by a rickshaw near Mirpur DOHS. Emergency surgery was required for a fractured pelvis. After three weeks of in-clinic care and two weeks of foster recovery, she is healing beautifully. Adoption inquiry is open.',
    array['surgery-needed','mirpur','recovered','looking-for-foster'],
    'fa000001-0000-0000-0000-000000000008'
  )
on conflict (id) do nothing;

-- Rescue updates
insert into public.rescue_updates (id, case_id, text, photo_count, created_at) values
  (
    'fc000001-0000-0000-0000-000000000001',
    'fb000001-0000-0000-0000-000000000001',
    'X-ray shows hairline fracture on left hind femur. Surgery scheduled for tomorrow morning at PawsCare. Vet is optimistic.',
    1, now() - interval '1 day'
  ),
  (
    'fc000001-0000-0000-0000-000000000002',
    'fb000001-0000-0000-0000-000000000002',
    'Noori ate on her own today for the first time since the accident! Small steps — she is a fighter. 🐾',
    1, now() - interval '5 days'
  )
on conflict (id) do nothing;

-- Rescue followers
insert into public.rescue_case_followers (case_id, user_id) values
  ('fb000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000002'),
  ('fb000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000003'),
  ('fb000001-0000-0000-0000-000000000002', 'a1000001-0000-0000-0000-000000000001'),
  ('fb000001-0000-0000-0000-000000000002', 'a1000001-0000-0000-0000-000000000005')
on conflict (case_id, user_id) do nothing;

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 12 — Treat gifts (2–3)
-- ════════════════════════════════════════════════════════════════════════════
insert into public.treat_gifts (id, from_user_id, companion_id, owner_id, amount) values
  (
    'bd000001-0000-0000-0000-000000000001',
    'a1000001-0000-0000-0000-000000000001',
    'c0000001-0000-0000-0000-000000000001', -- Bruno
    'a1000001-0000-0000-0000-000000000002',
    10
  ),
  (
    'bd000001-0000-0000-0000-000000000002',
    'a1000001-0000-0000-0000-000000000002',
    'c0000001-0000-0000-0000-000000000002', -- Luna
    'a1000001-0000-0000-0000-000000000001',
    15
  ),
  (
    'bd000001-0000-0000-0000-000000000003',
    'a1000001-0000-0000-0000-000000000005',
    'c0000001-0000-0000-0000-000000000009', -- Max
    'a1000001-0000-0000-0000-000000000001',
    5
  )
on conflict (id) do nothing;

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 13 — Notifications (7, mix of types)
-- ════════════════════════════════════════════════════════════════════════════
insert into public.notifications (
  id, recipient_id, type, title, body,
  actor_user_id, entity_type, entity_id, read, created_at
) values
  -- rescue alert (unread)
  (
    'be000001-0000-0000-0000-000000000001',
    'a1000001-0000-0000-0000-000000000001',
    'rescue_alert',
    'Rescue alert near you',
    'A street dog has been spotted injured near Dhanmondi Lake — case opened by Rina.',
    'a1000001-0000-0000-0000-000000000002',
    'post', 'fa000001-0000-0000-0000-000000000006',
    false, now() - interval '8 minutes'
  ),
  -- reaction (unread)
  (
    'be000001-0000-0000-0000-000000000002',
    'a1000001-0000-0000-0000-000000000001',
    'reaction',
    'Karim liked your post',
    'Karim Hassan liked your post: "Park morning = best morning..."',
    'a1000001-0000-0000-0000-000000000002',
    'post', 'fa000001-0000-0000-0000-000000000001',
    false, now() - interval '22 minutes'
  ),
  -- circle join request (unread)
  (
    'be000001-0000-0000-0000-000000000003',
    'a1000001-0000-0000-0000-000000000001',
    'circle_request',
    'New circle request',
    'Tasnim Begum wants to join your Dhaka Paws circle.',
    'a1000001-0000-0000-0000-000000000004',
    'circle_join_request', 'cc000001-0000-0000-0000-000000000001',
    false, now() - interval '1 hour'
  ),
  -- comment (read)
  (
    'be000001-0000-0000-0000-000000000004',
    'a1000001-0000-0000-0000-000000000001',
    'comment',
    'Sohail commented on your post',
    '"Bruno approves the stick strategy 😂" — on your post',
    'a1000001-0000-0000-0000-000000000005',
    'post', 'fa000001-0000-0000-0000-000000000001',
    true, now() - interval '3 hours'
  ),
  -- adoption request (read)
  (
    'be000001-0000-0000-0000-000000000005',
    'a1000001-0000-0000-0000-000000000003',
    'adoption_request',
    'New adoption request for Pepper',
    'Rina Akhter has requested to adopt Pepper. Review and respond.',
    'a1000001-0000-0000-0000-000000000001',
    'adoption_listing', 'ba000001-0000-0000-0000-000000000003',
    true, now() - interval '5 hours'
  ),
  -- community invite (read)
  (
    'be000001-0000-0000-0000-000000000006',
    'a1000001-0000-0000-0000-000000000001',
    'community_invite',
    'Invited to Foster Network Dhaka',
    'Farhan Ahmed invited you to join Foster Network Dhaka community.',
    'a1000001-0000-0000-0000-000000000003',
    'community', 'cd000001-0000-0000-0000-000000000002',
    true, now() - interval '1 day'
  ),
  -- adoption confirmed (read)
  (
    'be000001-0000-0000-0000-000000000007',
    'a1000001-0000-0000-0000-000000000001',
    'adoption_confirmed',
    'Adoption confirmed 🎉',
    'Your adoption of Biscuit has been confirmed! Welcome to the family.',
    'a1000001-0000-0000-0000-000000000002',
    'adoption_record', 'eb000001-0000-0000-0000-000000000001',
    true, now() - interval '2 weeks'
  )
on conflict (id) do nothing;

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 14 — Companion follower (cross-user follows)
-- ════════════════════════════════════════════════════════════════════════════
insert into public.companion_followers (companion_id, user_id) values
  ('c0000001-0000-0000-0000-000000000009', 'a1000001-0000-0000-0000-000000000002'), -- karim follows Max
  ('c0000001-0000-0000-0000-000000000009', 'a1000001-0000-0000-0000-000000000005'), -- sohail follows Max
  ('c0000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000001'), -- rina follows Bruno
  ('c0000001-0000-0000-0000-000000000003', 'a1000001-0000-0000-0000-000000000004'), -- tasnim follows Pepper
  ('c0000001-0000-0000-0000-000000000002', 'a1000001-0000-0000-0000-000000000002')  -- karim follows Luna
on conflict (companion_id, user_id) do nothing;

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 15 — Circle chat messages
-- ════════════════════════════════════════════════════════════════════════════
insert into public.circle_messages (id, circle_id, type, sender_user_id, text) values
  (
    'bf000001-0000-0000-0000-000000000001',
    'cc000001-0000-0000-0000-000000000001',
    'text',
    'a1000001-0000-0000-0000-000000000001',
    'Good morning Dhaka Paws! Saturday walk is confirmed — south gate of Dhanmondi Lake, 7am. 🐾'
  ),
  (
    'bf000001-0000-0000-0000-000000000002',
    'cc000001-0000-0000-0000-000000000001',
    'text',
    'a1000001-0000-0000-0000-000000000002',
    'Bruno and I will be there! Bringing his favourite treats.'
  ),
  (
    'bf000001-0000-0000-0000-000000000003',
    'cc000001-0000-0000-0000-000000000002',
    'text',
    'a1000001-0000-0000-0000-000000000003',
    'Transport needed for RC-2026-001 pickup from Dhanmondi. Who has a car available tonight?'
  )
on conflict (id) do nothing;

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 16 — Reviews (poster rates adopter)
-- ════════════════════════════════════════════════════════════════════════════
insert into public.reviews (id, subject_user_id, author_user_id, rating, body) values
  (
    'ce000001-0000-0000-0000-000000000001',
    'a1000001-0000-0000-0000-000000000001', -- subject: Rina (adopter)
    'a1000001-0000-0000-0000-000000000002', -- author: Karim (poster)
    5,
    'Rina gave Biscuit the most loving home. Daily updates, spotless home check, endless patience. A gold-standard adopter.'
  )
on conflict (subject_user_id, author_user_id) do nothing;

commit;
