-- M5: vocabulary notebook as a sheet + typing practice.
-- Columns mirror the learner's own Google Sheet (word, meaning, topic, type, examples 1–5,
-- date added, review date, typing check) so the two can be synced later.

alter table public.vocabulary
  add column topic            text check (char_length(topic) <= 60),
  add column context_sentence text check (char_length(context_sentence) <= 1000),
  add column examples         text[] not null default '{}'
    check (cardinality(examples) <= 5),
  add column typing_level     smallint not null default 0 check (typing_level between 0 and 4),
  add column typing_streak    int not null default 0 check (typing_streak >= 0),
  add column last_typed_at    timestamptz,
  add constraint vocabulary_pos_values check (
    part_of_speech is null or part_of_speech in ('noun', 'verb', 'adj', 'adv', 'idiom', 'phrase', 'other')
  );

create index vocabulary_user_created_idx on public.vocabulary (user_id, created_at desc);

-- One row per typing exercise answer. Append-only; feeds weakness analysis later.
create table public.practice_attempts (
  id            bigint generated always as identity primary key,
  vocabulary_id uuid not null,
  user_id       uuid not null default auth.uid(),
  mode          text not null check (mode in ('copy', 'listen', 'meaning', 'cloze', 'form')),
  typed         text not null check (char_length(typed) <= 300),
  is_correct    boolean not null,
  level_before  smallint not null,
  level_after   smallint not null,
  created_at    timestamptz not null default now(),
  foreign key (vocabulary_id, user_id) references public.vocabulary (id, user_id) on delete cascade
);
create index practice_attempts_user_time_idx on public.practice_attempts (user_id, created_at);

alter table public.practice_attempts enable row level security;
create policy practice_attempts_own on public.practice_attempts for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy practice_attempts_no_update on public.practice_attempts as restrictive for update to authenticated using (false);

-- Records a typing answer and moves the word's typing level atomically.
-- Correct: level +1 (max 4). Wrong: level −1 (min 0), streak resets.
-- Reaching level 4 hands the word over to spaced-repetition review.
create or replace function public.record_typing_practice(
  p_vocabulary_id uuid,
  p_mode          text,
  p_typed         text,
  p_correct       boolean
) returns public.vocabulary
language plpgsql security invoker set search_path = public as $$
declare
  v_old public.vocabulary;
  v_new public.vocabulary;
  v_level smallint;
begin
  select * into v_old from public.vocabulary
   where id = p_vocabulary_id and user_id = auth.uid()
   for update;
  if not found then
    raise exception 'vocabulary not found' using errcode = 'P0002';
  end if;

  v_level := case when p_correct then least(v_old.typing_level + 1, 4) else greatest(v_old.typing_level - 1, 0) end;

  update public.vocabulary set
    typing_level  = v_level,
    typing_streak = case when p_correct then typing_streak + 1 else 0 end,
    last_typed_at = now(),
    status = case
      when v_level >= 4 and status in ('new', 'learning') then 'reviewing'::public.vocab_status
      when status = 'new' then 'learning'::public.vocab_status
      else status
    end
  where id = p_vocabulary_id
  returning * into v_new;

  insert into public.practice_attempts (vocabulary_id, user_id, mode, typed, is_correct, level_before, level_after)
  values (p_vocabulary_id, auth.uid(), p_mode, left(p_typed, 300), p_correct, v_old.typing_level, v_level);

  return v_new;
end $$;
