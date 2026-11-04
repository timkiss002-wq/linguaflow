-- P6: AI feedback on writing. Written only by the writing-feedback Edge Function (service role), so a learner
-- cannot store made-up feedback; learners read their own. One feedback per text, kept so the AI is not called twice.

create table public.writing_feedback (
  submission_id uuid primary key references public.writing_submissions (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  model         text not null check (char_length(model) <= 100),
  feedback      jsonb not null check (jsonb_typeof(feedback) = 'object'),
  created_at    timestamptz not null default now()
);
create index writing_feedback_user_idx on public.writing_feedback (user_id, created_at desc);

alter table public.writing_feedback enable row level security;
create policy writing_feedback_select on public.writing_feedback for select to authenticated using (user_id = auth.uid());
-- no insert/update/delete policies: only the service role (Edge Function) writes; deleting the text deletes it too
