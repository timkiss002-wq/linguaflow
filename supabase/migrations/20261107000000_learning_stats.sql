-- M7: one call returns everything the Dashboard / Statistics pages need, for one language or all.
create or replace function public.get_learning_stats(p_language public.language_code default null, p_days int default 30)
returns jsonb
language sql stable security invoker set search_path = public as $$
  with tz as (
    select coalesce((select timezone from public.profiles where id = auth.uid()), 'UTC') as name
  ),
  since as (
    select now() - make_interval(days => least(greatest(p_days, 1), 366)) as t
  ),
  attempts as (
    select a.*
    from public.dictation_attempts a
    join public.lesson_sentences ls on ls.id = a.sentence_id
    join public.lessons l on l.id = ls.lesson_id
    where a.user_id = auth.uid() and (p_language is null or l.language = p_language)
  ),
  recent as (
    select * from attempts where created_at >= (select t from since)
  ),
  words as (
    select * from public.vocabulary
    where user_id = auth.uid() and (p_language is null or language = p_language)
  ),
  -- Mistake analysis uses only answers the learner actually checked (not "Show answer" / "Skip").
  checked as (
    select * from recent where not answer_revealed and not skipped
  ),
  error_keys as (
    select e.key, sum(e.value::text::int) as n
    from checked r, jsonb_each(r.error_summary) e
    where jsonb_typeof(e.value) = 'number'
    group by e.key
  ),
  confusions as (
    select c ->> 0 as expected, c ->> 1 as typed, count(*) as n
    from checked r, jsonb_array_elements(case when jsonb_typeof(r.error_summary -> 'confusions') = 'array' then r.error_summary -> 'confusions' else '[]'::jsonb end) c
    group by 1, 2
    order by n desc, 1
    limit 10
  ),
  weekly as (
    select date_trunc('week', created_at at time zone (select name from tz))::date as week,
           round(avg(accuracy) filter (where not skipped), 1) as accuracy,
           count(*) as attempts
    from attempts
    where created_at >= now() - interval '12 weeks'
    group by 1
    order by 1
  ),
  reviews as (
    select r.rating, count(*) as n
    from public.vocabulary_reviews r
    join public.vocabulary w on w.id = r.vocabulary_id
    where r.user_id = auth.uid()
      and (p_language is null or w.language = p_language)
      and r.reviewed_at >= (select t from since)
    group by 1
  )
  select jsonb_build_object(
    'total_seconds', (select coalesce(sum(active_seconds), 0) from public.study_sessions
                      where user_id = auth.uid() and (p_language is null or language = p_language)),
    'period_seconds', (select coalesce(sum(active_seconds), 0) from public.study_sessions
                       where user_id = auth.uid() and (p_language is null or language = p_language)
                         and started_at >= (select t from since)),
    'attempts', (select count(*) from recent),
    'avg_accuracy', (select round(avg(accuracy), 1) from recent where not skipped),
    'sentences_finished', (select count(distinct sentence_id) from attempts where is_correct or answer_revealed),
    'lessons_completed', (select count(*) from public.learning_progress lp join public.lessons l on l.id = lp.lesson_id
                          where lp.user_id = auth.uid() and lp.status = 'completed'
                            and (p_language is null or l.language = p_language)),
    'words', (select count(*) from words),
    'words_by_status', (select jsonb_build_object(
                          'new', count(*) filter (where status = 'new'),
                          'learning', count(*) filter (where status = 'learning'),
                          'reviewing', count(*) filter (where status = 'reviewing'),
                          'mastered', count(*) filter (where status = 'mastered')) from words),
    'errors', coalesce((select jsonb_object_agg(key, n) from error_keys), '{}'::jsonb),
    'confusions', coalesce((select jsonb_agg(jsonb_build_object('expected', expected, 'typed', typed, 'count', n)) from confusions), '[]'::jsonb),
    'weekly_accuracy', coalesce((select jsonb_agg(jsonb_build_object('week', week, 'accuracy', accuracy, 'attempts', attempts)) from weekly), '[]'::jsonb),
    'reviews', coalesce((select jsonb_object_agg(rating, n) from reviews), '{}'::jsonb)
  );
$$;
