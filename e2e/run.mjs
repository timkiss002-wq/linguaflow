// Runs every browser test against the local app.
// Needs: `npm run db:start` (local Supabase) and `npm run dev` (http://localhost:5173) in other terminals.
// Usage: npm run e2e            (all suites)
//        npm run e2e -- 04 06   (only suites whose file name contains 04 or 06)
import { execSync, spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const shots = join(here, '.shots');
mkdirSync(shots, { recursive: true });

const env = execSync('npx supabase status -o env', { encoding: 'utf8' });
const serviceKey = /SERVICE_ROLE_KEY="([^"]+)"/.exec(env)?.[1] ?? '';

const only = process.argv.slice(2);
const suites = readdirSync(here)
  .filter((f) => /^\d.*\.cjs$/.test(f))
  .filter((f) => !only.length || only.some((o) => f.includes(o)))
  .sort();

let failed = 0;
for (const suite of suites) {
  const r = spawnSync('node', [join(here, suite), shots, serviceKey], { encoding: 'utf8' });
  const out = (r.stdout ?? '') + (r.stderr ?? '');
  const pass = (out.match(/^PASS/gm) ?? []).length;
  const fail = out.split('\n').filter((l) => /^(FAIL|CRASH)/.test(l));
  const skip = out.split('\n').find((l) => l.startsWith('SKIP'));
  if (skip) {
    console.log(`- ${suite}: skipped (${skip.slice(4).trim()})`);
    continue;
  }
  failed += fail.length + (r.status && !fail.length ? 1 : 0);
  console.log(`${fail.length || r.status ? '✗' : '✓'} ${suite}: ${pass} passed${fail.length ? `, ${fail.length} failed` : ''}`);
  for (const l of fail) console.log(`    ${l}`);
}
console.log(failed ? `\n${failed} problem(s). Screenshots: ${shots}` : `\nAll suites passed. Screenshots: ${shots}`);
process.exit(failed ? 1 : 0);
