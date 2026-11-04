-- P1: learner profile (interests, habits) + one learning goal per language + HSK word list.

create table public.learner_profiles (
  user_id        uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  interests      text[] not null default '{}' check (cardinality(interests) <= 20),
  preferred_time text check (preferred_time in ('morning', 'afternoon', 'evening', 'night')),
  -- 0 = Sunday … 6 = Saturday
  study_days     smallint[] not null default '{0,1,2,3,4,5,6}' check (study_days <@ '{0,1,2,3,4,5,6}'::smallint[]),
  -- Learner can switch off analysis of their study habits (time of day, session length).
  habit_analysis boolean not null default true,
  onboarded_at   timestamptz,
  updated_at     timestamptz not null default now()
);
create trigger learner_profiles_updated_at before update on public.learner_profiles
  for each row execute function public.set_updated_at();

create table public.learning_goals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  language      public.language_code not null,
  -- ielts / cefr for English; hsk2 (6 levels) / hsk3 (9 levels) / cefr for Chinese
  exam          text not null check (exam in ('ielts', 'cefr', 'hsk2', 'hsk3')),
  current_level text not null check (char_length(current_level) between 1 and 10),
  target_level  text not null check (char_length(target_level) between 1 and 10),
  exam_date     date,
  focus_skills  text[] not null default '{}'
    check (focus_skills <@ '{listening,vocabulary,grammar,reading,writing,speaking,characters}'::text[]),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, language),
  constraint goals_exam_language check (
    (language = 'en' and exam in ('ielts', 'cefr')) or (language = 'zh' and exam in ('hsk2', 'hsk3', 'cefr'))
  )
);
create trigger learning_goals_updated_at before update on public.learning_goals
  for each row execute function public.set_updated_at();

alter table public.learner_profiles enable row level security;
alter table public.learning_goals   enable row level security;
create policy learner_profiles_own on public.learner_profiles for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy learning_goals_own on public.learning_goals for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Official HSK vocabulary (shared, read-only). Source in content/hsk-words.json (MIT).
create table public.hsk_words (
  word       text primary key,
  pinyin     text not null,
  level_v2   smallint check (level_v2 between 1 and 6),   -- HSK 2.0
  level_v3   smallint check (level_v3 between 1 and 7),   -- HSK 3.0 (7 = levels 7–9)
  meaning_en text
);
create index hsk_words_v2_idx on public.hsk_words (level_v2);
create index hsk_words_v3_idx on public.hsk_words (level_v3);
alter table public.hsk_words enable row level security;
create policy hsk_words_read  on public.hsk_words for select to authenticated using (true);
create policy hsk_words_admin on public.hsk_words for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Coverage of the HSK list by the learner's Chinese notebook, per level (cumulative).
create or replace function public.get_hsk_coverage(p_version int default 3)
returns table (level int, total int, saved int, known int)
language sql stable security invoker set search_path = public as $$
  with lv as (
    select generate_series(1, case when p_version = 2 then 6 else 7 end) as level
  ),
  hw as (
    select word, case when p_version = 2 then level_v2 else level_v3 end as lvl from public.hsk_words
  ),
  mine as (
    select term_normalized, status from public.vocabulary where user_id = auth.uid() and language = 'zh'
  )
  select
    lv.level,
    (select count(*) from hw where hw.lvl <= lv.level)::int,
    (select count(*) from hw join mine m on m.term_normalized = hw.word where hw.lvl <= lv.level)::int,
    (select count(*) from hw join mine m on m.term_normalized = hw.word where hw.lvl <= lv.level and m.status in ('reviewing', 'mastered'))::int
  from lv
  order by lv.level;
$$;
