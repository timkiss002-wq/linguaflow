-- LinguaFlow — initial schema
-- Target: Supabase (Postgres 15+). See docs/ARCHITECTURE.md §3.

create extension if not exists pgcrypto;

-- ─────────────────────────────── Types ───────────────────────────────
create type public.language_code   as enum ('en', 'zh');
create type public.cefr_level      as enum ('beginner', 'elementary', 'intermediate', 'upper_intermediate', 'advanced');
create type public.video_source    as enum ('youtube', 'upload', 'external_url');
create type public.transcript_format as enum ('manual', 'srt', 'vtt');
create type public.vocab_status    as enum ('new', 'learning', 'reviewing', 'mastered');
create type public.review_rating   as enum ('again', 'hard', 'good', 'easy');
create type public.progress_status as enum ('in_progress', 'completed');
create type public.user_role       as enum ('learner', 'admin');
create type public.session_kind    as enum ('dictation', 'review');

-- ─────────────────────────────── Helpers ─────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ─────────────────────────────── Profiles ────────────────────────────
create table public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  display_name       text not null check (char_length(display_name) between 1 and 50),
  avatar_url         text,
  role               public.user_role not null default 'learner',
  timezone           text not null default 'Asia/Ho_Chi_Minh',
  daily_goal_minutes int  not null default 15 check (daily_goal_minutes between 5 and 240),
  -- { "playbackRate": 1, "ignorePunctuation": true, "showPinyin": true, "autoNext": false }
  settings           jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object'),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Defined after profiles because it reads from it.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Create a profile automatically on sign-up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
                  split_part(new.email, '@', 1), 'Learner'), 50)
  );
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────── Content ─────────────────────────────
create table public.topics (
  id   smallint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null
);

create table public.videos (
  id               uuid primary key default gen_random_uuid(),
  title            text not null check (char_length(title) between 1 and 200),
  description      text check (char_length(description) <= 2000),
  language         public.language_code not null,
  level            public.cefr_level not null,
  topic_id         smallint references public.topics (id) on delete set null,
  source_type      public.video_source not null,
  youtube_id       text check (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  storage_path     text,
  external_url     text check (external_url ~ '^https://'),
  source_name      text not null check (char_length(source_name) between 1 and 120),
  license_note     text,
  thumbnail_url    text,
  duration_seconds int  check (duration_seconds > 0),
  difficulty       smallint not null default 3 check (difficulty between 1 and 5),
  is_published     boolean not null default false,
  is_sample        boolean not null default false,
  created_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint videos_source_fields check (
    (source_type = 'youtube'      and youtube_id   is not null) or
    (source_type = 'upload'       and storage_path is not null) or
    (source_type = 'external_url' and external_url is not null)
  )
);
create index videos_browse_idx on public.videos (language, level, topic_id) where is_published;
create trigger videos_updated_at before update on public.videos
  for each row execute function public.set_updated_at();

create table public.transcripts (
  id               uuid primary key default gen_random_uuid(),
  video_id         uuid not null references public.videos (id) on delete cascade,
  format           public.transcript_format not null,
  source_file_path text,
  notes            text,
  is_active        boolean not null default true,
  created_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now()
);
create unique index transcripts_one_active_per_video on public.transcripts (video_id) where is_active;

create table public.video_segments (
  id             uuid primary key default gen_random_uuid(),
  video_id       uuid not null references public.videos (id) on delete cascade,
  transcript_id  uuid references public.transcripts (id) on delete set null,
  position       int  not null check (position >= 1),
  start_time     numeric(8,3) not null check (start_time >= 0),
  end_time       numeric(8,3) not null,
  text           text not null check (char_length(trim(text)) between 1 and 1000),
  pinyin         text,           -- optional manual override (多音字); otherwise generated client-side
  translation_vi text,
  difficulty     smallint check (difficulty between 1 and 5),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint segments_time_order check (end_time > start_time),
  constraint segments_max_length check (end_time - start_time <= 60),
  constraint segments_position_unique unique (video_id, position) deferrable initially deferred
);
create trigger video_segments_updated_at before update on public.video_segments
  for each row execute function public.set_updated_at();

-- Shared dictionary used by the word popup (Vietnamese meanings).
create table public.dictionary_entries (
  id              uuid primary key default gen_random_uuid(),
  language        public.language_code not null,
  term            text not null check (char_length(term) between 1 and 100),
  term_normalized text generated always as (lower(trim(term))) stored,
  reading         text,          -- IPA (en) or pinyin with tone marks (zh)
  meaning_vi      text not null,
  part_of_speech  text,
  example         text,
  example_vi      text,
  created_at      timestamptz not null default now(),
  unique (language, term_normalized, part_of_speech)
);
create index dictionary_lookup_idx on public.dictionary_entries (language, term_normalized);

-- ─────────────────────────────── User data ───────────────────────────
create table public.favorites (
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  video_id   uuid not null references public.videos (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, video_id)
);

create table public.learning_progress (
  user_id                uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  video_id               uuid not null references public.videos (id) on delete cascade,
  status                 public.progress_status not null default 'in_progress',
  last_segment_position  int not null default 1 check (last_segment_position >= 1),
  started_at             timestamptz not null default now(),
  completed_at           timestamptz,
  last_studied_at        timestamptz not null default now(),
  primary key (user_id, video_id),
  constraint progress_completed_at check ((status = 'completed') = (completed_at is not null))
);

create table public.study_sessions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind           public.session_kind not null,
  language       public.language_code not null,  -- needed for review sessions, which have no video
  video_id       uuid references public.videos (id) on delete set null,
  started_at     timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  active_seconds int not null default 0 check (active_seconds between 0 and 86400)
);
create index study_sessions_user_time_idx on public.study_sessions (user_id, started_at);

create table public.dictation_attempts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  segment_id      uuid not null references public.video_segments (id) on delete cascade,
  session_id      uuid references public.study_sessions (id) on delete set null,
  user_input      text not null check (char_length(user_input) <= 2000),
  accuracy        numeric(5,2) not null check (accuracy between 0 and 100),
  is_correct      boolean not null,
  -- { "missing": 1, "extra": 0, "misspelled": 2, "wrong_word": 0, "punctuation": 1,
  --   "wrong_character": 0, "misheard": 0 }
  error_summary   jsonb not null default '{}'::jsonb check (jsonb_typeof(error_summary) = 'object'),
  hints_used      smallint not null default 0 check (hints_used >= 0),
  answer_revealed boolean not null default false,
  skipped         boolean not null default false,
  duration_ms     int check (duration_ms >= 0),
  created_at      timestamptz not null default now()
);
create index attempts_user_time_idx on public.dictation_attempts (user_id, created_at);
create index attempts_user_segment_idx on public.dictation_attempts (user_id, segment_id);

create table public.vocabulary (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  language          public.language_code not null,
  term              text not null check (char_length(trim(term)) between 1 and 100),
  term_normalized   text generated always as (lower(trim(term))) stored,
  reading           text,            -- IPA or pinyin
  meaning_vi        text check (char_length(meaning_vi) <= 500),
  part_of_speech    text,
  example           text check (char_length(example) <= 500),
  notes             text check (char_length(notes) <= 1000),
  source_video_id   uuid references public.videos (id) on delete set null,
  source_segment_id uuid references public.video_segments (id) on delete set null,
  -- SRS state (one word = one card)
  status            public.vocab_status not null default 'new',
  ease_factor       numeric(4,2) not null default 2.50 check (ease_factor >= 1.30),
  interval_days     numeric(7,2) not null default 0 check (interval_days >= 0),
  repetitions       int not null default 0 check (repetitions >= 0),
  lapses            int not null default 0 check (lapses >= 0),
  due_at            timestamptz not null default now(),
  last_reviewed_at  timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, language, term_normalized),
  unique (id, user_id)               -- target for vocabulary_reviews composite FK
);
create index vocabulary_due_idx on public.vocabulary (user_id, due_at);
create trigger vocabulary_updated_at before update on public.vocabulary
  for each row execute function public.set_updated_at();

create table public.vocabulary_reviews (
  id                bigint generated always as identity primary key,
  vocabulary_id     uuid not null,
  user_id           uuid not null default auth.uid(),
  rating            public.review_rating not null,
  prev_interval_days numeric(7,2) not null,
  new_interval_days  numeric(7,2) not null,
  prev_ease         numeric(4,2) not null,
  new_ease          numeric(4,2) not null,
  duration_ms       int check (duration_ms >= 0),
  reviewed_at       timestamptz not null default now(),
  foreign key (vocabulary_id, user_id) references public.vocabulary (id, user_id) on delete cascade
);
create index reviews_user_time_idx on public.vocabulary_reviews (user_id, reviewed_at);

-- ─────────────────────────────── Views ───────────────────────────────
-- Counts are derived, never stored, so they can't drift.
create view public.video_catalog with (security_invoker = true) as
select
  v.*,
  t.slug as topic_slug,
  t.name as topic_name,
  coalesce(s.segment_count, 0) as segment_count,
  coalesce(s.word_count, 0)    as word_count
from public.videos v
left join public.topics t on t.id = v.topic_id
left join lateral (
  select
    count(*)::int as segment_count,
    sum(case when v.language = 'zh'
             then char_length(regexp_replace(seg.text, '[^一-鿿]', '', 'g'))
             else coalesce(array_length(regexp_split_to_array(trim(seg.text), '\s+'), 1), 0)
        end)::int as word_count
  from public.video_segments seg
  where seg.video_id = v.id
) s on true;

-- A segment counts as finished once the learner checked it correctly or revealed the answer.
create view public.user_video_progress with (security_invoker = true) as
select
  lp.user_id,
  lp.video_id,
  lp.status,
  lp.last_segment_position,
  lp.last_studied_at,
  lp.completed_at,
  coalesce(a.finished_segments, 0) as finished_segments,
  a.avg_accuracy
from public.learning_progress lp
left join lateral (
  select
    count(distinct da.segment_id) filter (where da.is_correct or da.answer_revealed)::int as finished_segments,
    round(avg(da.accuracy) filter (where not da.skipped), 1) as avg_accuracy
  from public.dictation_attempts da
  join public.video_segments vs on vs.id = da.segment_id
  where da.user_id = lp.user_id and vs.video_id = lp.video_id
) a on true;

-- ─────────────────────────────── RPCs ────────────────────────────────
-- Persist one SRS review atomically. The interval/ease are computed client-side by the
-- TypeScript SM-2 module (single source of truth, unit-tested); this validates and writes.
create or replace function public.record_review(
  p_vocabulary_id uuid,
  p_rating        public.review_rating,
  p_new_interval  numeric,
  p_new_ease      numeric,
  p_new_reps      int,
  p_new_status    public.vocab_status,
  p_due_at        timestamptz,
  p_duration_ms   int default null
) returns public.vocabulary
language plpgsql security invoker set search_path = public as $$
declare
  v_old public.vocabulary;
  v_new public.vocabulary;
begin
  if p_new_ease < 1.30 or p_new_interval < 0 or p_new_interval > 36500 or p_new_reps < 0 then
    raise exception 'invalid review values' using errcode = '22023';
  end if;
  if p_due_at < now() - interval '1 minute' or p_due_at > now() + interval '100 years' then
    raise exception 'invalid due date' using errcode = '22023';
  end if;

  select * into v_old from public.vocabulary
   where id = p_vocabulary_id and user_id = auth.uid()
   for update;
  if not found then
    raise exception 'vocabulary not found' using errcode = 'P0002';
  end if;

  update public.vocabulary set
    interval_days    = p_new_interval,
    ease_factor      = p_new_ease,
    repetitions      = p_new_reps,
    lapses           = lapses + (p_rating = 'again')::int,
    status           = p_new_status,
    due_at           = p_due_at,
    last_reviewed_at = now()
  where id = p_vocabulary_id
  returning * into v_new;

  insert into public.vocabulary_reviews
    (vocabulary_id, user_id, rating, prev_interval_days, new_interval_days, prev_ease, new_ease, duration_ms)
  values
    (p_vocabulary_id, auth.uid(), p_rating, v_old.interval_days, p_new_interval, v_old.ease_factor, p_new_ease, p_duration_ms);

  return v_new;
end $$;

-- Per-day activity in the learner's own timezone.
create or replace function public.get_daily_activity(p_days int default 30, p_language public.language_code default null)
returns table (day date, active_seconds int, attempts int, reviews int)
language sql stable security invoker set search_path = public as $$
  with tz as (
    select coalesce((select timezone from public.profiles where id = auth.uid()), 'UTC') as name
  ),
  days as (
    select generate_series(
      (now() at time zone (select name from tz))::date - (least(greatest(p_days, 1), 366) - 1),
      (now() at time zone (select name from tz))::date,
      interval '1 day')::date as day
  )
  select
    d.day,
    coalesce((select sum(s.active_seconds) from public.study_sessions s
              where s.user_id = auth.uid()
                and (p_language is null or s.language = p_language)
                and (s.started_at at time zone (select name from tz))::date = d.day), 0)::int,
    coalesce((select count(*) from public.dictation_attempts a
              join public.video_segments vs on vs.id = a.segment_id
              join public.videos v on v.id = vs.video_id
              where a.user_id = auth.uid()
                and (p_language is null or v.language = p_language)
                and (a.created_at at time zone (select name from tz))::date = d.day), 0)::int,
    coalesce((select count(*) from public.vocabulary_reviews r
              join public.vocabulary w on w.id = r.vocabulary_id
              where r.user_id = auth.uid()
                and (p_language is null or w.language = p_language)
                and (r.reviewed_at at time zone (select name from tz))::date = d.day), 0)::int
  from days d
  order by d.day;
$$;

-- Consecutive days (ending today, or yesterday if nothing yet today) with any activity.
create or replace function public.get_learning_streak()
returns int
language sql stable security invoker set search_path = public as $$
  with activity as (
    select day from public.get_daily_activity(366)
    where active_seconds > 0 or attempts > 0 or reviews > 0
  ),
  today as (
    select (now() at time zone coalesce(
      (select timezone from public.profiles where id = auth.uid()), 'UTC'))::date as d
  ),
  anchor as (
    select case
      when exists (select 1 from activity where day = (select d from today)) then (select d from today)
      else (select d from today) - 1
    end as d
  ),
  numbered as (
    select day, (select d from anchor) - day as offset_days,
           row_number() over (order by day desc) - 1 as rn
    from activity where day <= (select d from anchor)
  )
  select count(*)::int from numbered where offset_days = rn;
$$;

-- ─────────────────────────────── RLS ─────────────────────────────────
alter table public.profiles            enable row level security;
alter table public.topics              enable row level security;
alter table public.videos              enable row level security;
alter table public.transcripts         enable row level security;
alter table public.video_segments      enable row level security;
alter table public.dictionary_entries  enable row level security;
alter table public.favorites           enable row level security;
alter table public.learning_progress   enable row level security;
alter table public.study_sessions      enable row level security;
alter table public.dictation_attempts  enable row level security;
alter table public.vocabulary          enable row level security;
alter table public.vocabulary_reviews  enable row level security;

-- profiles: own row only; `role` is not updatable by learners (column grant below).
create policy profiles_select_own on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated, anon;
grant update (display_name, avatar_url, timezone, daily_goal_minutes, settings) on public.profiles to authenticated;

-- Content: everyone reads published; admins do everything.
create policy topics_read  on public.topics for select to anon, authenticated using (true);
create policy topics_admin on public.topics for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy videos_read  on public.videos for select to anon, authenticated using (is_published or public.is_admin());
create policy videos_admin on public.videos for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy transcripts_read on public.transcripts for select to authenticated using (
  public.is_admin() or exists (select 1 from public.videos v where v.id = video_id and v.is_published));
create policy transcripts_admin on public.transcripts for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy segments_read on public.video_segments for select to authenticated using (
  public.is_admin() or exists (select 1 from public.videos v where v.id = video_id and v.is_published));
create policy segments_admin on public.video_segments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy dictionary_read  on public.dictionary_entries for select to authenticated using (true);
create policy dictionary_admin on public.dictionary_entries for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Per-user tables: identical "own rows only" policy.
do $$
declare t text;
begin
  foreach t in array array['favorites', 'learning_progress', 'study_sessions',
                           'dictation_attempts', 'vocabulary', 'vocabulary_reviews']
  loop
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t || '_own', t);
  end loop;
end $$;

-- Learners must not be able to rewrite history: attempts and review logs are append-only.
create policy dictation_attempts_no_update on public.dictation_attempts as restrictive for update to authenticated using (false);
create policy vocabulary_reviews_no_update on public.vocabulary_reviews as restrictive for update to authenticated using (false);

-- Storage bucket for permitted uploaded videos (admin-only writes). Created in M10.
