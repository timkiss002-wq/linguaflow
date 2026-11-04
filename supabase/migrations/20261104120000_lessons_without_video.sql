-- Product decision (M3): no video. A lesson is a set of sentences read aloud by text-to-speech.
-- Renames video → lesson and video_segment → lesson_sentence; drops all video/timing fields.
-- Policies, foreign keys and indexes follow renamed tables/columns automatically.

drop view public.user_video_progress;
drop view public.video_catalog;

-- ─────────────── videos → lessons ───────────────
alter table public.videos drop constraint videos_source_fields;
alter table public.videos
  drop column source_type,
  drop column youtube_id,
  drop column storage_path,
  drop column external_url,
  drop column license_note,
  drop column thumbnail_url,
  drop column duration_seconds;
alter table public.videos rename column source_name to source;
alter table public.videos rename to lessons;
alter index public.videos_browse_idx rename to lessons_browse_idx;
alter index public.videos_hsk_idx rename to lessons_hsk_idx;
alter table public.lessons rename constraint videos_hsk_only_zh to lessons_hsk_only_zh;
alter trigger videos_updated_at on public.lessons rename to lessons_updated_at;
alter policy videos_read on public.lessons rename to lessons_read;
alter policy videos_admin on public.lessons rename to lessons_admin;
drop type public.video_source;

-- ─────────────── video_segments → lesson_sentences ───────────────
alter table public.video_segments
  drop column transcript_id,
  drop column start_time,
  drop column end_time;
alter table public.video_segments rename column video_id to lesson_id;
alter table public.video_segments rename to lesson_sentences;
alter table public.lesson_sentences rename constraint segments_position_unique to lesson_sentences_position_unique;
alter trigger video_segments_updated_at on public.lesson_sentences rename to lesson_sentences_updated_at;
alter policy segments_read on public.lesson_sentences rename to lesson_sentences_read;
alter policy segments_admin on public.lesson_sentences rename to lesson_sentences_admin;

drop table public.transcripts;
drop type public.transcript_format;

-- ─────────────── user data columns ───────────────
alter table public.favorites          rename column video_id to lesson_id;
alter table public.learning_progress  rename column video_id to lesson_id;
alter table public.learning_progress  rename column last_segment_position to last_sentence_position;
alter table public.study_sessions     rename column video_id to lesson_id;
alter table public.dictation_attempts rename column segment_id to sentence_id;
alter index public.attempts_user_segment_idx rename to attempts_user_sentence_idx;
alter table public.vocabulary rename column source_video_id to source_lesson_id;
alter table public.vocabulary rename column source_segment_id to source_sentence_id;

-- ─────────────── views ───────────────
create view public.lesson_catalog with (security_invoker = true) as
select
  l.*,
  t.slug as topic_slug,
  t.name as topic_name,
  coalesce(s.sentence_count, 0) as sentence_count,
  coalesce(s.word_count, 0)     as word_count
from public.lessons l
left join public.topics t on t.id = l.topic_id
left join lateral (
  select
    count(*)::int as sentence_count,
    sum(case when l.language = 'zh'
             then char_length(regexp_replace(ls.text, '[^一-鿿]', '', 'g'))
             else coalesce(array_length(regexp_split_to_array(trim(ls.text), '\s+'), 1), 0)
        end)::int as word_count
  from public.lesson_sentences ls
  where ls.lesson_id = l.id
) s on true;

-- A sentence counts as finished once checked correctly or the answer was revealed.
create view public.user_lesson_progress with (security_invoker = true) as
select
  lp.user_id,
  lp.lesson_id,
  lp.status,
  lp.last_sentence_position,
  lp.last_studied_at,
  lp.completed_at,
  coalesce(a.finished_sentences, 0) as finished_sentences,
  a.avg_accuracy
from public.learning_progress lp
left join lateral (
  select
    count(distinct da.sentence_id) filter (where da.is_correct or da.answer_revealed)::int as finished_sentences,
    round(avg(da.accuracy) filter (where not da.skipped), 1) as avg_accuracy
  from public.dictation_attempts da
  join public.lesson_sentences ls on ls.id = da.sentence_id
  where da.user_id = lp.user_id and ls.lesson_id = lp.lesson_id
) a on true;

grant select on public.lesson_catalog, public.user_lesson_progress to authenticated;
grant select on public.lesson_catalog to anon;

-- ─────────────── activity function (referenced the old tables) ───────────────
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
              join public.lesson_sentences ls on ls.id = a.sentence_id
              join public.lessons l on l.id = ls.lesson_id
              where a.user_id = auth.uid()
                and (p_language is null or l.language = p_language)
                and (a.created_at at time zone (select name from tz))::date = d.day), 0)::int,
    coalesce((select count(*) from public.vocabulary_reviews r
              join public.vocabulary w on w.id = r.vocabulary_id
              where r.user_id = auth.uid()
                and (p_language is null or w.language = p_language)
                and (r.reviewed_at at time zone (select name from tz))::date = d.day), 0)::int
  from days d
  order by d.day;
$$;
