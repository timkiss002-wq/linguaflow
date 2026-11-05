-- Admin content page: switch writing prompts on/off, and usage statistics for lessons, test questions,
-- prompts and AI feedback. Text stays in content/*.json (reviewed in git); this controls what learners see.

alter table public.writing_tasks add column is_active boolean not null default true;
drop policy writing_tasks_read on public.writing_tasks;
create policy writing_tasks_read on public.writing_tasks for select to authenticated using (is_active or public.is_admin());

/** Usage numbers for the admin page. Admins only (security definer, so it can count everyone's rows). */
create or replace function public.admin_content_stats()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admins only' using errcode = '42501'; end if;
  return jsonb_build_object(
    'lessons', coalesce((
      select jsonb_object_agg(lesson_id, jsonb_build_object('attempts', n, 'learners', u, 'accuracy', acc))
      from (select ls.lesson_id, count(*) as n, count(distinct a.user_id) as u, round(avg(a.accuracy) filter (where not a.skipped and not a.answer_revealed), 1) as acc
            from dictation_attempts a join lesson_sentences ls on ls.id = a.sentence_id group by ls.lesson_id) x), '{}'::jsonb),
    'items', coalesce((
      select jsonb_object_agg(item_id, jsonb_build_object('answers', n, 'correct', c))
      from (select item_id, count(*) as n, count(*) filter (where correct) as c from assessment_responses group by item_id) x), '{}'::jsonb),
    'tasks', coalesce((
      select jsonb_object_agg(task_id, jsonb_build_object('texts', n, 'writers', u))
      from (select task_id, count(*) as n, count(distinct user_id) as u from writing_submissions where task_id is not null group by task_id) x), '{}'::jsonb),
    'ai', jsonb_build_object(
      'last_24h', (select count(*) from writing_feedback where created_at >= now() - interval '24 hours'),
      'learners_24h', (select count(distinct user_id) from writing_feedback where created_at >= now() - interval '24 hours'),
      'total', (select count(*) from writing_feedback),
      'by_model', coalesce((select jsonb_object_agg(model, n) from (select model, count(*) as n from writing_feedback group by model) x), '{}'::jsonb)
    )
  );
end;
$$;
revoke all on function public.admin_content_stats() from public, anon;
grant execute on function public.admin_content_stats() to authenticated;
