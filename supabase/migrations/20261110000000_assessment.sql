-- P3: level tests. Question bank, adaptive placement / check-in tests, Elo skill ratings.
-- Learners never read the bank directly: questions come through next_assessment_item() without
-- answers, and answers are graded by answer_assessment_item().

create table public.grammar_points (
  code           text primary key check (code ~ '^[a-z0-9-]{2,60}$'),
  language       public.language_code not null,
  level          smallint not null check (level between 1 and 6),
  name           text not null check (char_length(name) between 1 and 200),
  explanation_vi text not null check (char_length(explanation_vi) <= 2000)
);

create table public.assessment_items (
  id             text primary key check (id ~ '^[a-z0-9-]{2,60}$'),
  language       public.language_code not null,
  skill          text not null check (skill in ('vocabulary', 'grammar', 'characters', 'reading', 'listening')),
  kind           text not null check (kind in ('choice', 'order')),
  level          smallint not null check (level between 1 and 6),
  prompt         text not null check (char_length(prompt) between 1 and 1000),
  passage        text check (char_length(passage) <= 4000),
  audio          text check (char_length(audio) <= 1000),
  -- choice: the options; order: the tokens, shuffled
  options        jsonb not null check (jsonb_typeof(options) = 'array'),
  -- choice: index of the right option; order: array of accepted sentences
  answer         jsonb not null,
  explanation_vi text check (char_length(explanation_vi) <= 2000),
  point          text references public.grammar_points (code) on delete set null,
  rating         real not null,
  responses      int not null default 0,
  status         text not null default 'approved' check (status in ('draft', 'approved')),
  source         text not null default 'manual' check (source in ('manual', 'ai')),
  check (skill <> 'characters' or language = 'zh'),
  check (kind = 'choice' and jsonb_typeof(answer) = 'number' or kind = 'order' and jsonb_typeof(answer) = 'array')
);
create index assessment_items_pick_idx on public.assessment_items (language, skill, status, rating);

create table public.assessments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  language     public.language_code not null,
  kind         text not null check (kind in ('placement', 'checkin')),
  total        smallint not null check (total between 1 and 60),
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  result       jsonb
);
create index assessments_user_idx on public.assessments (user_id, language, started_at desc);
-- at most one unfinished test per language
create unique index assessments_open_idx on public.assessments (user_id, language) where finished_at is null;

create table public.assessment_responses (
  id             uuid primary key default gen_random_uuid(),
  assessment_id  uuid not null references public.assessments (id) on delete cascade,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  item_id        text not null references public.assessment_items (id) on delete cascade,
  skill          text not null,
  response       jsonb not null,
  correct        boolean not null,
  rating_before  real not null,
  rating_after   real not null,
  item_rating    real not null,
  duration_ms    int check (duration_ms >= 0),
  created_at     timestamptz not null default now(),
  unique (assessment_id, item_id)
);
create index assessment_responses_user_idx on public.assessment_responses (user_id, item_id);

create table public.user_skill_ratings (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  language   public.language_code not null,
  skill      text not null,
  rating     real not null,
  n          int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, language, skill)
);

-- one row per skill at the end of each test, to show progress over time
create table public.user_skill_ratings_history (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  language      public.language_code not null,
  skill         text not null,
  rating        real not null,
  n             int not null,
  recorded_at   timestamptz not null default now()
);
create index user_skill_ratings_history_idx on public.user_skill_ratings_history (user_id, language, recorded_at);

alter table public.grammar_points             enable row level security;
alter table public.assessment_items           enable row level security;
alter table public.assessments                enable row level security;
alter table public.assessment_responses       enable row level security;
alter table public.user_skill_ratings         enable row level security;
alter table public.user_skill_ratings_history enable row level security;

create policy grammar_points_read  on public.grammar_points for select to anon, authenticated using (true);
create policy grammar_points_admin on public.grammar_points for all to authenticated using (public.is_admin()) with check (public.is_admin());
-- answers live in this table: admins only
create policy assessment_items_admin on public.assessment_items for all to authenticated using (public.is_admin()) with check (public.is_admin());
-- learners read their own tests; all writes go through the functions below
create policy assessments_own       on public.assessments                for select to authenticated using (user_id = auth.uid());
create policy responses_own         on public.assessment_responses       for select to authenticated using (user_id = auth.uid());
create policy skill_ratings_own     on public.user_skill_ratings         for select to authenticated using (user_id = auth.uid());
create policy skill_history_own     on public.user_skill_ratings_history for select to authenticated using (user_id = auth.uid());

/** Skills measured per language, in the order a test rotates through them. */
create or replace function public.assessment_skills(p_language public.language_code)
returns text[] language sql immutable as $$
  select case when p_language = 'zh'
    then array['vocabulary', 'grammar', 'listening', 'characters', 'reading']
    else array['vocabulary', 'grammar', 'listening', 'reading'] end;
$$;

/** Start a test, or return the unfinished one for this language. Seeds skill ratings from p_start_level (1–6). */
create or replace function public.start_assessment(p_language public.language_code, p_kind text, p_start_level int default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
  v_start real := 800 + 150 * (least(greatest(coalesce(p_start_level, 3), 1), 6) - 1);
begin
  if v_uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if p_kind not in ('placement', 'checkin') then raise exception 'unknown test kind' using errcode = '22023'; end if;

  select id into v_id from assessments where user_id = v_uid and language = p_language and finished_at is null;
  if v_id is not null then return v_id; end if;

  insert into user_skill_ratings (user_id, language, skill, rating)
  select v_uid, p_language, s, v_start from unnest(assessment_skills(p_language)) s
  on conflict (user_id, language, skill) do nothing;

  insert into assessments (user_id, language, kind, total)
  values (v_uid, p_language, p_kind, case when p_kind = 'placement' then 20 else 10 end)
  returning id into v_id;
  return v_id;
end;
$$;

/**
 * The next question, without its answer. Deterministic for a given test state, so a reload shows the same question.
 * Skill: the one with the fewest questions so far in this test. Item: never answered before if possible, closest in
 * rating to the learner's current rating for that skill.
 */
create or replace function public.next_assessment_item(p_assessment uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  a      assessments;
  v_done int;
  v_skill text;
  v_rating real;
  it     assessment_items;
begin
  select * into a from assessments where id = p_assessment and user_id = auth.uid();
  if a.id is null then raise exception 'test not found' using errcode = 'P0002'; end if;
  select count(*) into v_done from assessment_responses where assessment_id = a.id;
  if a.finished_at is not null or v_done >= a.total then return null; end if;

  select s into v_skill
  from unnest(assessment_skills(a.language)) with ordinality as t(s, ord)
  where exists (select 1 from assessment_items i where i.language = a.language and i.skill = t.s and i.status = 'approved'
                  and not exists (select 1 from assessment_responses r where r.assessment_id = a.id and r.item_id = i.id))
  order by (select count(*) from assessment_responses r where r.assessment_id = a.id and r.skill = t.s), ord
  limit 1;
  if v_skill is null then return null; end if;

  select rating into v_rating from user_skill_ratings where user_id = a.user_id and language = a.language and skill = v_skill;

  select i.* into it
  from assessment_items i
  where i.language = a.language and i.skill = v_skill and i.status = 'approved'
    and not exists (select 1 from assessment_responses r where r.assessment_id = a.id and r.item_id = i.id)
  order by exists (select 1 from assessment_responses r where r.user_id = a.user_id and r.item_id = i.id),
           abs(i.rating - coalesce(v_rating, 1100)),
           md5(i.id || a.id::text)
  limit 1;

  return jsonb_build_object(
    'id', it.id, 'skill', it.skill, 'kind', it.kind, 'level', it.level,
    'prompt', it.prompt, 'passage', it.passage, 'audio', it.audio, 'options', it.options,
    'number', v_done + 1, 'total', a.total
  );
end;
$$;

/** Grade one answer, update the Elo ratings, and finish the test after the last question. */
create or replace function public.answer_assessment_item(p_assessment uuid, p_item text, p_response jsonb, p_duration_ms int default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  a        assessments;
  it       assessment_items;
  sr       user_skill_ratings;
  v_done   int;
  v_ok     boolean;
  v_joined text;
  v_exp    real;
  v_k      real;
  v_new    real;
  v_finished boolean := false;
begin
  select * into a from assessments where id = p_assessment and user_id = auth.uid() for update;
  if a.id is null then raise exception 'test not found' using errcode = 'P0002'; end if;
  if a.finished_at is not null then raise exception 'test already finished' using errcode = '22023'; end if;
  select count(*) into v_done from assessment_responses where assessment_id = a.id;
  if v_done >= a.total then raise exception 'test already complete' using errcode = '22023'; end if;

  select * into it from assessment_items where id = p_item and language = a.language and status = 'approved';
  if it.id is null then raise exception 'question not found' using errcode = 'P0002'; end if;
  if exists (select 1 from assessment_responses where assessment_id = a.id and item_id = it.id) then
    raise exception 'question already answered' using errcode = '23505';
  end if;

  if it.kind = 'choice' then
    if jsonb_typeof(p_response -> 'choice') <> 'number' then raise exception 'choice expected' using errcode = '22023'; end if;
    v_ok := (p_response ->> 'choice')::int = (it.answer #>> '{}')::int;
  else
    if jsonb_typeof(p_response -> 'order') <> 'array' then raise exception 'order expected' using errcode = '22023'; end if;
    select string_agg(t, case when a.language = 'zh' then '' else ' ' end order by ord) into v_joined
    from jsonb_array_elements_text(p_response -> 'order') with ordinality as x(t, ord);
    v_ok := exists (select 1 from jsonb_array_elements_text(it.answer) s where s = v_joined);
  end if;

  select * into sr from user_skill_ratings where user_id = a.user_id and language = a.language and skill = it.skill for update;
  -- Elo: expected score against the item, K shrinks as evidence grows
  v_exp := 1 / (1 + power(10, (it.rating - sr.rating) / 400.0));
  -- large steps while little is known (a placement test has ~4 questions per skill), smaller later
  v_k := greatest(24, 160 / sqrt(sr.n + 1));
  v_new := sr.rating + v_k * ((case when v_ok then 1 else 0 end) - v_exp);
  update user_skill_ratings set rating = v_new, n = n + 1, updated_at = now()
  where user_id = sr.user_id and language = sr.language and skill = sr.skill;
  -- items only start moving once enough people have answered them
  update assessment_items
  set responses = responses + 1,
      rating = case when responses + 1 >= 30 then rating - 16 * ((case when v_ok then 1 else 0 end) - v_exp) else rating end
  where id = it.id;

  insert into assessment_responses (assessment_id, user_id, item_id, skill, response, correct, rating_before, rating_after, item_rating, duration_ms)
  values (a.id, a.user_id, it.id, it.skill, p_response, v_ok, sr.rating, v_new, it.rating, p_duration_ms);

  if v_done + 1 >= a.total or not exists (
    select 1 from assessment_items i where i.language = a.language and i.status = 'approved'
      and not exists (select 1 from assessment_responses r where r.assessment_id = a.id and r.item_id = i.id)
  ) then
    v_finished := true;
    update assessments set finished_at = now(), result = (
      select jsonb_object_agg(r.skill, jsonb_build_object('rating', round(r.rating), 'n', r.n,
               'correct', (select count(*) from assessment_responses x where x.assessment_id = a.id and x.skill = r.skill and x.correct),
               'total', (select count(*) from assessment_responses x where x.assessment_id = a.id and x.skill = r.skill)))
      from user_skill_ratings r where r.user_id = a.user_id and r.language = a.language
    ) where id = a.id;
    insert into user_skill_ratings_history (user_id, assessment_id, language, skill, rating, n)
    select user_id, a.id, language, skill, rating, n from user_skill_ratings where user_id = a.user_id and language = a.language;
  end if;

  return jsonb_build_object('correct', v_ok, 'answer', it.answer, 'explanation_vi', it.explanation_vi, 'finished', v_finished);
end;
$$;

/** A finished test with every question, the learner's answer, the right answer and the explanation. */
create or replace function public.get_assessment_review(p_assessment uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'assessment', to_jsonb(a),
    'responses', coalesce((
      select jsonb_agg(jsonb_build_object(
               'item_id', i.id, 'skill', i.skill, 'kind', i.kind, 'level', i.level, 'prompt', i.prompt,
               'passage', i.passage, 'audio', i.audio, 'options', i.options, 'answer', i.answer,
               'explanation_vi', i.explanation_vi, 'point', i.point, 'point_name', g.name, 'point_vi', g.explanation_vi,
               'response', r.response, 'correct', r.correct) order by r.created_at)
      from assessment_responses r
      join assessment_items i on i.id = r.item_id
      left join grammar_points g on g.code = i.point
      where r.assessment_id = a.id), '[]'::jsonb)
  )
  from assessments a
  where a.id = p_assessment and a.user_id = auth.uid() and a.finished_at is not null;
$$;

revoke all on function public.start_assessment(public.language_code, text, int) from public, anon;
revoke all on function public.next_assessment_item(uuid) from public, anon;
revoke all on function public.answer_assessment_item(uuid, text, jsonb, int) from public, anon;
revoke all on function public.get_assessment_review(uuid) from public, anon;
grant execute on function public.start_assessment(public.language_code, text, int) to authenticated;
grant execute on function public.next_assessment_item(uuid) to authenticated;
grant execute on function public.answer_assessment_item(uuid, text, jsonb, int) to authenticated;
grant execute on function public.get_assessment_review(uuid) to authenticated;
