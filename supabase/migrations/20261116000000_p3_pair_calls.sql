-- Automatic keyword pairing for pasted Passage 3s (p3-pairs Edge Function). Only a row per call is kept, for the daily
-- limit; the passage and questions are not stored. Written by the service role only; learners can read their own rows.

create table public.p3_pair_calls (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  model      text not null check (char_length(model) <= 100),
  created_at timestamptz not null default now()
);
create index p3_pair_calls_user_idx on public.p3_pair_calls (user_id, created_at desc);

alter table public.p3_pair_calls enable row level security;
create policy p3_pair_calls_select on public.p3_pair_calls for select to authenticated using (user_id = auth.uid());
