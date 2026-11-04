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

-- ─────────────────────────── Demo videos (is_sample = true) ───────────────────────────
-- Real YouTube videos found by title search (HSK 3–6 listening material). They are only
-- embedded, never downloaded. Metadata (channel, duration) was not verifiable at seed time;
-- the player reports clearly if a video is removed or has embedding disabled.
-- Lesson sentences (video_segments) are NOT seeded: they must match the audio exactly and be
-- timed by listening, which is done with the admin segment editor.
insert into public.videos
  (id, title, description, language, level, hsk_level, topic_id, source_type, youtube_id, source_name, license_note, difficulty, is_published, is_sample)
select v.id::uuid, v.title, v.description, 'zh', v.level::public.cefr_level, v.hsk, t.id, 'youtube', v.yt,
       'YouTube', 'Embedded with the official YouTube player. Demo content.', v.difficulty, true, true
from (values
  ('a0000000-0000-4000-8000-000000000301', 'HSK 3 Listening Practice 1', 'Key sentences from the HSK 3 standard course, read at slow and normal speed.', 'elementary', 3, 'education', 'N28PIBa8HCo', 2),
  ('a0000000-0000-4000-8000-000000000302', 'HSK 3 Listening Practice 2', 'More HSK 3 standard course sentences at slow and normal speed.', 'elementary', 3, 'education', 'wNeUKT3JFUc', 2),
  ('a0000000-0000-4000-8000-000000000303', 'HSK 3 Textbook Dialogues — Part 1', 'Dialogues and vocabulary from the first lessons of HSK 3.', 'elementary', 3, 'daily-conversation', '8U96f2Ey44A', 2),
  ('a0000000-0000-4000-8000-000000000304', 'HSK 3 Listening Practice — Conversation (Lesson 5)', 'A short everyday conversation at HSK 3 level.', 'elementary', 3, 'daily-conversation', 'dTbahXp6Y-0', 2),
  ('a0000000-0000-4000-8000-000000000305', 'HSK 3 Listening Practice — Story (Lesson 1)', 'A short story using HSK 3 vocabulary.', 'elementary', 3, 'entertainment', 'fLwqq19Y0Kk', 2),
  ('a0000000-0000-4000-8000-000000000401', 'Intermediate Chinese Story — HSK 4 Lesson 1', 'Graded story with characters, Pinyin and English subtitles.', 'intermediate', 4, 'entertainment', 'J7kc_4jVnBQ', 3),
  ('a0000000-0000-4000-8000-000000000402', 'A Ghost Story — Slow & Clear Chinese (HSK 3–4)', 'A slow, clearly narrated story for HSK 3–4 learners.', 'intermediate', 4, 'entertainment', 'RNwEosHJfe0', 3),
  ('a0000000-0000-4000-8000-000000000403', 'Why Do Chinese People Always Need Subtitles? (HSK 3–4)', 'Comprehensible-input talk about subtitles in Chinese media.', 'intermediate', 4, 'podcast-interviews', 'jvD7NQE0L6o', 3),
  ('a0000000-0000-4000-8000-000000000404', 'HSK 4 Listening Test', 'Exam-style HSK 4 listening practice.', 'intermediate', 4, 'education', 'WbEIXuENAPg', 3),
  ('a0000000-0000-4000-8000-000000000501', 'HSK 5 Standard Course — Unit 1 (Lessons 1–3)', 'Every sentence repeated at slow and normal speed.', 'upper_intermediate', 5, 'education', 'zvlv0VIVnXA', 4),
  ('a0000000-0000-4000-8000-000000000502', 'HSK 5 Lesson 3 — Vocabulary, Story & Listening', 'Vocabulary review followed by a story and listening practice.', 'upper_intermediate', 5, 'education', 'ekKnmHPwh04', 4),
  ('a0000000-0000-4000-8000-000000000503', 'A Chinese Horror Story — Slow & Clear (HSK 4–5)', 'Immersive story told slowly and clearly.', 'upper_intermediate', 5, 'entertainment', 'YeQA-cY9JG0', 4),
  ('a0000000-0000-4000-8000-000000000601', 'HSK 6 Listening Practice with Answers', 'HSK 6 listening questions with answers.', 'advanced', 6, 'education', 'DM6r2U8Imhc', 5),
  ('a0000000-0000-4000-8000-000000000602', 'HSK 6 Passage Listening Test (40 min)', 'Long-form HSK 6 level passages for endurance listening.', 'advanced', 6, 'education', 'mY87r6gqA3I', 5)
) as v(id, title, description, level, hsk, topic, yt, difficulty)
join public.topics t on t.slug = v.topic
on conflict (id) do nothing;
