# Browser tests

End-to-end checks that drive the real app in Chromium (Playwright) against the **local** Supabase:
register, practise, save words, review, statistics, password reset… Each suite also verifies what
was written to the database and fails on any console error.

Speech is replaced by a fake engine inside the page (headless Chromium has no voices), so the tests
check *what* would be spoken, in which voice, at which speed.

```bash
npm run db:start
```

```bash
npm run dev
```

```bash
npx playwright install chromium
```

```bash
npm run e2e
```

Only some suites: `npm run e2e -- 04 06`. Screenshots are written to `e2e/.shots/` (git-ignored).
The suites create throw-away accounts (`m3_…@example.com`); `npm run db:reset` removes them.

Suite 13 (AI writing feedback) runs the real `writing-feedback` Edge Function with **Deno** against the local
Supabase and a fake Gemini API, so no API key is needed. Install Deno (`npm i -g deno`) or point `DENO_BIN` at it;
without Deno the suite is skipped.
