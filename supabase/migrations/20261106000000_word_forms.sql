-- M5b: IELTS word forms. Shared word-family reference data + each learner's practice results.

create table public.word_families (
  id     text primary key check (id ~ '^[a-z-]{2,40}$'),  -- headword
  note   text,
  traps  text[] not null default '{}'
);

create table public.word_family_members (
  id         bigint generated always as identity primary key,
  family_id  text not null references public.word_families (id) on delete cascade,
  word       text not null check (char_length(word) between 1 and 60),
  pos        text not null check (pos in ('noun', 'verb', 'adj', 'adv')),
  meaning_vi text,
  unique (family_id, word, pos)
);
create index word_family_members_word_idx on public.word_family_members (lower(word));

create table public.word_family_examples (
  id          bigint generated always as identity primary key,
  family_id   text not null references public.word_families (id) on delete cascade,
  sentence    text not null check (sentence like '%[%]%'),  -- answer marked with [brackets]
  answer      text not null,
  answer_pos  text not null check (answer_pos in ('noun', 'verb', 'adj', 'adv')),
  base_word   text not null,                                -- shown in (brackets) in gap-fill
  why         text not null
);
create index word_family_examples_family_idx on public.word_family_examples (family_id);

alter table public.word_families        enable row level security;
alter table public.word_family_members  enable row level security;
alter table public.word_family_examples enable row level security;
create policy word_families_read  on public.word_families        for select to authenticated using (true);
create policy word_members_read   on public.word_family_members  for select to authenticated using (true);
create policy word_examples_read  on public.word_family_examples for select to authenticated using (true);
create policy word_families_admin on public.word_families        for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy word_members_admin  on public.word_family_members  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy word_examples_admin on public.word_family_examples for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- One row per answer in the Word Forms exercises. Append-only; drives "your weak spots".
create table public.word_form_attempts (
  id           bigint generated always as identity primary key,
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  family_id    text not null references public.word_families (id) on delete cascade,
  exercise     text not null check (exercise in ('gap', 'grid', 'fix', 'sort')),
  expected     text not null check (char_length(expected) <= 60),
  expected_pos text not null check (expected_pos in ('noun', 'verb', 'adj', 'adv')),
  typed        text not null check (char_length(typed) <= 100),
  -- part of speech of what was typed, when it is another member of the same family
  typed_pos    text check (typed_pos in ('noun', 'verb', 'adj', 'adv')),
  result       text not null check (result in ('correct', 'word_form', 'spelling', 'other')),
  created_at   timestamptz not null default now()
);
create index word_form_attempts_user_idx on public.word_form_attempts (user_id, created_at desc);

alter table public.word_form_attempts enable row level security;
create policy word_form_attempts_own on public.word_form_attempts for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy word_form_attempts_no_update on public.word_form_attempts as restrictive for update to authenticated using (false);
