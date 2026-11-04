-- P2: raw material for the strengths & weaknesses report (analysed in the app, see src/lib/personal/insights.ts).
create or replace function public.get_insight_data(p_days int default 60)
returns jsonb
language sql stable security invoker set search_path = public as $$
  with tz as (
    select coalesce((select timezone from public.profiles where id = auth.uid()), 'UTC') as name
  ),
  since as (
    select now() - make_interval(days => least(greatest(p_days, 7), 366)) as t
  ),
  -- answers the learner actually checked (not "Show answer" / "Skip")
  checked as (
    select a.*, l.language, ls.text as sentence
    from public.dictation_attempts a
    join public.lesson_sentences ls on ls.id = a.sentence_id
    join public.lessons l on l.id = ls.lesson_id
    where a.user_id = auth.uid() and a.created_at >= (select t from since)
      and not a.answer_revealed and not a.skipped
  ),
  pairs as (
    select c.language, p ->> 0 as expected, p ->> 1 as typed, count(*) as n, min(c.sentence) as sentence
    from checked c,
         jsonb_array_elements(case when jsonb_typeof(c.error_summary -> 'confusions') = 'array' then c.error_summary -> 'confusions' else '[]'::jsonb end) p
    group by 1, 2, 3
  ),
  missed as (
    select c.language, m #>> '{}' as word, count(*) as n
    from checked c,
         jsonb_array_elements(case when jsonb_typeof(c.error_summary -> 'missed') = 'array' then c.error_summary -> 'missed' else '[]'::jsonb end) m
    group by 1, 2
  ),
  sentences as (
    select language, count(*) as n,
           coalesce(sum((error_summary ->> 'missing')::int), 0) as missing,
           coalesce(sum((error_summary ->> 'misspelled')::int), 0) as misspelled,
           coalesce(sum((error_summary ->> 'tone')::int), 0) as tone,
           coalesce(sum((error_summary ->> 'wrong_character')::int), 0) as wrong_character,
           coalesce(sum((error_summary ->> 'misheard')::int), 0) as misheard,
           coalesce(sum((error_summary ->> 'word_form')::int), 0) as word_form,
           round(avg(accuracy), 1) as accuracy
    from checked group by language
  ),
  reviews as (
    select w.language, r.rating, count(*) as n
    from public.vocabulary_reviews r join public.vocabulary w on w.id = r.vocabulary_id
    where r.user_id = auth.uid() and r.reviewed_at >= (select t from since)
    group by 1, 2
  ),
  typing as (
    select w.language, count(*) as n, count(*) filter (where p.is_correct) as correct
    from public.practice_attempts p join public.vocabulary w on w.id = p.vocabulary_id
    where p.user_id = auth.uid() and p.created_at >= (select t from since)
    group by 1
  ),
  leeches as (
    select id, term, language, lapses, meaning_vi from public.vocabulary
    where user_id = auth.uid() and lapses >= 2
    order by lapses desc, term limit 10
  ),
  -- habits: time of day in the learner's zone
  slots as (
    select case
             when extract(hour from started_at at time zone (select name from tz)) between 5 and 11 then 'morning'
             when extract(hour from started_at at time zone (select name from tz)) between 12 and 17 then 'afternoon'
             when extract(hour from started_at at time zone (select name from tz)) between 18 and 22 then 'evening'
             else 'night' end as slot,
           active_seconds, started_at
    from public.study_sessions
    where user_id = auth.uid() and started_at >= (select t from since) and active_seconds > 0
  ),
  attempt_slots as (
    select case
             when extract(hour from created_at at time zone (select name from tz)) between 5 and 11 then 'morning'
             when extract(hour from created_at at time zone (select name from tz)) between 12 and 17 then 'afternoon'
             when extract(hour from created_at at time zone (select name from tz)) between 18 and 22 then 'evening'
             else 'night' end as slot,
           accuracy
    from checked
  )
  select jsonb_build_object(
    'days', least(greatest(p_days, 7), 366),
    'pairs', coalesce((select jsonb_agg(jsonb_build_object('language', language, 'expected', expected, 'typed', typed, 'count', n, 'sentence', sentence)) from pairs), '[]'::jsonb),
    'missed', coalesce((select jsonb_agg(jsonb_build_object('language', language, 'word', word, 'count', n)) from missed), '[]'::jsonb),
    'sentences', coalesce((select jsonb_object_agg(language, to_jsonb(s) - 'language') from sentences s), '{}'::jsonb),
    'reviews', coalesce((select jsonb_agg(jsonb_build_object('language', language, 'rating', rating, 'count', n)) from reviews), '[]'::jsonb),
    'typing', coalesce((select jsonb_object_agg(language, jsonb_build_object('n', n, 'correct', correct)) from typing), '{}'::jsonb),
    'word_forms', (select jsonb_build_object('n', count(*), 'correct', count(*) filter (where result = 'correct'))
                   from public.word_form_attempts where user_id = auth.uid() and created_at >= (select t from since)),
    'leeches', coalesce((select jsonb_agg(to_jsonb(l)) from leeches l), '[]'::jsonb),
    'habits', jsonb_build_object(
      'slots', coalesce((select jsonb_object_agg(slot, jsonb_build_object('minutes', minutes, 'sessions', sessions))
                         from (select slot, round(sum(active_seconds) / 60.0) as minutes, count(*) as sessions from slots group by slot) x), '{}'::jsonb),
      'accuracy_by_slot', coalesce((select jsonb_object_agg(slot, jsonb_build_object('accuracy', acc, 'n', n))
                                    from (select slot, round(avg(accuracy), 1) as acc, count(*) as n from attempt_slots group by slot) x), '{}'::jsonb),
      'avg_session_minutes', (select round(avg(active_seconds) / 60.0, 1) from slots),
      'active_days_14', (select count(distinct (started_at at time zone (select name from tz))::date) from slots where started_at >= now() - interval '14 days')
    )
  );
$$;
