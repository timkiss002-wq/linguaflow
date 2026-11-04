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
| P6 | Next: AI feedback on writing — [design](docs/PERSONALIZATION.md) | Planned |

Sidebar sections that are not built yet show a **Soon** label and an explicit "Not available
yet" page — there are no fake features.

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

Admins can manage videos and transcripts (UI arrives in Phase 2). Promote an account with SQL:

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
- Single-page routing is already configured: `vercel.json` (Vercel) and `public/_redirects` (Netlify/Cloudflare Pages).

The anon key is safe to expose in the browser: all data access is protected by Row Level Security.
Never put the `service_role` / secret key in frontend env vars.

## Project structure

```
src/
  app/          router, providers, layout (sidebar)
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

- `npm run e2e` — 12 browser suites (249 checks) that drive the real app against the local Supabase,
  including database assertions. See [e2e/README.md](e2e/README.md).
- GitHub Actions (`.github/workflows/ci.yml`) on every push: lint, typecheck, unit tests, seed
  up-to-date check, build, and all migrations + seed applied to a clean Postgres.

- `npm test` — unit tests (validation, filters, voice selection, Pinyin).
- `supabase/tests/` — SQL checks that each user can only see and change their own data.
  Run on a plain Postgres: load `00_supabase_stub.sql`, then every file in `supabase/migrations/`,
  then `01_rls_test.sql`.
