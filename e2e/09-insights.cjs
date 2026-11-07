// Run via `npm run e2e` (see e2e/README.md). Args: <screenshots dir> [service role key]
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const SHOTS = process.argv[2];
const BASE = 'http://localhost:5173';
const DB = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const sql = (q) => execSync(`psql ${DB} -tAc "${q.replace(/"/g, '\\"')}"`).toString().trim();
const email = `p2_${Date.now()}@example.com`;
const results = [];
const check = (name, cond, extra = '') => results.push(`${cond ? 'PASS' : 'FAIL'}  ${name} ${extra}`);
const FAKE_TTS = () => {
  window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
  Object.defineProperty(window, 'speechSynthesis', { value: { paused: false, getVoices: () => [{ name: 'E', lang: 'en-US', localService: true }, { name: 'Z', lang: 'zh-CN', localService: true }], addEventListener() {}, removeEventListener() {}, resume() {}, speak(u) { setTimeout(() => u.onend && u.onend(), 30); }, cancel() {} } });
};
const ZH = 'b0000000-0000-4000-8000-000000000301';
const EN = 'b0000000-0000-4000-8000-000000000e03';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(FAKE_TTS);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errors.push(m.text()); });
  page.on('response', (r) => { if (r.status() >= 400 && r.url().includes('54321')) errors.push(r.status() + ' ' + r.url()); });

  await page.goto(BASE + '/register');
  await page.getByLabel('Display name').fill('Insight');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('listen123');
  await page.getByLabel('Confirm password').fill('listen123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL(/onboarding/);
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page.waitForURL(/dashboard/);
  const uid = sql(`select id from auth.users where email='${email}'`);

  // ── empty state ──
  await page.getByRole('link', { name: /^Tiến độ/ }).first().click();
  await page.getByRole('button', { name: 'Các trang trong Tiến độ' }).click();
  await page.getByRole('menuitem', { name: 'Điểm mạnh & yếu' }).click();
  await page.getByText('Not enough answers yet').waitFor();
  check('empty state shows how much evidence is needed', (await page.getByTestId('insight-progress').textContent()).includes('0 / 10'));

  // ── real dictation: same-sound character + missed particle ──
  await page.goto(BASE + `/lessons/${ZH}/practice?s=3`);
  const box = page.getByLabel('Type what you hear');
  await box.fill('天汽好的话我们可以一起去公园走走');
  await box.press('Enter');
  await page.getByText(/wrong character/).first().waitFor();
  await box.fill('天汽好的话，我们可以一起去公园走走');
  await box.press('Enter'); // the same slip twice → a pattern
  await page.waitForTimeout(400);
  await page.goto(BASE + `/lessons/${ZH}/practice?s=1`);
  await page.getByLabel('Type what you hear').fill('这个周末你打算做什');
  await page.getByLabel('Type what you hear').press('Enter');
  await page.getByText(/keep going|missing/).first().waitFor();
  await page.waitForTimeout(500);
  const summ = sql(`select string_agg(error_summary::text, ' ' order by created_at) from dictation_attempts where user_id='${uid}'`);
  check('attempts record confusions + missed', summ.includes('["气", "汽"]') && summ.includes('"missed": ["么"]'), summ);

  // ── more history (inserted): weak zh tones in the evening, strong en in the morning, a leech ──
  const tz = sql(`select timezone from profiles where id='${uid}'`);
  const zhSent = sql(`select id from lesson_sentences where lesson_id='${ZH}' order by position limit 1 offset 1`);
  const enSent = sql(`select id from lesson_sentences where lesson_id='${EN}' order by position limit 1`);
  sql(`insert into dictation_attempts (user_id, sentence_id, user_input, accuracy, is_correct, error_summary, created_at)
       select '${uid}', '${zhSent}', 'x', 60, false, jsonb_build_object('tone', 1, 'confusions', jsonb_build_array(jsonb_build_array('买', '卖'))), ((current_date - 1) + time '20:00') at time zone '${tz}' from generate_series(1, 10)`);
  sql(`insert into dictation_attempts (user_id, sentence_id, user_input, accuracy, is_correct, error_summary, created_at)
       select '${uid}', '${enSent}', 'x', 96, false, '{}'::jsonb, ((current_date - 1) + time '08:00') at time zone '${tz}' from generate_series(1, 10)`);
  sql(`insert into study_sessions (user_id, kind, language, started_at, active_seconds) values ('${uid}','dictation','en', ((current_date - 1) + time '08:00') at time zone '${tz}', 1200), ('${uid}','dictation','zh', ((current_date - 1) + time '20:00') at time zone '${tz}', 600)`);
  const leech = sql(`insert into vocabulary (user_id, language, term, meaning_vi, lapses) values ('${uid}', 'en', 'commute', 'đi làm', 3) returning id`).split('\n')[0];

  await page.goto(BASE + '/insights');
  await page.getByTestId('weaknesses').waitFor();
  const weak = await page.getByTestId('weaknesses').locator('[data-insight]').evaluateAll((els) => els.map((e) => e.getAttribute('data-insight')));
  check('weaknesses: tones, zh level, same-sound, leeches', ['zh-tones', 'zh-accuracy', 'zh-same-sound', 'leeches'].every((id) => weak.includes(id)), weak.join(','));
  const tones = await page.locator('[data-insight="zh-tones"]').textContent();
  check('tone insight shows evidence + examples', tones.includes('tone 3 → 4') && tones.includes('买→卖') && /Based on: 10 of 12 wrong characters/.test(tones), tones);
  const strong = await page.getByTestId('strengths').locator('[data-insight]').evaluateAll((els) => els.map((e) => e.getAttribute('data-insight')));
  check('strength: English listening', strong.includes('en-accuracy'), strong.join(','));
  // the 3 real dictation answers above also count in whatever part of the day the suite runs, so match loosely
  check('habits: best time of day', /You're most accurate in the morning \(\d+(\.\d+)?% vs \d+(\.\d+)?% in the evening\)/.test(await page.getByTestId('habits').textContent()));
  await page.screenshot({ path: `${SHOTS}/p2-01-insights.png`, fullPage: true });

  // ── same-sound drill ──
  await page.locator('[data-insight="zh-same-sound"]').getByRole('link', { name: 'Practise these pairs' }).click();
  const drill = page.getByTestId('drill');
  check('drill: cloze from the original sentence', (await drill.getByTestId('drill-sentence').textContent()).startsWith('天') && (await drill.getByTestId('drill-sentence').textContent()).includes('好的话'));
  await drill.getByRole('button', { name: 'Choose 汽' }).click();
  check('drill: wrong choice explained', await drill.getByText("It's 气").isVisible());
  await drill.getByRole('button', { name: 'Finish' }).click();
  check('drill: score', (await drill.getByTestId('drill-score').textContent()).includes('0 / 1'));
  await drill.getByRole('button', { name: 'Again' }).click();
  await drill.getByRole('button', { name: 'Choose 气' }).click();
  check('drill: right choice', await drill.getByText('Correct', { exact: true }).isVisible());

  // ── leech action ──
  await page.locator('[data-insight="leeches"]').getByRole('link', { name: 'Practise typing them' }).click();
  await page.waitForURL(/vocabulary\/practice/);
  check('leech action opens typing practice for those words', page.url().includes(`ids=${leech}`));

  // ── habit consent ──
  sql(`insert into learner_profiles (user_id, habit_analysis) values ('${uid}', false) on conflict (user_id) do update set habit_analysis = false`);
  await page.goto(BASE + '/insights');
  await page.getByTestId('habits').waitFor();
  check('habit analysis off → no habit conclusions', (await page.getByTestId('habits').textContent()).includes('Habit analysis is off') && !(await page.locator('[data-insight^="habit"]').count()));

  const m = await (await browser.newContext({ viewport: { width: 390, height: 844 }, storageState: await ctx.storageState() })).newPage();
  await m.goto(BASE + '/insights');
  await m.getByTestId('weaknesses').waitFor();
  check('mobile: no horizontal scroll', !(await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));
  await m.screenshot({ path: `${SHOTS}/p2-02-mobile.png`, fullPage: true });

  check('no console/page/API errors', errors.length === 0, errors.join(' | '));
  console.log(results.join('\n'));
  await browser.close();
})().catch((e) => { console.log(results.join('\n')); console.error('CRASH', e.message.slice(0, 800)); process.exit(1); });
