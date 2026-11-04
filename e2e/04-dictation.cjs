// Run via `npm run e2e` (see e2e/README.md). Args: <screenshots dir> [service role key]
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const SHOTS = process.argv[2];
const BASE = 'http://localhost:5173';
const DB = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const sql = (q) => execSync(`psql ${DB} -tAc "${q.replace(/"/g, '\\"')}"`).toString().trim();
const email = `m4_${Date.now()}@example.com`;
const results = [];
const check = (name, cond, extra = '') => results.push(`${cond ? 'PASS' : 'FAIL'}  ${name} ${extra}`);
const ZH1 = 'b0000000-0000-4000-8000-000000000301';
const EN2 = 'b0000000-0000-4000-8000-000000000e02';

const FAKE_TTS = () => {
  const voices = [
    { name: 'Google US English', lang: 'en-US', localService: false, default: true, voiceURI: 'e' },
    { name: 'Google 普通话（中国大陆）', lang: 'zh-CN', localService: false, default: false, voiceURI: 'g' },
  ];
  window.__spoken = [];
  let current = null;
  window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
  Object.defineProperty(window, 'speechSynthesis', {
    value: {
      paused: false,
      getVoices: () => voices,
      addEventListener() {}, removeEventListener() {}, resume() {},
      speak(u) {
        current = u;
        window.__spoken.push({ text: u.text, rate: u.rate });
        u._t = setTimeout(() => { if (current === u) { current = null; u.onend && u.onend(); } }, 200);
      },
      cancel() { if (current) { const u = current; current = null; clearTimeout(u._t); u.onerror && u.onerror({ error: 'interrupted' }); } },
    },
  });
};

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(FAKE_TTS);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errors.push(m.text()); });
  page.on('response', (r) => { if (r.status() >= 400 && r.url().includes('54321')) errors.push(r.status() + ' ' + r.url()); });
  const spoken = () => page.evaluate(() => window.__spoken);
  const box = page.getByLabel('Type what you hear');

  await page.goto(BASE + '/register');
  await page.getByLabel('Display name').fill('Lan');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('listen123');
  await page.getByLabel('Confirm password').fill('listen123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL(/dashboard/);
  const uid = sql(`select id from auth.users where email='${email}'`);

  // ── Chinese lesson ──
  await page.goto(BASE + '/lessons/' + ZH1);
  await page.getByRole('link', { name: 'Start dictation' }).click();
  await page.waitForURL(/practice/);
  await page.getByRole('heading', { name: /Sentence 1/ }).waitFor();
  check('dictation opens at sentence 1/10', await page.getByText('0 / 10 done').isVisible());
  check('no autoplay before interaction', (await spoken()).length === 0);

  await page.getByRole('button', { name: 'Play sentence' }).click();
  await page.waitForTimeout(300);
  check('play speaks sentence 1', (await spoken())[0]?.text === '这个周末你打算做什么？');
  await page.getByRole('button', { name: 'Slow' }).click();
  await page.waitForTimeout(300);
  check('slow replay at 0.6x', (await spoken()).at(-1).rate === 0.6);

  await box.fill('这个周未你打算做什么');
  await page.getByRole('button', { name: 'Check' }).click();
  await page.getByText(/% correct — keep going/).waitFor();
  const diffText = await page.getByTestId('diff').textContent();
  check('wrong char flagged as misheard', (await page.locator('[data-kind="misheard"]').count()) === 1 && (await page.getByText('1 misheard').isVisible()));
  check('answer not revealed after check', !diffText.includes('末'), diffText);
  await page.screenshot({ path: `${SHOTS}/m4-01-check-wrong.png` });

  await page.getByRole('button', { name: 'Hint' }).click();
  check('hint 1 gives pinyin', await page.getByText('mò', { exact: true }).isVisible());
  await page.getByRole('button', { name: 'Hint' }).click();
  check('hint 2 gives character', await page.getByRole('status').getByText('末', { exact: true }).isVisible());

  // IME guard: Enter while composing must not check
  await box.fill('这个周末你打算做什么');
  await box.evaluate((el) => el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, isComposing: true })));
  await page.waitForTimeout(400);
  check('Enter during IME composition does nothing', !(await page.getByText('Correct!').isVisible()));
  await box.press('Enter');
  await page.getByText('Correct!').waitFor();
  check('correct answer: pinyin + translation shown', (await page.locator('rt', { hasText: 'zhōu' }).count()) >= 1 && (await page.getByText('Cuối tuần này bạn định làm gì?').isVisible()));
  await page.screenshot({ path: `${SHOTS}/m4-02-correct.png` });
  await page.waitForTimeout(500);
  const a1 = sql(`select string_agg(is_correct::text || '/' || hints_used || '/' || coalesce(error_summary->>'misheard','-') || '/' || coalesce(error_summary->'confusions'->0->>0,'-'), ',' order by created_at) from dictation_attempts where user_id='${uid}'`);
  check('attempts saved with error summary', a1 === 'false/0/1/末,true/2/-/-', a1);

  await box.press('Enter'); // next
  await page.getByRole('heading', { name: /Sentence 2/ }).waitFor();
  await page.waitForTimeout(300);
  check('auto-plays next sentence', (await spoken()).at(-1).text.startsWith('我想先去超市'));

  await page.getByRole('button', { name: 'Show answer' }).click();
  await page.getByText(/Answer shown/).waitFor();
  check('show answer reveals full sentence', await page.getByText('Mình muốn đi siêu thị mua ít đồ trước, sau đó về nhà nấu cơm.').isVisible());
  await page.screenshot({ path: `${SHOTS}/m4-03-revealed.png` });
  await page.getByRole('button', { name: /Next sentence/ }).click();
  await page.getByRole('heading', { name: /Sentence 3/ }).waitFor();
  await page.getByRole('button', { name: 'Skip' }).click();
  await page.getByRole('heading', { name: /Sentence 4/ }).waitFor();
  check('skip moves on', true);
  await page.keyboard.press('Alt+KeyR');
  await page.waitForTimeout(300);
  check('Alt+R replays current sentence', (await spoken()).at(-1).text === '听说新开的那家咖啡馆很不错。');

  await page.getByRole('button', { name: 'Sentence 10' }).click();
  await page.getByRole('heading', { name: /Sentence 10/ }).waitFor();
  await box.fill('好的，到时候我给你打电话。');
  await box.press('Enter');
  await page.getByText('Correct!').waitFor();
  await box.press('Enter'); // finish
  await page.getByRole('heading', { name: 'Session complete' }).waitFor();
  const cards = await page.locator('.grid > div').allTextContents();
  check('summary numbers', cards.some((t) => t.includes('50%') && t.includes('Accuracy')) && cards.some((t) => t.startsWith('2') && t.includes('Correct')) && cards.some((t) => t.startsWith('2') && t.includes('Incorrect')), cards.join(' | '));
  check('summary lists 3 sentences to retry', await page.getByRole('button', { name: 'Practise these 3 again' }).isVisible());
  await page.screenshot({ path: `${SHOTS}/m4-04-summary.png`, fullPage: true });
  await page.getByRole('button', { name: 'Practise these 3 again' }).click();
  await page.getByRole('heading', { name: /Sentence 1 \/ 3/ }).waitFor();
  check('retry round with 3 sentences', true);

  const db = sql(`select count(*) filter (where answer_revealed) || '/' || count(*) filter (where skipped) || '/' || count(*) from dictation_attempts where user_id='${uid}'`);
  check('revealed + skipped attempts saved', db === '1/1/5', db);
  const prog = sql(`select status || '/' || last_sentence_position from learning_progress where user_id='${uid}'`);
  check('progress saved (in progress, last position 10)', prog === 'in_progress/10', prog);

  await page.goto(BASE + '/lessons/' + ZH1);
  await page.getByRole('link', { name: 'Continue dictation' }).waitFor();
  check('lesson page shows 3/10 + Continue', await page.getByText('3 / 10').isVisible());
  await page.getByRole('link', { name: 'Continue dictation' }).click();
  await page.getByRole('heading', { name: /Sentence 3 \/ 10/ }).waitFor();
  check('resumes at first unfinished sentence (3)', true);

  // ── English lesson: complete it ──
  await page.goto(BASE + `/lessons/${EN2}/practice`);
  await page.getByRole('heading', { name: /Sentence 1 \/ 8/ }).waitFor();
  await box.fill('when we LANDED i realised my suitcase hadnt arrived');
  await page.getByRole('button', { name: 'Check' }).click();
  await page.getByText(/keep going/).waitFor();
  check('EN: missing apostrophe = 1 spelling', await page.getByText('1 spelling').isVisible());
  await box.fill("When we landed I realised my suitcase hadn't arrived");
  await page.getByRole('button', { name: 'Check' }).click();
  await page.getByText('Correct!').waitFor();
  check('EN: case & punctuation ignored', true);
  await page.screenshot({ path: `${SHOTS}/m4-05-english.png` });
  for (let i = 2; i <= 8; i++) {
    await page.getByRole('button', { name: /Next sentence|Finish/ }).click();
    await page.getByRole('heading', { name: new RegExp(`Sentence ${i} / 8`) }).waitFor();
    await page.getByRole('button', { name: 'Show answer' }).click();
    await page.getByText(/Answer shown/).waitFor();
  }
  await page.getByRole('button', { name: 'Finish' }).click();
  await page.getByRole('heading', { name: 'Session complete' }).waitFor();
  await page.waitForTimeout(800);
  check('lesson marked completed', sql(`select status from learning_progress where user_id='${uid}' and lesson_id='${EN2}'`) === 'completed');

  await page.goto(BASE + '/dashboard');
  await page.getByTestId('stat-tiles').waitFor();
  await page.waitForTimeout(1200);
  const dash = await page.getByTestId('stat-tiles').textContent();
  check('dashboard: streak 1 day + 1 completed', dash.includes('1 day') && /Lessons completed\s*1/.test(dash), dash.slice(0, 200));
  await page.waitForTimeout(500);
  const sess = sql(`select count(*) filter (where active_seconds > 0) || '/' || count(*) filter (where active_seconds = 0) from study_sessions where user_id='${uid}'`);
  check('study time recorded, no empty sessions left', /^[1-9]\d*\/0$/.test(sess), sess);

  const m = await (await browser.newContext({ viewport: { width: 390, height: 844 }, storageState: await ctx.storageState() })).newPage();
  await m.addInitScript(FAKE_TTS);
  await m.goto(BASE + `/lessons/${ZH1}/practice?s=5`);
  await m.getByRole('heading', { name: /Sentence 5/ }).waitFor();
  check('mobile: ?s=5 opens sentence 5, no horizontal scroll', !(await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));
  await m.screenshot({ path: `${SHOTS}/m4-06-mobile.png`, fullPage: true });

  check('no console/page/API errors', errors.length === 0, errors.join(' | '));
  console.log(results.join('\n'));
  await browser.close();
})().catch((e) => { console.log(results.join('\n')); console.error('CRASH', e.message.slice(0, 800)); process.exit(1); });
