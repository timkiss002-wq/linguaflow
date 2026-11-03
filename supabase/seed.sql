-- LinguaFlow seed data. Runs after migrations on `supabase db reset`.
-- Only shared reference data lives here. User data is never seeded.

insert into public.topics (slug, name) values
  ('daily-conversation', 'Daily Conversation'),
  ('movies-tv',          'Movies & TV Shows'),
  ('podcast-interviews', 'Podcast & Interviews'),
  ('education',          'Education'),
  ('travel',             'Travel'),
  ('business-career',    'Business & Career'),
  ('entertainment',      'Entertainment')
on conflict (slug) do nothing;
