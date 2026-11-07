// Run via `npm run e2e` (see e2e/README.md). Args: <screenshots dir> [service role key]
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const SHOTS = process.argv[2];
const BASE = 'http://localhost:5173';
const DB = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const sql = (q) => execSync(`psql ${DB} -tAc "${q.replace(/"/g, '\\"')}"`).toString().trim();
const email = `p3_${Date.now()}@example.com`;
const results = [];
const check = (name, cond, extra = '') => results.push(`${cond ? 'PASS' : 'FAIL'}  ${name} ${extra}`);
const FAKE_TTS = () => {
  window.__spoken = [];
  window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
  Object.defineProperty(window, 'speechSynthesis', { value: { paused: false, getVoices: () => [{ name: 'E', lang: 'en-US', localService: true }, { name: 'Z', lang: 'zh-CN', localService: true }], addEventListener() {}, removeEventListener() {}, resume() {}, speak(u) { window.__spoken.push(u.text); setTimeout(() => u.onend && u.onend(), 30); }, cancel() {} } });
};
/** Run SQL as a signed-in learner (RLS applies). */
const asUser = (uid, q) => sql(`begin; set local role authenticated; select set_config('request.jwt.claims', '{"sub":"${uid}","role":"authenticated"}', true); ${q}; commit;`).split('\n').filter((l) => l && l !== 'BEGIN' && l !== 'SET' && l !== 'COMMIT' && !l.includes('"sub"')).pop();

let browserRef;
(async () => {
  const browser = await chromium.launch();
  browserRef = browser;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(FAKE_TTS);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errors.push(m.text()); });
  page.on('response', (r) => { if (r.status() >= 400 && r.url().includes('54321')) errors.push(r.status() + ' ' + r.url()); });

  await page.goto(BASE + '/register');
  await page.getByLabel('Display name').fill('Level');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('listen123');
  await page.getByLabel('Confirm password').fill('listen123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL(/onboarding/);
  const uid = sql(`select id from auth.users where email='${email}'`);
  sql(`insert into learning_goals (user_id, language, exam, current_level, target_level) values ('${uid}', 'zh', 'hsk2', '3', '4')`);

  check('learners cannot read the question bank (answers)', asUser(uid, 'select count(*) from assessment_items') === '0');

  await page.goto(BASE + '/dashboard');
  await page.locator('[data-plan-item=test-zh]').getByRole('link', { name: 'Bắt đầu' }).click();
  await page.waitForURL(/\/level-test$/);
  await page.getByTestId('level-zh').waitFor();
  check('hub shows only the learner\'s language', (await page.getByTestId('level-zh').count()) === 1 && (await page.getByTestId('level-en').count()) === 0);
  await page.getByRole('button', { name: 'Start placement test' }).click();
  await page.waitForURL(/\/level-test\/[0-9a-f-]{36}$/);
  const testId = page.url().split('/').pop();

  /** Answer the current question: right for everything except grammar ("I don't know"). */
  const next = async () => {
    await page.getByRole('button', { name: 'Next question' }).click();
    await page.locator('[data-item] [role=status]').waitFor({ state: 'detached' });
  };
  const answerCurrent = async () => {
    const card = page.locator('[data-item]');
    await card.waitFor();
    const id = await card.getAttribute('data-item');
    const [skill, kind, options, answer] = sql(`select skill || '|' || kind || '|' || options::text || '|' || answer::text from assessment_items where id='${id}'`).split('|');
    if (skill === 'grammar') {
      await card.getByRole('button', { name: "I don't know" }).click();
    } else if (kind === 'choice') {
      await card.getByRole('group', { name: 'Answers' }).getByRole('button').nth(Number(answer)).click();
    } else {
      const tokens = JSON.parse(options);
      let rest = JSON.parse(answer)[0];
      while (rest.length) {
        const t = tokens.find((x) => rest.startsWith(x));
        await card.getByRole('group', { name: 'Words' }).getByRole('button', { name: t, exact: true }).click();
        rest = rest.slice(t.length).trimStart();
      }
      await card.getByRole('button', { name: 'Check' }).click();
    }
    await card.getByRole('status').waitFor();
    return { id, skill };
  };

  const first = await answerCurrent();
  check('first question starts at the stated level (HSK 3)', sql(`select item_rating from assessment_responses where assessment_id='${testId}'`) === '1100', first.id);
  check('graded on the server with an explanation', await page.getByRole('status').getByText('Correct').isVisible() || first.skill === 'grammar');
  await page.screenshot({ path: `${SHOTS}/p3-01-question.png`, fullPage: true });
  await next();
  const seen = [first];
  for (let i = 0; i < 4; i++) {
    seen.push(await answerCurrent());
    await next();
  }
  await page.reload();
  await page.locator('[data-item]').waitFor();
  check('reload resumes at question 6', (await page.getByText(/Question\s*6\s*\/\s*20/).count()) === 1);
  await page.goto(BASE + '/level-test');
  await page.getByRole('link', { name: 'Continue test' }).waitFor({ timeout: 5000 }).then(() => check('hub offers to continue', true), () => check('hub offers to continue', false));
  await page.getByRole('link', { name: 'Continue test' }).click();
  for (let i = 5; i < 20; i++) {
    seen.push(await answerCurrent());
    if (i < 19) await next();
  }
  check('last question: feedback, then results', await page.getByRole('button', { name: 'See my results' }).isVisible());
  await page.getByRole('button', { name: 'See my results' }).click();
  const skills = seen.reduce((m, s) => ((m[s.skill] = (m[s.skill] ?? 0) + 1), m), {});
  check('questions rotate across all 5 skills (4 each)', Object.keys(skills).length === 5 && Object.values(skills).every((n) => n === 4), JSON.stringify(skills));
  check('listening questions are read aloud', (await page.evaluate(() => window.__spoken.length)) >= 1);

  // results
  await page.getByTestId('result-levels').waitFor();
  const levels = Object.fromEntries(await page.getByTestId('result-levels').locator('[data-skill]').evaluateAll((els) => els.map((e) => [e.getAttribute('data-skill'), e.querySelector('[data-testid=skill-level]').textContent])));
  const n = (s) => (s === 'Below HSK 1' ? 0 : Number(s.replace('HSK ', '')));
  check('result: a level per skill', Object.keys(levels).length === 5, JSON.stringify(levels));
  check('result: right answers raise, "I don\'t know" lowers', n(levels.vocabulary) > n(levels.grammar) && n(levels.vocabulary) >= 4 && n(levels.grammar) <= 1, JSON.stringify(levels));
  check('result: missed grammar points explained', (await page.getByTestId('weak-points').locator('li').count()) >= 2);
  check('result: every answer reviewed', (await page.getByTestId('answers').locator('li').count()) === 20 && (await page.getByTestId('answers').locator('li[data-correct=false]').count()) === 4);
  check('db: test finished + rating history saved', sql(`select (finished_at is not null) || ',' || (select count(*) from user_skill_ratings_history where assessment_id='${testId}') from assessments where id='${testId}'`) === 'true,5');
  await page.screenshot({ path: `${SHOTS}/p3-02-result.png`, fullPage: true });

  // another learner cannot see it
  const other = sql(`select id from auth.users where id <> '${uid}' limit 1`);
  check('other users cannot read the review', asUser(other, `select coalesce(public.get_assessment_review('${testId}')::text, 'none')`) === 'none');

  // check-in after two weeks
  sql(`update assessments set started_at = started_at - interval '15 days', finished_at = finished_at - interval '15 days' where id='${testId}'`);
  await page.goto(BASE + '/dashboard');
  // today's plan was made before the test: rebuild it so the check-in shows up
  await page.getByTestId('today-plan').getByRole('button', { name: 'Lập lại' }).click();
  await page.locator('[data-plan-item=test-zh]', { hasText: 'check-in' }).getByRole('link', { name: 'Bắt đầu' }).click();
  await page.getByTestId('level-zh').getByText('Check-in due').waitFor();
  await page.getByRole('button', { name: 'Check-in · 10 questions' }).click();
  await page.waitForURL(/\/level-test\/[0-9a-f-]{36}$/);
  const checkinId = page.url().split('/').pop();
  for (let i = 0; i < 10; i++) {
    const card = page.locator('[data-item]');
    await card.waitFor();
    await card.getByRole('button', { name: "I don't know" }).click();
    await card.getByRole('status').waitFor();
    if (i < 9) await next();
  }
  await page.getByRole('button', { name: 'See my results' }).click();
  await page.getByTestId('result-levels').waitFor();
  check('check-in shows the drop since last test', (await page.getByTestId('result-levels').getByText('▼').count()) >= 1);
  check('check-in avoids questions already seen', sql(`select count(*) from assessment_responses a join assessment_responses b on a.item_id = b.item_id where a.assessment_id='${testId}' and b.assessment_id='${checkinId}'`) === '0');
  await page.goto(BASE + '/level-test');
  await page.getByTestId('level-zh').getByTestId('skill-levels').waitFor();
  check('hub: levels + past tests', (await page.getByTestId('level-zh').getByTestId('skill-levels').locator('li').count()) === 5 && (await page.getByTestId('level-zh').getByRole('link', { name: /Placement test/ }).count()) === 1);
  await page.screenshot({ path: `${SHOTS}/p3-03-hub.png`, fullPage: true });

  const m = await (await browser.newContext({ viewport: { width: 390, height: 844 }, storageState: await ctx.storageState() })).newPage();
  await m.addInitScript(FAKE_TTS);
  await m.goto(BASE + `/level-test/${testId}`);
  await m.getByTestId('answers').waitFor();
  check('mobile: no horizontal scroll', !(await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));
  await m.screenshot({ path: `${SHOTS}/p3-04-mobile.png`, fullPage: true });

  check('no console/page/API errors', errors.length === 0, errors.join(' | '));
  console.log(results.join('\n'));
  await browser.close();
})().catch(async (e) => { console.log(results.join('\n')); try { const p = (await browserRef.contexts())[0].pages()[0]; await p.screenshot({ path: `${SHOTS}/p3-crash.png`, fullPage: true }); console.log(await p.locator('main').innerText()); } catch {} console.error('CRASH', e.message.slice(0, 800)); process.exit(1); });
