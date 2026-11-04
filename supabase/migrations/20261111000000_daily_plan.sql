-- P4: today's plan. The plan is built in the app (src/lib/personal/plan.ts) once a day and stored here,
-- so it stays the same all day; progress is read from what the learner actually did.

create table public.daily_plans (
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  day        date not null,
  items      jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) <= 12),
  notes      jsonb not null default '[]' check (jsonb_typeof(notes) = 'array'),
  -- item key → 'done' | 'skipped' (set by the learner)
  status     jsonb not null default '{}' check (jsonb_typeof(status) = 'object'),
  rest_day   boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.daily_plans enable row level security;
create policy daily_plans_select on public.daily_plans for select to authenticated using (user_id = auth.uid());
create policy daily_plans_insert on public.daily_plans for insert to authenticated with check (user_id = auth.uid());
create policy daily_plans_update on public.daily_plans for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy daily_plans_delete on public.daily_plans for delete to authenticated using (user_id = auth.uid());

/** Mark one item of today's plan done / skipped, or clear it (p_status null). Atomic, unlike read-modify-write. */
create or replace function public.set_plan_item_status(p_day date, p_key text, p_status text)
returns jsonb
language plpgsql security invoker set search_path = public as $$
declare v jsonb;
begin
  if p_status is not null and p_status not in ('done', 'skipped') then
    raise exception 'status must be done or skipped' using errcode = '22023';
  end if;
  update daily_plans
  set status = case when p_status is null then status - p_key else status || jsonb_build_object(p_key, p_status) end
  where user_id = auth.uid() and day = p_day
    and exists (select 1 from jsonb_array_elements(items) i where i ->> 'key' = p_key)
  returning status into v;
  if v is null then raise exception 'plan item not found' using errcode = 'P0002'; end if;
  return v;
end;
$$;

/** What the learner did today (in their time zone): used to tick off plan items automatically. */
create or replace function public.get_plan_progress()
returns jsonb
language sql stable security invoker set search_path = public as $$
  with tz as (
    select coalesce((select timezone from public.profiles where id = auth.uid()), 'UTC') as name
  ),
  today as (
    select (now() at time zone (select name from tz))::date as d
  ),
  start as (
    select ((select d from today)::timestamp at time zone (select name from tz)) as t
  )
  select jsonb_build_object(
    'today', (select d from today),
    'reviews', (select count(*) from public.vocabulary_reviews where user_id = auth.uid() and reviewed_at >= (select t from start)),
    'sentences', coalesce((
      select jsonb_object_agg(lesson_id, n) from (
        select ls.lesson_id, count(distinct a.sentence_id) as n
        from public.dictation_attempts a join public.lesson_sentences ls on ls.id = a.sentence_id
        where a.user_id = auth.uid() and a.created_at >= (select t from start) and not a.skipped
        group by ls.lesson_id) x), '{}'::jsonb),
    'practice', (select count(*) from public.practice_attempts where user_id = auth.uid() and created_at >= (select t from start)),
    'word_forms', (select count(*) from public.word_form_attempts where user_id = auth.uid() and created_at >= (select t from start)),
    'tests', coalesce((select jsonb_agg(distinct language) from public.assessments
                       where user_id = auth.uid() and finished_at >= (select t from start)), '[]'::jsonb)
  );
$$;

/**
 * Dictation keeps the listening level (P3) up to date between tests: a small Elo step per checked sentence,
 * against the lesson's level. Only for learners who already have a listening rating (took a level test).
 * Score: whole sentence right (≥ 95%) = 1, mostly right (≥ 80%) = 0.5, else 0. K = 8, much smaller than in tests.
 */
create or replace function public.dictation_updates_listening()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_lang  public.language_code;
  v_level int;
  v_item  real;
  v_score real;
begin
  if new.answer_revealed or new.skipped then return new; end if;
  select l.language,
         coalesce(l.hsk_level, array_position(array['beginner', 'elementary', 'intermediate', 'upper_intermediate', 'advanced']::public.cefr_level[], l.level))
    into v_lang, v_level
  from public.lesson_sentences s join public.lessons l on l.id = s.lesson_id
  where s.id = new.sentence_id;
  if v_level is null then return new; end if;
  v_item := 800 + 150 * (least(greatest(v_level, 1), 6) - 1);
  v_score := case when new.accuracy >= 95 then 1 when new.accuracy >= 80 then 0.5 else 0 end;
  update public.user_skill_ratings r
  set rating = r.rating + 8 * (v_score - 1 / (1 + power(10, (v_item - r.rating) / 400.0))),
      updated_at = now()
  where r.user_id = new.user_id and r.language = v_lang and r.skill = 'listening';
  return new;
end;
$$;

create trigger dictation_updates_listening
after insert on public.dictation_attempts
for each row execute function public.dictation_updates_listening();
