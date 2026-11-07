-- W2: IELTS-style Reading and Listening practice tests. The tests themselves are app content
-- (content/ielts-tests/*.json); this table keeps each learner's marked attempts, which feed
-- the test history and the weak question types on Strengths & Weaknesses.

create table public.ielts_attempts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  test_id          text not null check (test_id ~ '^[a-z0-9-]{2,60}$'),
  skill            text not null check (skill in ('reading', 'listening')),
  -- which parts were taken (a full test or a single part)
  parts            text[] not null check (cardinality(parts) between 1 and 4),
  mode             text not null default 'practice' check (mode in ('exam', 'practice')),
  correct          smallint not null check (correct >= 0),
  total            smallint not null check (total between 1 and 40 and correct <= total),
  -- estimated band, only for a full 40-question test
  band             numeric(2, 1) check (band between 0 and 9),
  -- question number -> what the learner wrote / chose
  answers          jsonb not null default '{}' check (jsonb_typeof(answers) = 'object'),
  -- [{ n, type, part, mark }]
  results          jsonb not null default '[]' check (jsonb_typeof(results) = 'array'),
  duration_seconds int check (duration_seconds >= 0),
  created_at       timestamptz not null default now()
);
create index ielts_attempts_user_idx on public.ielts_attempts (user_id, created_at desc);

alter table public.ielts_attempts enable row level security;
create policy ielts_attempts_select on public.ielts_attempts for select to authenticated using (user_id = auth.uid());
create policy ielts_attempts_insert on public.ielts_attempts for insert to authenticated with check (user_id = auth.uid());
create policy ielts_attempts_delete on public.ielts_attempts for delete to authenticated using (user_id = auth.uid());
