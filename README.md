# LinguaFlow

> Learn languages through the videos you love.

LinguaFlow is a web app for learning **English** and **Chinese (Simplified, with Pinyin)** by
dictation: listen to one sentence from a real video, type what you hear, and see exactly what you
missed. Saved words are reviewed later as flashcards with spaced repetition.

Architecture, database design and the milestone plan: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

## Status

| Milestone | Scope | Status |
|---|---|---|
| M0 | Analysis, architecture, database schema + RLS | ✅ Done |
| M1 | Project setup, authentication, app layout, settings, basic dashboard | ✅ Done |
| M2 | Video library + video detail | Next |
| M3 | Player engine (YouTube + HTML5, segment playback) | Planned |
| M4 | Dictation Room + answer checking | Planned |
| M5 | Vocabulary notebook | Planned |
| M6 | SRS flashcard review | Planned |
| M7 | Full dashboard, landing polish, deployment | Planned |

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
| `npm run db:types` | Regenerate `src/types/database.ts` after changing the schema |
| `npm run db:stop` | Stop the local Supabase containers |

### Make yourself an admin

Admins can manage videos and transcripts (UI arrives in Phase 2). Promote an account with SQL:

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "update profiles set role = 'admin' where id = (select id from auth.users where email = 'you@example.com');"
```

## Deploy

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

## Content & copyright

LinguaFlow never downloads, cuts or re-hosts videos. YouTube videos are played through the
official IFrame Player; if the owner disables embedding, the app says so and links to YouTube.
Transcripts are entered by admins or imported from SRT/VTT files they are allowed to use.

## Testing

- `npm test` — unit tests for validation, env and settings parsing.
- `supabase/tests/` — SQL checks that each user can only see and change their own data.
  Run against a local Supabase: `psql <DB_URL> -f supabase/tests/01_rls_test.sql`
  (the stub file is only needed on plain Postgres).
