// Run via `npm run e2e` (see e2e/README.md). Args: <screenshots dir> [service role key]
// Runs the real writing-feedback Edge Function with Deno against the local Supabase, and a fake Gemini API
// (no key or quota needed). Needs Deno: `npm i -g deno` or https://deno.com — or set DENO_BIN. Skipped without it.
const { chromium } = require('playwright');
const { execSync, spawn, spawnSync } = require('child_process');
const http = require('http');
const path = require('path');
const SHOTS = process.argv[2];
const SERVICE_KEY = process.argv[3];
const BASE = 'http://localhost:5173';
const DB = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const FN_PORT = 8000;
const MOCK_PORT = 54330;
const sql = (q) => execSync(`psql ${DB} -tAc "${q.replace(/"/g, '\\"')}"`).toString().trim();
const email = `p6_${Date.now()}@example.com`;
const results = [];
const check = (name, cond, extra = '') => results.push(`${cond ? 'PASS' : 'FAIL'}  ${name} ${extra}`);

const DENO = process.env.DENO_BIN || 'deno';
if (spawnSync(DENO, ['--version']).status !== 0) {
  console.log('SKIP  Deno not found — install it (npm i -g deno) or set DENO_BIN to run this suite');
  process.exit(0);
}
const ANON_KEY = /ANON_KEY="([^"]+)"/.exec(execSync('npx supabase status -o env', { encoding: 'utf8' }))[1];

// ── fake Gemini ──
let mode = 'ok';
const calls = [];
const FEEDBACK = {
  criteria: [
    { key: 'task', score: 5, comment_vi: 'Trả lời đúng đề nhưng còn ngắn.' },
    { key: 'coherence', score: 5.5, comment_vi: 'Ý sắp xếp hợp lý.' },
    { key: 'lexical', score: 6, comment_vi: 'Từ vựng đủ dùng.' },
    { key: 'grammar', score: 4.5, comment_vi: 'Sai hoà hợp chủ ngữ – động từ.' },
  ],
  corrections: [
    { original: 'My brother go to school', corrected: 'My brother goes to school', category: 'agreement', explanation_vi: 'Chủ ngữ số ít (my brother) → động từ thêm -es.' },
    { original: 'I likes music', corrected: 'I like music', category: 'agreement', explanation_vi: 'Sau I dùng động từ nguyên mẫu.' },
    { original: 'This sentence was never written', corrected: 'x', category: 'tense', explanation_vi: 'Bịa ra — phải bị loại.' },
  ],
  summary_vi: 'Bài viết rõ ý nhưng cần chú ý chia động từ.',
  strengths_vi: ['Câu ngắn, dễ hiểu'],
  priorities_vi: ['Chia động từ theo chủ ngữ'],
  rewrite: 'My brother goes to school every day. I like music and football.',
};
const mock = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    calls.push({ url: req.url, key: req.headers['x-goog-api-key'], body: JSON.parse(body || '{}') });
    if (mode === 'fail') return res.writeHead(500).end('{"error":"boom"}');
    const text = mode === 'garbage' ? 'Sorry, here is some text instead of JSON' : JSON.stringify(FEEDBACK);
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }] }));
  });
});

// ── the Edge Function, served by Deno ──
let fn;
const startFunction = (withKey) =>
  new Promise((resolve, reject) => {
    fn = spawn(DENO, ['run', '--allow-net', '--allow-env', path.join(__dirname, '../supabase/functions/writing-feedback/index.ts')], {
      env: {
        ...process.env,
        SUPABASE_URL: 'http://127.0.0.1:54321',
        SUPABASE_ANON_KEY: ANON_KEY,
        SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
        GEMINI_API_KEY: withKey ? 'test-key' : '',
        GEMINI_BASE_URL: `http://127.0.0.1:${MOCK_PORT}`,
        WRITING_FEEDBACK_DAILY_LIMIT: '2',
        NO_COLOR: '1',
      },
    });
    const t = setTimeout(() => reject(new Error('Deno function did not start')), 60000);
    fn.stdout.on('data', (d) => d.toString().includes('Listening') && (clearTimeout(t), resolve()));
    fn.stderr.on('data', (d) => d.toString().includes('Listening') && (clearTimeout(t), resolve()));
  });
const stopFunction = () => new Promise((r) => (fn.once('exit', r), fn.kill()));

(async () => {
  await new Promise((r) => mock.listen(MOCK_PORT, '127.0.0.1', r));
  await startFunction(false);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  // the app calls <supabase>/functions/v1/…; send it to the Deno server
  await ctx.route('**/functions/v1/writing-feedback', async (route) => route.fulfill({ response: await route.fetch({ url: `http://127.0.0.1:${FN_PORT}/` }) }));
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errors.push(m.text()); });
  page.on('response', (r) => { if (r.status() >= 400 && r.url().includes('54321') && !r.url().includes('/functions/')) errors.push(r.status() + ' ' + r.url()); });

  await page.goto(BASE + '/register');
  await page.getByLabel('Display name').fill('Critic');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('listen123');
  await page.getByLabel('Confirm password').fill('listen123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL(/onboarding/);
  const uid = sql(`select id from auth.users where email='${email}'`);

  const TEXT = 'My brother go to school every day. I likes music and football. On weekends I usually play with my family and we cook dinner together.';
  const writeText = async () => {
    await page.goto(BASE + '/writing/new/en-w-intro');
    await page.getByLabel('Your text').fill(TEXT);
    await page.getByRole('button', { name: 'Analyse my text' }).click();
    await page.waitForURL(/\/writing\/[0-9a-f-]{36}$/);
    await page.getByTestId('ai-feedback').waitFor();
    return page.url().split('/').pop();
  };
  const card = page.getByTestId('ai-feedback');

  // ── consent first; server without a key says so ──
  const t1 = await writeText();
  await card.getByRole('button', { name: 'Get AI feedback' }).click();
  await page.getByRole('dialog').getByText('Google Gemini').first().waitFor();
  check('asks for consent before the first use', await page.getByRole('dialog').getByText("don't include personal information").isVisible());
  await page.getByRole('button', { name: 'Agree and continue' }).click();
  await card.getByTestId('ai-error').waitFor();
  check('consent saved in settings', sql(`select settings->>'aiFeedback' from profiles where id='${uid}'`) === 'true');
  check('no key on the server → clear message', (await card.getByTestId('ai-error').getAttribute('data-code')) === 'not_configured');

  // ── with a key ──
  await stopFunction();
  await startFunction(true);
  await card.getByRole('button', { name: 'Get AI feedback' }).click();
  await card.getByTestId('ai-overall').waitFor({ timeout: 20000 });
  check('no second consent dialog', (await page.getByRole('dialog').count()) === 0);
  check('overall band computed from the criteria', (await card.getByTestId('ai-overall').textContent()).includes('5.5 / 9'), await card.getByTestId('ai-overall').textContent());
  check('4 IELTS criteria with Vietnamese comments', (await card.getByTestId('ai-criteria').locator('li').count()) === 4 && (await card.getByTestId('ai-criteria').textContent()).includes('Sai hoà hợp'));
  const corr = await card.getByTestId('ai-corrections').locator('li').allTextContents();
  check('corrections: only quotes from the text are kept', corr.length === 2 && corr[0].includes('Subject–verb agreement') && corr[0].includes('My brother goes to school'), corr.join(' | '));
  check('improved version', (await card.getByTestId('ai-rewrite').textContent()).startsWith('My brother goes'));
  const call = calls[0];
  check('Gemini gets the key in a header, the text fenced, JSON mode', call.key === 'test-key' && call.url.includes(':generateContent') && call.body.contents[0].parts[0].text.includes(`<learner_text>\n${TEXT}\n</learner_text>`) && call.body.generationConfig.responseMimeType === 'application/json');
  check('feedback stored by the server', sql(`select model || ':' || jsonb_array_length(feedback->'corrections') from writing_feedback where submission_id='${t1}'`) === 'gemini-2.5-flash:2');
  await page.screenshot({ path: `${SHOTS}/p6-01-feedback.png`, fullPage: true });

  await page.reload();
  await card.getByTestId('ai-overall').waitFor();
  check('reload shows stored feedback without calling the AI again', calls.length === 1 && (await card.getByRole('button', { name: 'Get AI feedback' }).count()) === 0);

  // ── bad AI answer, then retry ──
  const t2 = await writeText();
  mode = 'garbage';
  await card.getByRole('button', { name: 'Get AI feedback' }).click();
  await card.getByTestId('ai-error').waitFor();
  check('unusable AI answer → error, nothing stored', (await card.getByTestId('ai-error').getAttribute('data-code')) === 'ai_invalid' && sql(`select count(*) from writing_feedback where submission_id='${t2}'`) === '0');
  mode = 'ok';
  await card.getByRole('button', { name: 'Get AI feedback' }).click();
  await card.getByTestId('ai-overall').waitFor({ timeout: 20000 });
  check('retry works', true);

  // ── daily limit (2 in this test) ──
  await writeText();
  await card.getByRole('button', { name: 'Get AI feedback' }).click();
  await card.getByTestId('ai-error').waitFor();
  check('daily limit per learner', (await card.getByTestId('ai-error').getAttribute('data-code')) === 'limit');

  // ── learners cannot forge feedback ──
  let forged = 'allowed';
  try {
    execSync(`psql ${DB} -v ON_ERROR_STOP=1 -tAc "begin; set local role authenticated; select set_config('request.jwt.claims', '{\\"sub\\":\\"${uid}\\"}', true); insert into writing_feedback (submission_id, user_id, model, feedback) values ('${t2}', '${uid}', 'fake', '{}'); commit;"`, { stdio: 'pipe' });
  } catch (e) {
    forged = String(e.stderr);
  }
  check('learners cannot write feedback themselves', forged.includes('row-level security'), forged.slice(0, 80));

  // ── repeated error types reach Strengths & Weaknesses ──
  await page.goto(BASE + '/insights');
  await page.locator('[data-insight="writing-en-agreement"]').waitFor({ timeout: 10000 }).then(() => check('repeated AI corrections → weakness on the insights page', true), () => check('repeated AI corrections → weakness on the insights page', false));

  // ── turn it off in Settings ──
  await page.goto(BASE + '/settings');
  await page.getByRole('switch', { name: /AI writing feedback/ }).click();
  await page.getByText('AI feedback off').waitFor();
  check('can be turned off', sql(`select settings->>'aiFeedback' from profiles where id='${uid}'`) === 'false');

  check('no console/page/API errors', errors.length === 0, errors.join(' | '));
  console.log(results.join('\n'));
  await browser.close();
})()
  .catch((e) => { console.log(results.join('\n')); console.error('CRASH', e.message.slice(0, 800)); process.exitCode = 1; })
  .finally(async () => { if (fn) await stopFunction(); mock.close(); });
