-- P5: Writing (English + Chinese). Prompts are shared reference data; submissions belong to the learner.
-- Analysis runs in the app (src/lib/writing/analyze.ts, no AI) and is stored with the text.

create table public.writing_tasks (
  id        text primary key check (id ~ '^[a-z0-9-]{2,60}$'),
  language  public.language_code not null,
  kind      text not null check (kind in ('sentences', 'paragraph', 'letter', 'essay')),
  exam      text not null default 'general' check (exam in ('general', 'hsk', 'ielts')),
  level_min smallint not null check (level_min between 1 and 6),
  level_max smallint not null check (level_max between level_min and 6),
  topic     text,
  title     text not null check (char_length(title) between 1 and 200),
  prompt    text not null check (char_length(prompt) between 1 and 2000),
  prompt_vi text,
  min_length int not null check (min_length > 0),
  max_length int check (max_length >= min_length),
  words     text[] not null default '{}'
);

create table public.writing_submissions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  language         public.language_code not null,
  task_id          text references public.writing_tasks (id) on delete set null,
  -- the task as the learner saw it (tasks can be edited later)
  title            text not null check (char_length(title) <= 200),
  prompt           text not null check (char_length(prompt) <= 2000),
  target_words     text[] not null default '{}' check (cardinality(target_words) <= 10),
  body             text not null check (char_length(body) between 1 and 20000),
  metrics          jsonb not null default '{}' check (jsonb_typeof(metrics) = 'object'),
  duration_seconds int check (duration_seconds >= 0),
  created_at       timestamptz not null default now()
);
create index writing_submissions_user_idx on public.writing_submissions (user_id, language, created_at desc);

alter table public.writing_tasks enable row level security;
alter table public.writing_submissions enable row level security;
create policy writing_tasks_read  on public.writing_tasks for select to authenticated using (true);
create policy writing_tasks_admin on public.writing_tasks for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy writing_submissions_select on public.writing_submissions for select to authenticated using (user_id = auth.uid());
create policy writing_submissions_insert on public.writing_submissions for insert to authenticated with check (user_id = auth.uid());
create policy writing_submissions_delete on public.writing_submissions for delete to authenticated using (user_id = auth.uid());

-- today's plan can tick off "Writing" (adds 'writings' to get_plan_progress)
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
                       where user_id = auth.uid() and finished_at >= (select t from start)), '[]'::jsonb),
    'writings', coalesce((select jsonb_agg(distinct language) from public.writing_submissions
                          where user_id = auth.uid() and created_at >= (select t from start)), '[]'::jsonb)
  );
$$;
