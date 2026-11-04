-- "Ôn từ vựng" + "Check" from the learner's sheet: retype the word, see TRUE/FALSE.
-- Like the sheet formula, a word that hasn't been retyped yet counts as FALSE.
alter table public.vocabulary
  add column review_input   text not null default '' check (char_length(review_input) <= 300),
  add column review_correct boolean not null default false;
