// Run via `npm run e2e` (see e2e/README.md). Args: <screenshots dir> [service role key]
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const SHOTS = process.argv[2];
const BASE = 'http://localhost:5173';
const DB = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const sql = (q) => execSync(`psql ${DB} -tAc "${q.replace(/"/g, '\\"')}"`).toString().trim();
const email = `p4_${Date.now()}@example.com`;
const results = [];
const check = (name, cond, extra = '') => results.push(`${cond ? 'PASS' : 'FAIL'}  ${name} ${extra}`);
const FAKE_TTS = () => {
  window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
  Object.defineProperty(window, 'speechSynthesis', { value: { paused: false, getVoices: () => [{ name: 'E', lang: 'en-US', localService: true }, { name: 'Z', lang: 'zh-CN', localService: true }], addEventListener() {}, removeEventListener() {}, resume() {}, speak(u) { setTimeout(() => u.onend && u.onend(), 30); }, cancel() {} } });
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

  await page.goto(BASE + '/register');
  await page.getByLabel('Display name').fill('Planner');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('listen123');
  await page.getByLabel('Confirm password').fill('listen123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL(/onboarding/);
  const uid = sql(`select id from auth.users where email='${email}'`);
  // a Chinese learner, HSK 3 → 4, studies every day, 20 min a day, 10 new words saved
  sql(`insert into learning_goals (user_id, language, exam, current_level, target_level) values ('${uid}', 'zh', 'hsk2', '3', '4')`);
  sql(`insert into learner_profiles (user_id, study_days, onboarded_at) values ('${uid}', '{0,1,2,3,4,5,6}', now())`);
  sql(`update profiles set daily_goal_minutes = 20 where id = '${uid}'`);
  sql(`insert into vocabulary (user_id, language, term, meaning_vi) select '${uid}', 'zh', w, 'nghĩa' from unnest(array['超市','周末','打算','公园','咖啡','东西','回家','做饭','天气','一起']) w`);

  await page.goto(BASE + '/dashboard');
  const plan = page.getByTestId('today-plan');
  await plan.waitFor();
  const keys = await plan.locator('[data-plan-item]').evaluateAll((els) => els.map((e) => e.getAttribute('data-plan-item')));
  check('plan: review → placement test → lesson', keys.length === 3 && keys[0] === 'review' && keys[1] === 'test-zh' && keys[2].startsWith('lesson-'), keys.join(','));
  check('plan fits the 20-min goal', (await page.getByTestId('plan-summary').textContent()).includes('0 of 3 done · about 20 min'));
  const reasons = await plan.getByTestId('plan-reason').allTextContents();
  check('every item says why', reasons.length === 3 && reasons[0].includes('10 cards are due') && reasons[2].includes('One step above your level') && reasons[2].includes('HSK 3'), reasons.join(' | '));
  check('plan stored once for today', sql(`select count(*) || ':' || jsonb_array_length(items) from daily_plans where user_id='${uid}' group by items`) === '1:3');
  await page.screenshot({ path: `${SHOTS}/p4-01-plan.png`, fullPage: true });

  // ── reviews tick off automatically ──
  await plan.locator('[data-plan-item=review]').getByRole('link', { name: 'Start' }).click();
  await page.waitForURL(/review\?lang=zh/);
  await page.getByRole('button', { name: /Start review · 10 cards/ }).click();
  for (let i = 0; i < 10; i++) {
    await page.getByTestId('flashcard').waitFor();
    await page.keyboard.press('Space');
    await page.getByTestId('card-back').waitFor();
    await page.keyboard.press('3');
    await page.waitForTimeout(150);
  }
  await page.goto(BASE + '/dashboard');
  await plan.locator('[data-plan-item=review][data-state=done]').waitFor({ timeout: 8000 }).then(() => check('review item done after reviewing', true), () => check('review item done after reviewing', false));

  // ── lesson: 4 sentences of dictation ──
  const lessonKey = keys[2];
  const lessonId = lessonKey.replace('lesson-', '');
  const sentences = sql(`select string_agg(text, '|' order by position) from lesson_sentences where lesson_id='${lessonId}'`).split('|');
  await plan.locator(`[data-plan-item="${lessonKey}"]`).getByRole('link', { name: 'Start' }).click();
  await page.waitForURL(/practice/);
  const box = page.getByLabel('Type what you hear');
  for (let i = 0; i < 2; i++) {
    await box.fill(sentences[i].replace(/[，。？！、,.?!]/g, ''));
    await box.press('Enter');
    await page.getByText('Correct!').waitFor();
    await box.press('Enter');
    await page.getByRole('heading', { name: new RegExp(`Sentence ${i + 2}`) }).waitFor();
  }
  await page.goto(BASE + '/dashboard');
  await plan.locator(`[data-plan-item="${lessonKey}"]`).waitFor();
  check('lesson progress shows half done', (await plan.locator(`[data-plan-item="${lessonKey}"]`).getAttribute('data-state')) === 'todo' && (await plan.locator(`[data-plan-item="${lessonKey}"] [role=progressbar]`).count()) === 1);

  // ── skip / undo ──
  await plan.getByRole('button', { name: /Skip: Chinese placement test/ }).click();
  await plan.locator('[data-plan-item=test-zh][data-state=skipped]').waitFor();
  check('skip is saved', sql(`select status->>'test-zh' from daily_plans where user_id='${uid}'`) === 'skipped');
  await plan.locator('[data-plan-item=test-zh]').getByRole('button', { name: 'Undo' }).click();
  await plan.locator('[data-plan-item=test-zh][data-state=todo]').waitFor();
  check('undo clears it', sql(`select coalesce(status->>'test-zh', 'none') from daily_plans where user_id='${uid}'`) === 'none');

  // ── often-skipped lessons + short sessions change the plan (after Rebuild) ──
  for (const d of [1, 2, 3]) {
    sql(`insert into daily_plans (user_id, day, items, status) values ('${uid}', current_date - ${d}, '[{\"key\":\"lesson-x\",\"kind\":\"lesson\"}]', '{\"lesson-x\":\"skipped\"}')`);
  }
  await plan.getByRole('button', { name: 'Rebuild' }).click();
  await page.getByTestId('plan-notes').getByText(/often skip the lesson/).waitFor({ timeout: 8000 }).then(() => check('often-skipped lesson → note after rebuild', true), () => check('often-skipped lesson → note after rebuild', false));
  check('rebuilt plan keeps done reviews done', (await plan.locator('[data-plan-item=review]').count()) === 0 || (await plan.locator('[data-plan-item=review]').getAttribute('data-state')) === 'done');

  // ── rest day ──
  sql(`update learner_profiles set study_days = array_remove('{0,1,2,3,4,5,6}'::smallint[], extract(dow from (now() at time zone (select timezone from profiles where id='${uid}')))::smallint) where user_id='${uid}'`);
  await plan.getByRole('button', { name: 'Rebuild' }).click();
  await plan.getByText('Rest day', { exact: true }).waitFor({ timeout: 8000 }).then(() => check('rest day: light plan', true), () => check('rest day: light plan', false));
  check('rest day: no lesson or test', (await plan.locator('[data-plan-item^=lesson], [data-plan-item^=test]').count()) === 0);

  // ── dictation keeps the listening level up to date (after a level test) ──
  sql(`insert into user_skill_ratings (user_id, language, skill, rating) values ('${uid}', 'zh', 'listening', 1100)`);
  const s4 = sql(`select ls.id from lesson_sentences ls join lessons l on l.id = ls.lesson_id where l.hsk_level = 4 limit 1`);
  sql(`insert into dictation_attempts (user_id, sentence_id, user_input, accuracy, is_correct) values ('${uid}', '${s4}', 'x', 100, true)`);
  const r1 = Number(sql(`select rating from user_skill_ratings where user_id='${uid}' and skill='listening'`));
  sql(`insert into dictation_attempts (user_id, sentence_id, user_input, accuracy, is_correct, answer_revealed) values ('${uid}', '${s4}', 'x', 100, true, true)`);
  const r2 = Number(sql(`select rating from user_skill_ratings where user_id='${uid}' and skill='listening'`));
  check('right HSK 4 sentence raises listening rating; revealed answers do not', r1 > 1100 && r1 < 1110 && r2 === r1, `${r1} ${r2}`);

  const m = await (await browser.newContext({ viewport: { width: 390, height: 844 }, storageState: await ctx.storageState() })).newPage();
  await m.addInitScript(FAKE_TTS);
  await m.goto(BASE + '/dashboard');
  await m.getByTestId('today-plan').waitFor();
  check('mobile: no horizontal scroll', !(await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));
  await m.screenshot({ path: `${SHOTS}/p4-02-mobile.png`, fullPage: true });

  check('no console/page/API errors', errors.length === 0, errors.join(' | '));
  console.log(results.join('\n'));
  await browser.close();
})().catch((e) => { console.log(results.join('\n')); console.error('CRASH', e.message.slice(0, 800)); process.exit(1); });
