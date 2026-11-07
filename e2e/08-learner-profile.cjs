// Run via `npm run e2e` (see e2e/README.md). Args: <screenshots dir> [service role key]
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const SHOTS = process.argv[2];
const BASE = 'http://localhost:5173';
const DB = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const sql = (q) => execSync(`psql ${DB} -tAc "${q.replace(/"/g, '\\"')}"`).toString().trim();
const email = `p1_${Date.now()}@example.com`;
const results = [];
const check = (name, cond, extra = '') => results.push(`${cond ? 'PASS' : 'FAIL'}  ${name} ${extra}`);
const plusDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const FAKE_TTS = () => {
  window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
  Object.defineProperty(window, 'speechSynthesis', { value: { paused: false, getVoices: () => [{ name: 'Z', lang: 'zh-CN', localService: true }], addEventListener() {}, removeEventListener() {}, resume() {}, speak(u) { setTimeout(() => u.onend && u.onend(), 30); }, cancel() {} } });
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
  await page.getByLabel('Display name').fill('Mai');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('listen123');
  await page.getByLabel('Confirm password').fill('listen123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL(/onboarding/);
  await page.getByRole('heading', { name: 'Welcome, Mai!' }).waitFor({ timeout: 8000 }).then(() => check('register → onboarding wizard', true), () => check('register → onboarding wizard', false));
  const uid = sql(`select id from auth.users where email='${email}'`);

  // step 1
  await page.getByRole('button', { name: 'Next' }).click();
  check('step 1 requires a language', await page.getByText('Choose at least one language.').isVisible());
  await page.getByRole('button', { name: /^English/ }).click();
  await page.getByRole('button', { name: /^中文/ }).click();
  await page.getByRole('button', { name: 'Next' }).click();

  // step 2
  const en = page.getByTestId('goal-en');
  const zh = page.getByTestId('goal-zh');
  await en.getByLabel('Target').selectOption('5.0');
  await page.getByRole('button', { name: 'Next' }).click();
  check('step 2 validates target > current', await en.getByText('Your target should be higher than your current level.').isVisible());
  await en.getByLabel('Target').selectOption('7.0');
  await en.getByLabel('Exam / deadline (optional)').fill(plusDays(100));
  await en.getByRole('button', { name: 'Writing' }).click();
  await zh.getByRole('button', { name: 'HSK 2.0 (6 levels)' }).click();
  await zh.getByLabel('Current level').selectOption('3');
  await zh.getByLabel('Target').selectOption('4');
  await zh.getByLabel('Exam / deadline (optional)').fill(plusDays(50));
  await page.screenshot({ path: `${SHOTS}/p1-01-goals.png`, fullPage: true });
  await page.getByRole('button', { name: 'Next' }).click();

  // step 3 + 4
  for (const i of ['Daily life', 'Work & career', 'Technology']) await page.getByRole('button', { name: i, exact: true }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: '20 min' }).click();
  await page.getByRole('button', { name: 'Evening' }).click();
  await page.getByRole('button', { name: 'Sun', exact: true }).click();
  await page.getByRole('switch', { name: /Learn from my study habits/ }).click();
  await page.screenshot({ path: `${SHOTS}/p1-02-habits.png`, fullPage: true });
  await page.getByRole('button', { name: 'Save profile' }).click();
  await page.waitForURL(/dashboard/);

  const lp = sql(`select array_to_string(interests, ',') || '|' || preferred_time || '|' || array_to_string(study_days, ',') || '|' || habit_analysis || '|' || (onboarded_at is not null) from learner_profiles where user_id='${uid}'`);
  check('profile saved', lp === 'daily-conversation,business-career,technology|evening|1,2,3,4,5,6|false|true', lp);
  const goals = sql(`select string_agg(language || ':' || exam || ':' || current_level || '>' || target_level || ':' || array_to_string(focus_skills, '+'), ' ' order by language) from learning_goals where user_id='${uid}'`);
  check('goals saved', goals === 'en:ielts:5.0>7.0:listening+vocabulary+writing zh:hsk2:3>4:listening+vocabulary', goals);
  check('daily goal saved', sql(`select daily_goal_minutes from profiles where id='${uid}'`) === '20');

  // dashboard
  const enCard = page.getByTestId('goal-card-en');
  const zhCard = page.getByTestId('goal-card-zh');
  await enCard.waitFor();
  check('EN card: band + countdown + hours', (await enCard.textContent()).includes('Band 5.0 → Band 7.0') && (await enCard.getByTestId('countdown').textContent()).includes('100 days') && (await enCard.textContent()).includes('about 33 hours'));
  await zhCard.getByTestId('hsk-plan').waitFor();
  const plan = await zhCard.getByTestId('hsk-plan').textContent();
  check('ZH card: HSK 4 coverage + words/day + pace', plan.includes('0 / 1193') && plan.includes('Learn about 24 new HSK words a day') && plan.includes('very ambitious'), plan);
  const enRecs = await enCard.getByTestId('recommended').locator('li').allTextContents();
  check('EN recommendation: one step above + interests first', enRecs[0]?.includes('Working From Home') && enRecs[0]?.includes('one step above your level · matches your interests'), enRecs.join(' | '));
  const zhRecs = await zhCard.getByTestId('recommended').locator('li').allTextContents();
  check('ZH recommendations: HSK 4 first, never HSK 6', zhRecs.slice(0, 2).every((t) => t.includes('HSK 4')) && !zhRecs.some((t) => t.includes('HSK 6')), zhRecs.join(' | '));
  await page.screenshot({ path: `${SHOTS}/p1-03-dashboard.png`, fullPage: true });

  // HSK info in popup + coverage moves
  await page.goto(BASE + '/lessons/b0000000-0000-4000-8000-000000000301');
  await page.getByRole('button', { name: 'Text' }).click();
  await page.getByRole('button', { name: 'Look up 超市' }).first().click();
  const info = page.getByTestId('hsk-info');
  await info.waitFor();
  check('popup: HSK levels + English gloss', (await info.textContent()).includes('HSK 2.0 · 3') && (await info.textContent()).includes('HSK 3.0 · 2') && (await info.textContent()).includes('supermarket'));
  await page.getByTestId('word-card').getByLabel('Nghĩa tiếng Việt').fill('siêu thị');
  await page.getByTestId('word-card').getByRole('button', { name: 'Add to notebook' }).click();
  await page.getByText('Added "超市"').waitFor();
  sql(`update vocabulary set status='reviewing' where user_id='${uid}' and term='超市'`);
  await page.goto(BASE + '/dashboard');
  await page.getByTestId('hsk-plan').waitFor();
  check('known HSK word counted', (await page.getByTestId('hsk-plan').textContent()).includes('1 / 1193'));

  // lessons "For you"
  await page.goto(BASE + '/lessons');
  await page.getByRole('region', { name: 'Recommended for you' }).waitFor();
  check('For you follows the study language (English)', (await page.getByRole('region', { name: 'Recommended for you' }).locator('li').count()) === 2);

  // edit from settings
  await page.goto(BASE + '/settings');
  await page.getByText(/IELTS Band 5\.0 → Band 7\.0/).waitFor({ timeout: 8000 }).then(() => check('settings summary', true), () => check('settings summary', false));
  await page.getByRole('link', { name: 'Edit learning profile' }).click();
  await page.getByRole('heading', { name: 'Learning profile' }).waitFor();
  check('edit mode has no skip', (await page.getByRole('button', { name: 'Skip for now' }).count()) === 0);
  await page.getByRole('button', { name: /^中文/ }).click(); // stop learning Chinese
  await page.getByRole('button', { name: 'Next' }).click();
  check('prefilled goal', (await page.getByTestId('goal-en').getByLabel('Target').inputValue()) === '7.0');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Save profile' }).click();
  await page.waitForURL(/dashboard/);
  check('removing a language deletes its goal', sql(`select string_agg(language::text, ',') from learning_goals where user_id='${uid}'`) === 'en');

  const m = await (await browser.newContext({ viewport: { width: 390, height: 844 }, storageState: await ctx.storageState() })).newPage();
  await m.goto(BASE + '/onboarding');
  await m.getByRole('heading', { name: 'Learning profile' }).waitFor();
  await m.getByRole('button', { name: 'Next' }).click();
  check('mobile: no horizontal scroll', !(await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));
  await m.screenshot({ path: `${SHOTS}/p1-04-mobile.png`, fullPage: true });

  check('no console/page/API errors', errors.length === 0, errors.join(' | '));
  console.log(results.join('\n'));
  await browser.close();
})().catch((e) => { console.log(results.join('\n')); console.error('CRASH', e.message.slice(0, 800)); process.exit(1); });
