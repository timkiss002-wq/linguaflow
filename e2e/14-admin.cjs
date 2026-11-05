// Run via `npm run e2e` (see e2e/README.md). Args: <screenshots dir> [service role key]
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const SHOTS = process.argv[2];
const BASE = 'http://localhost:5173';
const DB = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const sql = (q) => execSync(`psql ${DB} -tAc "${q.replace(/"/g, '\\"')}"`).toString().trim();
const stamp = Date.now();
const results = [];
const check = (name, cond, extra = '') => results.push(`${cond ? 'PASS' : 'FAIL'}  ${name} ${extra}`);
const LESSON = 'b0000000-0000-4000-8000-000000000301'; // 周末的计划
const ITEM = 'zh-voc-3a';
const TASK = 'zh-w-weekend';

async function register(browser, name, email) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + '/register');
  await page.getByLabel('Display name').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('listen123');
  await page.getByLabel('Confirm password').fill('listen123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL(/onboarding/);
  return { ctx, page, uid: sql(`select id from auth.users where email='${email}'`) };
}

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const learner = await register(browser, 'Learner', `p7l_${stamp}@example.com`);
  const admin = await register(browser, 'Boss', `p7a_${stamp}@example.com`);
  for (const p of [learner.page, admin.page]) {
    p.on('pageerror', (e) => errors.push(e.message));
    p.on('console', (m) => { if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errors.push(m.text()); });
  }
  admin.page.on('response', (r) => { if (r.status() >= 400 && r.url().includes('54321')) errors.push(r.status() + ' ' + r.url()); });
  sql(`update profiles set role = 'admin' where id = '${admin.uid}'`);

  // ── learners: no menu entry, no page, no stats ──
  const lp = learner.page;
  await lp.goto(BASE + '/admin');
  await lp.getByText('Admins only').waitFor();
  check('learner: Admin page refused', (await lp.getByRole('link', { name: 'Admin', exact: true }).count()) === 0);
  let refused = '';
  try {
    execSync(`psql ${DB} -v ON_ERROR_STOP=1 -tAc "begin; set local role authenticated; select set_config('request.jwt.claims', '{\\"sub\\":\\"${learner.uid}\\"}', true); select admin_content_stats(); commit;"`, { stdio: 'pipe' });
  } catch (e) {
    refused = String(e.stderr);
  }
  check('learner: statistics refused by the database', refused.includes('admins only'));
  // some activity for the stats
  sql(`insert into dictation_attempts (user_id, sentence_id, user_input, accuracy, is_correct) select '${learner.uid}', id, 'x', 80, false from lesson_sentences where lesson_id = '${LESSON}' limit 3`);

  // ── admin ──
  const ap = admin.page;
  await ap.goto(BASE + '/dashboard');
  await ap.getByRole('link', { name: 'Admin', exact: true }).first().click();
  const lessons = ap.getByTestId('admin-lessons');
  await lessons.waitFor();
  const row = lessons.locator(`[data-row="${LESSON}"]`);
  const expected = sql(`select count(*) || '|' || count(distinct a.user_id) from dictation_attempts a join lesson_sentences ls on ls.id = a.sentence_id where ls.lesson_id = '${LESSON}'`);
  const cells = await row.locator('td').allTextContents();
  check('lessons with usage numbers (all learners)', cells[0].includes('周末的计划') && cells.slice(2, 4).join('|') === expected, `${cells.join('|')} vs ${expected}`);
  await row.getByRole('switch').click();
  await ap.waitForTimeout(600);
  check('unpublish a lesson', sql(`select is_published from lessons where id='${LESSON}'`) === 'f');
  await ap.screenshot({ path: `${SHOTS}/p7-01-admin-lessons.png`, fullPage: true });

  await ap.getByRole('tab', { name: 'Level test' }).click();
  const items = ap.getByTestId('admin-items');
  await items.waitFor();
  check('question bank for the chosen language', (await items.locator('tbody tr').count()) === Number(sql(`select count(*) from assessment_items where language = 'zh'`)));
  await items.locator(`[data-row="${ITEM}"]`).getByRole('switch').click();
  await ap.waitForTimeout(600);
  check('set a question to draft', sql(`select status from assessment_items where id='${ITEM}'`) === 'draft');
  await ap.screenshot({ path: `${SHOTS}/p7-02-admin-items.png`, fullPage: true });

  await ap.getByRole('tab', { name: 'Writing' }).click();
  await ap.getByTestId('admin-tasks').locator(`[data-row="${TASK}"]`).getByRole('switch').click();
  await ap.waitForTimeout(600);
  check('switch a writing prompt off', sql(`select is_active from writing_tasks where id='${TASK}'`) === 'f');
  await ap.getByRole('tab', { name: 'AI feedback' }).click();
  check('AI usage tab', (await ap.getByTestId('admin-ai').textContent()).includes('Reviews, last 24 h'));

  // ── what the learner now sees ──
  await lp.goto(BASE + '/lessons');
  await lp.getByRole('heading', { name: /Explore/ }).first().waitFor();
  await lp.waitForTimeout(1000);
  check('learner no longer sees the unpublished lesson', (await lp.getByText('周末的计划').count()) === 0 && (await lp.getByText('第一次面试').count()) >= 1);
  await lp.goto(BASE + '/writing?lang=zh');
  await lp.locator('details summary').click();
  await lp.waitForTimeout(500);
  check('learner no longer sees the switched-off prompt', (await lp.getByText('我的周末').count()) === 0 && (await lp.getByText('我最喜欢的一道菜').count()) === 1);
  const asLearner = (q) => sql(`begin; set local role authenticated; select set_config('request.jwt.claims', '{\"sub\":\"${learner.uid}\"}', true); ${q}; commit;`).split('\n').filter((l) => !['BEGIN', 'SET', 'COMMIT'].includes(l) && !l.includes('"sub"')).pop();
  const aid = asLearner(`select start_assessment('zh', 'placement', 3)`);
  const served = new Set();
  for (let i = 0; i < 20; i++) {
    const id = asLearner(`select next_assessment_item('${aid}')->>'id'`);
    if (!id) break;
    served.add(id);
    asLearner(`select answer_assessment_item('${aid}', '${id}', '{\"choice\": -1}'::jsonb)`);
  }
  check('draft question never served (20-question test)', served.size === 20 && !served.has(ITEM), [...served].filter((x) => x.includes('voc')).join(','));

  // restore shared content for other suites
  sql(`update lessons set is_published = true where id='${LESSON}'; update assessment_items set status = 'approved' where id='${ITEM}'; update writing_tasks set is_active = true where id='${TASK}'`);
  check('no console/page/API errors', errors.length === 0, errors.join(' | '));
  console.log(results.join('\n'));
  await browser.close();
})().catch((e) => {
  sql(`update lessons set is_published = true where id='${LESSON}'; update assessment_items set status = 'approved' where id='${ITEM}'; update writing_tasks set is_active = true where id='${TASK}'`);
  console.log(results.join('\n'));
  console.error('CRASH', e.message.slice(0, 800));
  process.exit(1);
});
