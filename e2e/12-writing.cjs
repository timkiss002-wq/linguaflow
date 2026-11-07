// Run via `npm run e2e` (see e2e/README.md). Args: <screenshots dir> [service role key]
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const SHOTS = process.argv[2];
const BASE = 'http://localhost:5173';
const DB = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const sql = (q) => execSync(`psql ${DB} -tAc "${q.replace(/"/g, '\\"')}"`).toString().trim();
const email = `p5_${Date.now()}@example.com`;
const results = [];
const check = (name, cond, extra = '') => results.push(`${cond ? 'PASS' : 'FAIL'}  ${name} ${extra}`);

const ESSAY1 = `technology is very important. i think it is very useful and very fast. We don't feel alone because we can commute and chat online.`;
const ESSAY2 = `Some people believe that technology has made us less social. However, I believe it is convenient and it helps interaction.

Firstly, messaging apps let families talk every day. For example, my parents call me after their commute. Moreover, people who feel isolated can join online groups.

In conclusion, technology significantly changes how we meet, but it does not make us less social.`;
const ZH = '我周末一般在家休息,有时候和朋友去公园。上个周末我们去爬山了，风景很漂亮。因为天气很好，所以我们拍了很多照片。我打算下个周末再去。';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errors.push(m.text()); });
  page.on('response', (r) => { if (r.status() >= 400 && r.url().includes('54321')) errors.push(r.status() + ' ' + r.url()); });

  await page.goto(BASE + '/register');
  await page.getByLabel('Display name').fill('Writer');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('listen123');
  await page.getByLabel('Confirm password').fill('listen123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL(/onboarding/);
  const uid = sql(`select id from auth.users where email='${email}'`);
  sql(`insert into learning_goals (user_id, language, exam, current_level, target_level) values ('${uid}', 'en', 'ielts', '6.0', '7.0')`);
  sql(`insert into learner_profiles (user_id, interests, onboarded_at) values ('${uid}', '{technology}', now())`);
  sql(`insert into vocabulary (user_id, language, term, meaning_vi) values ('${uid}', 'en', 'commute', 'đi làm'), ('${uid}', 'en', 'hobby', 'sở thích')`);

  // ── choose a language ──
  await page.goto(BASE + '/writing');
  await page.getByText('Which language do you want to write in?').waitFor();
  check('starts by choosing a language', (await page.getByRole('group', { name: 'Language to write in' }).getByRole('button').count()) === 2);
  await page.getByRole('button', { name: /^English/ }).click();
  await page.waitForURL(/lang=en/);
  const picks = page.getByTestId('writing-picks');
  await picks.locator('[data-task]').first().waitFor();
  const first = await picks.locator('[data-task]').first();
  check('first prompt: IELTS + your interest + your level', (await first.getAttribute('data-task')) === 'en-w-ielts-tech' && (await first.textContent()).includes('at your level · you like technology · IELTS format'), await first.textContent());
  check('level source explained', await page.getByText(/Chosen for B2 — the level in your profile/).isVisible());
  await page.screenshot({ path: `${SHOTS}/p5-01-prompts.png`, fullPage: true });

  // ── editor ──
  await first.getByRole('link', { name: 'Write' }).click();
  await page.waitForURL(/writing\/new\/en-w-ielts-tech/);
  const targets = page.getByTestId('targets');
  await targets.locator('li').first().waitFor();
  const words = await targets.locator('li').allTextContents();
  check('target words: notebook words first', words.length === 5 && words[0] === 'commute' && words[1] === 'hobby', words.join(','));
  await page.getByRole('button', { name: /Show Vietnamese/ }).click();
  check('Vietnamese prompt on demand', await page.getByText(/Công nghệ khiến con người/).isVisible());
  const box = page.getByLabel('Your text');
  await box.fill(ESSAY1);
  check('used target words light up while typing', (await targets.locator('li[data-used=true]').allTextContents()).join(',') === 'commute');
  check('live word count', (await page.getByTestId('length').textContent()).startsWith('24 / 250'));
  await page.waitForTimeout(600);
  await page.reload();
  await page.getByLabel('Your text').waitFor();
  check('draft survives a reload', (await page.getByLabel('Your text').inputValue()) === ESSAY1);
  await page.getByRole('button', { name: 'Analyse my text' }).click();
  await page.waitForURL(/\/writing\/[0-9a-f-]{36}$/);
  const firstId = page.url().split('/').pop();
  const checks = page.getByTestId('writing-checks');
  await checks.waitFor();
  const issues = await checks.locator('[data-issue]').evaluateAll((els) => els.map((e) => e.getAttribute('data-issue')));
  check('checks: short, capital, I, contractions, very, paragraphs/conclusion', ['short', 'capital', 'lowercase-i', 'contractions', 'very', 'conclusion'].every((c) => issues.includes(c)), issues.join(','));
  check('first text: nothing to compare with yet', (await page.getByTestId('writing-compare').textContent()).includes('This is your first English text'));
  check('db: text + analysis saved', sql(`select (metrics->>'length') || ',' || array_to_string(target_words, '+') from writing_submissions where id='${firstId}'`).startsWith('24,commute+hobby'));

  // ── second, better text: compared with the first ──
  await page.getByRole('link', { name: 'Write again' }).click();
  await page.getByLabel('Your text').fill(ESSAY2);
  await page.getByRole('button', { name: 'Analyse my text' }).click();
  await page.waitForURL((u) => /\/writing\/[0-9a-f-]{36}$/.test(u.pathname) && !u.pathname.endsWith(firstId));
  await page.getByTestId('writing-text').waitFor();
  const marks = await page.getByTestId('writing-text').locator('mark').evaluateAll((els) => els.map((e) => `${e.getAttribute('data-mark')}:${e.textContent}`));
  check('text highlights targets and linking words', marks.includes('target:commute') && marks.includes('linker:However') && marks.includes('linker:In conclusion'), marks.join(' '));
  const cmp = await page.getByTestId('writing-compare').textContent();
  check('compared with earlier text: more linking words, fewer issues', /Kinds of linking words\+\d/.test(cmp) && /Things to fix-\d/.test(cmp), cmp);
  await page.screenshot({ path: `${SHOTS}/p5-02-result.png`, fullPage: true });

  // ── Chinese ──
  await page.goto(BASE + '/writing?lang=zh');
  await page.getByTestId('writing-picks').locator('[data-task]').first().waitFor();
  check('Chinese prompts in characters', /[一-鿿]/.test(await page.getByTestId('writing-picks').textContent()));
  await page.goto(BASE + '/writing/new/zh-w-weekend');
  await page.getByLabel('Your text').fill(ZH);
  check('Chinese counts characters', (await page.getByTestId('length').textContent()).startsWith('58 / 50'));
  await page.getByRole('button', { name: 'Analyse my text' }).click();
  await page.waitForURL(/\/writing\/[0-9a-f-]{36}$/);
  await page.getByTestId('hsk-levels').waitFor();
  const zhIssues = await page.getByTestId('writing-checks').locator('[data-issue]').evaluateAll((els) => els.map((e) => e.getAttribute('data-issue')));
  check('Chinese checks: half-width comma', zhIssues.includes('punctuation'), zhIssues.join(','));
  check('HSK levels of the words used', (await page.getByTestId('hsk-levels').textContent()).includes('HSK 3'));
  check('Chinese linking pair found', (await page.getByTestId('writing-checks').textContent()).includes('因为…所以'));
  await page.screenshot({ path: `${SHOTS}/p5-03-zh.png`, fullPage: true });

  // ── history, plan progress, delete ──
  await page.goto(BASE + '/writing?lang=en');
  await page.getByTestId('writing-history').waitFor();
  check('history lists both English texts', (await page.getByTestId('writing-history').locator('tbody tr').count()) === 2);
  const prog = sql(`begin; set local role authenticated; select set_config('request.jwt.claims', '{\"sub\":\"${uid}\",\"role\":\"authenticated\"}', true); select get_plan_progress()->>'writings'; commit;`);
  check('today\'s plan sees the writing', prog.includes('"en"') && prog.includes('"zh"'), prog);
  await page.goto(BASE + `/writing/${firstId}`);
  await page.getByRole('button', { name: 'Xoá bài viết này' }).click();
  await page.getByTestId('confirm').click();
  await page.waitForURL(/writing\?lang=en/);
  check('delete removes the text', sql(`select count(*) from writing_submissions where user_id='${uid}' and language='en'`) === '1');

  const m = await (await browser.newContext({ viewport: { width: 390, height: 844 }, storageState: await ctx.storageState() })).newPage();
  await m.goto(BASE + '/writing/new/en-w-ielts-tech');
  await m.getByLabel('Your text').waitFor();
  check('mobile editor: no horizontal scroll', !(await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));
  await m.screenshot({ path: `${SHOTS}/p5-04-mobile.png`, fullPage: true });

  check('no console/page/API errors', errors.length === 0, errors.join(' | '));
  console.log(results.join('\n'));
  await browser.close();
})().catch((e) => { console.log(results.join('\n')); console.error('CRASH', e.message.slice(0, 800)); process.exit(1); });
