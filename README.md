# LinguaFlow

> Learn languages by listening, typing and writing.

LinguaFlow is a web app for learning **English** and **Chinese (Simplified, with Pinyin, HSK 3–6)** by
dictation: listen to one sentence read aloud, type what you hear, and see exactly what you
missed. Saved words are reviewed later as flashcards with spaced repetition.

Audio comes from the browser's built-in text-to-speech, so every sentence matches its audio exactly
and no video or audio files are stored. (Video lessons were dropped in M3 — see
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#quyết-định-m3-bỏ-video).)

Architecture, database design and the milestone plan: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

## Status

| Milestone | Scope | Status |
|---|---|---|
| M0 | Analysis, architecture, database schema + RLS | ✅ Done |
| M1 | Project setup, authentication, app layout, settings, basic dashboard | ✅ Done |
| M2 | Library, detail page, favorites, My Learning | ✅ Done |
| M3 | Text-to-speech lessons (replaces video), voice settings, Pinyin | ✅ Done |
| M4 | Dictation Room + answer checking (EN words, ZH characters/tones) | ✅ Done |
| M5 | Vocabulary sheet (incl. *Ôn từ vựng* → TRUE/FALSE *Check*), word lookup, context, CSV import/export, typing practice — [design](docs/VOCABULARY.md) | ✅ Done |
| M5b | IELTS word forms: 104 word families, family cards, wrong-type warnings, 4 drills, weak spots, `word_form` errors in dictation — [design](docs/VOCABULARY.md#4-word-form-cho-ielts) | ✅ Done |
| M6 | Flashcard review: SM-2 or fixed intervals (like the learner's sheet), daily new-card limit, word→meaning / meaning→word, forecast | ✅ Done |
| M7 | Dashboard (goal, 6 tiles, study-time chart, EN vs 中文), Statistics (accuracy per week, mistake types, confused pairs), forgot/reset/change password, CI, deploy guide | ✅ Done |
| P1 | Learning profile & goals (IELTS / HSK 2.0 / HSK 3.0 / CEFR), onboarding wizard, official HSK word list (11,470 words), goal progress & recommended lessons — [design](docs/PERSONALIZATION.md#10-p1--đã-triển-khai) | ✅ Done |
| P2 | Strengths & weaknesses page: Chinese mistakes by Pinyin (tone / initial / final / same-sound), English endings & small words, word forms, forgotten words, best study time, same-sound character drill — [design](docs/PERSONALIZATION.md#11-p2--đã-triển-khai) | ✅ Done |
| P3 | Level test: adaptive placement + 2-weekly check-in per skill (Elo), 110-question bank, 27 grammar points, answers graded on the server — [design](docs/PERSONALIZATION.md#12-p3--đã-triển-khai) | ✅ Done |
| P4 | Today's plan on the dashboard: due reviews, level test / check-in, one weak spot, an i+1 lesson — sized to the daily goal, with reasons, auto-ticked, skips and rest days adapt it; dictation keeps the listening level current — [design](docs/PERSONALIZATION.md#13-p4--đã-triển-khai) | ✅ Done |
| P5 | Writing in English or 中文: 28 prompts picked by level, interests and exam (HSK / IELTS), notebook words as targets, drafts, automatic analysis without AI (length, sentences, variety, linking words, HSK levels of words, form checks), comparison with earlier texts, in the daily plan — [design](docs/PERSONALIZATION.md#14-p5--đã-triển-khai) | ✅ Done |
| P6 | AI feedback on writing (Gemini via a Supabase Edge Function, key on the server): scores on IELTS / HSK criteria, sentence corrections with Vietnamese explanations, improved version; validated against the text, cached, daily limit, opt-in with a privacy notice; repeated error types feed Strengths & Weaknesses — [design](docs/PERSONALIZATION.md#15-p6--đã-triển-khai), [setup](docs/DEPLOY.md) | ✅ Done |
| W1 | IELTS Task 2 guided writing: one fixed frame per question type (agree, discuss, advantages, problem–solution, two-part), 10 model essays at bands 5.5 / 6.5 / 7.5 with Vietnamese sentences; frame drill, sentence-by-sentence translation with instant checking and fading hints, then save → analysis + AI band score — [design](docs/PERSONALIZATION.md#16-w1--viết-theo-khung-ielts-task-2) | ✅ Done |
| W2 | IELTS Reading & Listening practice tests (written for LinguaFlow): a full Academic Reading test (3 passages) and a full Listening test (4 parts, read by text-to-speech with a voice per speaker); exam mode (timer, listen once) or practice by part; automatic marking with word limits, band estimate, Vietnamese explanation and highlighted evidence for every question; history and weak question types (also on Strengths & Weaknesses) — [design](docs/PERSONALIZATION.md#17-w2--luyện-đề-ielts-reading--listening) | ✅ Done |
| W3 | IELTS Writing exam mode and recurring mistakes: Task 2 under exam conditions (40-minute countdown that survives reloads, no help, automatic submission when time is up, AI band score requested straight away); a "My mistakes" page with AI band per criterion over time, the error categories you repeat most with your own examples, and a drill in which you correct your own past sentences — [design](docs/PERSONALIZATION.md#18-w3--thi-thử-writing-và-lỗi-hay-lặp-lại) | ✅ Done |
| W4 | IELTS Academic Writing Task 1 in the guided mode: five figure types (line graph, bar chart, pie charts, table, process diagram) drawn in the app, a fixed frame for each (introduction, overview, two detail paragraphs), model answers at bands 5.5 / 6.5 / 7.5 with Vietnamese sentences, and a 20-minute exam mode; the figure's data travels with the essay so the AI can mark it — [design](docs/PERSONALIZATION.md#19-w4--writing-task-1-mô-tả-biểu-đồ) | ✅ Done |
| W5 | More IELTS practice: a second Reading test (3 passages) and a second Listening test (4 parts), five more Task 2 prompts and five more Task 1 figures (three prompts per Task 2 type, two per Task 1 chart type), and a sixth Task 1 type — before/after maps drawn in the app, with its own frame (*was transformed from… into…*, *had been replaced by…*, *remained unchanged*) — [design](docs/PERSONALIZATION.md#20-w5--thêm-đề-và-task-1-bản-đồ) | ✅ Done |
| R1 | **Bài tập hằng ngày** (on **Hôm nay**, `/dashboard` while studying English). **Luyện thi → Reading** (`/ielts/reading`) is the single Reading hub: the left column lists every section — Bài lẻ, Full đề, Passage 3 ngắn, Cambridge 10–20, Đề trên web khác (links to YouPass, IELTS Mate, British Council, IDP, IZONE, IELTS Online Tests, plus “paste into the app”, where **Tự ghép cặp** marks the keywords and, through the `p3-pairs` Edge Function (Gemini), finds each partner in the passage so pasted sets are graded pair by pair), Kỹ năng nên học and Sổ paraphrase; `/ielts/passage3` redirects there: three small tasks a day — Reading Passage 3 (4–5 questions answered by first pairing every keyword with its paraphrase in the passage; a keyword with no partner → NOT GIVEN), one IELTS Writing prompt picked at random (guided frame or free writing) and one Listening Part 1. 116 Reading sets written for LinguaFlow (T/F/NG, Y/N/NG, MCQ, summary completion with a word box), each with an illustrated card, a key for every pair and Vietnamese explanations; an index of Passage 3 in Cambridge IELTS 10–20 where learners paste the text from their own book (kept on the device only, with backup/restore); streak and a paraphrase notebook with missed pairs first; **Kỹ năng nên học** — six Passage 3 skills (keyword pairing, paraphrase, FALSE vs NOT GIVEN, writer's view, MCQ distractors, gap word type), each with a how-to, 5–6 quick drills explained in Vietnamese and sets to apply it | ✅ Done |
| R2 | **Listening upgrades**: answer words, numbers and spellings read slower after a short pause ("Nhấn rõ từ khóa", on by default); after marking, every transcript line can be replayed on its own and the line holding the selected answer is outlined; a bank of 5 extra Part 1 conversations (`content/ielts-tests/listening-part1.json`) | ✅ Done |
| Admin | Content page for admins: lessons on/off, question approval with answer statistics, writing prompts on/off, AI usage | ✅ Done |

**Study language.** The top bar always shows “Hôm nay học: Tiếng Anh | Tiếng Trung”, and the first visit of each day
asks which one. The whole app then shows only that language: lessons, notebook, review, writing prompts, statistics,
level test, insights, today's plan and the daily word goal. English-only areas (Luyện đề IELTS, word forms, writing
mistakes) disappear while studying Chinese; a link to one of them switches to English. The choice is kept on the device.

**Navigation.** A top menu (no sidebar) with six areas, each in its own colour: **Home** (today's plan) ·
**Luyện đề IELTS** (Reading, Listening, Writing, Ngữ pháp & dịch câu) · **Lessons** (Explore, My lessons) · **Words** (Notebook, Review, Word forms) ·
**Writing** (Prompts, My mistakes) · **Progress** (Statistics, Strengths & Weaknesses, Level test). Pages of one area are
tabs under the menu. The IELTS pages are practice libraries: filters on the left (format, status, question type — kept
in the URL), cards on the right. Dictation, tests, writing and typing practice open in a focus mode without the menu.
On phones the areas are a bottom tab bar and the filters fold into one panel.

**Reading tests** show passage and questions side by side, each scrolling on its own, with three text sizes. Select text
in the passage to highlight it (click a highlight to remove it); highlights are saved with the answers.
After marking, every question gets the same explanation block: the answer (coloured by type), its place in the text
(“Đoạn B, câu 3” — click to scroll the passage there), the whole sentence that gives the answer with the exact evidence
marked inside it, and the Vietnamese explanation; words in the quoted sentence can be clicked to look up and save. A review
bar lists the wrong questions, steps through them and can hide the correct ones. Short Passage 3 sets quote the sentence
holding the answer with each keyword pair in its own colour.
Where the content provides them, a question also shows its paraphrase pairs tinted in matching colours in the question and
in the quote, the Vietnamese translation of the quoted sentence, and for gaps the kind of word needed; a passage can end
with a “Từ vựng trong bài” table (word, type, IPA, meaning, synonyms, example from the passage) with one-click saving to
the notebook. Done so far for Practice test 1, Passage 1 (`content/ielts-tests/reading-1.json` — see its `_note`).

**Vocabulary goal and review.** The daily goal is 10 new words (first review of a new card); until it is met a banner
shows on every page, and — if the learner clicks “Nhắc tôi” — a system notification appears at 12:00 and 20:00 while
the app is open. When the notebook runs out of new words, 10 IELTS headwords from the word-family list can be added in
one click. Review (`/review`) practises each due word by using it, in rounds over groups of 10: choose the Vietnamese
meaning → fill a gap with the right form of its word family (or the word in its own sentence) → type the word from its
meaning. The mistakes made set the SM-2 rating (no self-grading). Quick flip-cards remain as a second option.

**Writing** is scored straight away: every text the learner writes (free prompts, guided level 4, exam mode) opens its
result page with the AI band already requested (the first time, the learner agrees to sending the text to the AI).

**Ngữ pháp & dịch câu** (`/grammar`, content in `content/grammar-drills.json`): 11 grammar points for band 4.5 → 5.5
(tenses, comparison, passive, relative clauses, conditionals, modals, linking words, describing trends). Each has a 2D
diagram, formula, examples and common mistakes, then 8 Vietnamese sentences to translate. Answers are compared word by
word with every accepted translation (contractions, case and punctuation don't matter); spelling slips are told apart from
grammar mistakes, and the learner can accept a correct translation that isn't listed. Best scores are kept in the browser.

## Tech stack

React 18 · TypeScript · Vite · Tailwind CSS · shadcn/ui · Lucide · React Router · TanStack Query ·
react-hook-form + Zod · Supabase (Postgres, Auth, Row Level Security) · Vitest.

## Run locally

### Prerequisites

- Node.js 20+ (tested with 22)
- Docker Desktop (or any Docker daemon) — for the local Supabase stack

### 1. Install

```bash
git clone https://github.com/<you>/linguaflow.git
```

```bash
cd linguaflow && npm install
```

### 2. Start a local Supabase

```bash
npm run db:start
```

The first run downloads the Supabase Docker images (a few minutes). It applies
`supabase/migrations/*` and `supabase/seed.sql` automatically, then prints the
**API URL** and the **Publishable key** (shown as `ANON_KEY` / `PUBLISHABLE_KEY`).

### 3. Configure the app

```bash
cp .env.example .env.local
```

Put the values printed in step 2 into `.env.local`:

```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<publishable or anon key>
```

If these are missing, the app shows a setup screen instead of crashing.

### 4. Run

```bash
npm run dev
```

Open <http://localhost:5173>, create an account and sign in. Local Supabase does not require
email confirmation.

### Useful scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on port 5173 |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm run build` | Production build into `dist/` |
| `npm run db:reset` | Recreate the local DB from migrations + seed (**deletes local data**) |
| `npm run seed:build` | Regenerate `supabase/seed.sql` from `content/lessons.json` |
| `npm run db:types` | Regenerate `src/types/database.ts` after changing the schema |
| `npm run db:stop` | Stop the local Supabase containers |

### Make yourself an admin

Admins get an **Admin** page (`/admin`): publish or hide lessons, approve or draft level-test questions (with how
often each one is answered correctly, flagged when it looks too easy or too hard for its level), switch writing
prompts on or off, and see AI feedback usage. Texts themselves are edited in `content/*.json` so every change is
reviewed in git. Promote an account with SQL:

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "update profiles set role = 'admin' where id = (select id from auth.users where email = 'you@example.com');"
```

## Deploy

Step-by-step guide in Vietnamese: **[docs/DEPLOY.md](docs/DEPLOY.md)**. Summary:

### 1. Supabase (cloud)

1. Create a project at <https://supabase.com> (free tier is enough).
2. Link and push the schema:

   ```bash
   npx supabase login
   ```

   ```bash
   npx supabase link --project-ref <your-project-ref>
   ```

   ```bash
   npx supabase db push
   ```

3. Load the reference data: open **SQL Editor** in the dashboard and run `supabase/seed.sql`.
4. **Authentication → URL Configuration**: set *Site URL* to your frontend URL and add
   `https://<your-domain>/**` to *Redirect URLs*.
5. **Project Settings → API**: copy the Project URL and the anon/publishable key.

### 2. Frontend (Vercel, Netlify, Cloudflare Pages…)

- Build command: `npm run build` · Output directory: `dist`
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Optional AI writing feedback: `npx supabase secrets set GEMINI_API_KEY=…` and `npx supabase functions deploy writing-feedback` ([guide](docs/DEPLOY.md)).
- Single-page routing is already configured: `vercel.json` (Vercel) and `public/_redirects` (Netlify/Cloudflare Pages).

The anon key is safe to expose in the browser: all data access is protected by Row Level Security.
Never put the `service_role` / secret key in frontend env vars.

## Project structure

```
src/
  app/          router, providers, layout (top menu)
  pages/        one component per route
  features/     auth, profile, dashboard, … (UI + data hooks per feature)
  lib/          framework-free logic (env, errors; later compare/, srs/, subtitles/)
  components/   shared UI + shadcn/ui primitives
  types/        generated Supabase types
supabase/
  migrations/   SQL schema (tables, RLS, views, RPCs)
  seed.sql      reference data (topics)
  tests/        SQL tests for RLS on plain Postgres
docs/           architecture & plan
```

## How answers are checked

Logic lives in `src/lib/compare/` (pure TypeScript, unit-tested):

- **English** — word by word, case-insensitive, punctuation optional (Settings). A changed word
  that is ≥ 75% similar (swapped letters count once) is a **spelling** slip; otherwise it's a
  **wrong word** (usually misheard). Also reports **missing** and **extra** words.
- **Chinese** — character by character; full-/half-width punctuation and spaces are normalised.
  A wrong character is classified by sound using context-aware Pinyin:
  same sound → **wrong character** (heard it, picked the wrong 汉字, e.g. 的/得, 气/汽);
  same syllable, other tone → **wrong tone** (买/卖); otherwise → **misheard**.
- **Hints** reveal the first unit you haven't got right: first a clue (first letter / Pinyin),
  then the word / character.
- Every Check, Show answer and Skip is saved to `dictation_attempts` with an error summary
  (and the confused pairs), which later feeds the strengths/weaknesses analysis.

Keyboard: `Enter` check / next (ignored while a Pinyin IME is composing), `Alt+R` replay,
`Alt+S` slow, `Alt+H` hint, `Alt+A` show answer, `Alt+←/→` previous / next sentence.

## Spaced review (M6)

Every saved word is a flashcard. Scheduling lives in `src/lib/srs/` (pure, unit-tested) and is saved
atomically through the `record_review` database function.

- **SM-2 (default)** — Again 10 min · Hard 1 d / ×1.2 · Good 1 d → 3 d → × ease · Easy 4 d / × ease × 1.3;
  ease starts at 2.5, never below 1.3; a card is *mastered* from 21 days.
- **Fixed intervals** — one wait per status, default New 1 · Learning 3 · Reviewing 7 · Mastered 30 days
  (same as the learner's Google Sheet), editable in Settings. Good moves one status up, Easy two, Hard
  stays, Again restarts.
- Daily queue = due cards (most overdue first) + new cards up to the daily limit (default 20).
  "Again" cards come back in the same session. Keys: Space, 1–4.

## Lesson content

Lessons live in **`content/lessons.json`** (12 demo lessons: 8 Chinese HSK 3–6, 4 English; 106
sentences with Vietnamese translations, written for this project and marked **Demo**).
To add or edit lessons:

```bash
npm run seed:build
```

```bash
npm run db:reset
```

`seed:build` validates the JSON and regenerates `supabase/seed.sql`. Level-test questions and grammar points live in
**`content/assessment.json`** (correct option first; the build shuffles them), writing prompts in
**`content/writing-tasks.json`**. The
official HSK list is in **`content/hsk-words.json`** (11,470 words, from
[complete-hsk-vocabulary](https://github.com/drkameleon/complete-hsk-vocabulary), MIT; regenerate with
`node scripts/import-hsk.mjs complete.json`), and IELTS word families in **`content/word-families.json`** (104 families, 410 forms, 208 example sentences with a Vietnamese
"why" for each); the build checks that every example answer is a member of its family. The seed is safe to run more
than once. Translations should be reviewed by a native speaker before production use.

### Voices

Speech uses the voices installed on the learner's device. Chrome/Edge on desktop include online
voices; Windows, macOS/iOS and Android can add Chinese/English voices in system settings. The app
picks the best Mandarin/English voice automatically, lets learners choose one in **Settings**, and
explains what to do when no voice is available.

## Testing

- `npm run e2e` — 14 browser suites (281 checks; suite 13 needs [Deno](https://deno.com) and is skipped without it) that drive the real app against the local Supabase,
  including database assertions. See [e2e/README.md](e2e/README.md).
- GitHub Actions (`.github/workflows/ci.yml`) on every push: lint, typecheck, unit tests, seed
  up-to-date check, build, and all migrations + seed applied to a clean Postgres.

- `npm test` — unit tests (validation, filters, voice selection, Pinyin).
- `supabase/tests/` — SQL checks that each user can only see and change their own data.
  Run on a plain Postgres: load `00_supabase_stub.sql`, then every file in `supabase/migrations/`,
  then `01_rls_test.sql`.
