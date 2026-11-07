// Run via `npm run e2e` (see e2e/README.md). Args: <screenshots dir> [service role key]
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const SHOTS = process.argv[2];
const SERVICE_KEY = process.argv[3];
const BASE = 'http://localhost:5173';
const DB = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const sql = (q) => execSync(`psql ${DB} -tAc "${q.replace(/"/g, '\\"')}"`).toString().trim();
const email = `m7_${Date.now()}@example.com`;
const results = [];
const check = (name, cond, extra = '') => results.push(`${cond ? 'PASS' : 'FAIL'}  ${name} ${extra}`);
const FAKE_TTS = () => {
  window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
  Object.defineProperty(window, 'speechSynthesis', { value: { paused: false, getVoices: () => [{ name: 'E', lang: 'en-US', localService: true }, { name: 'Z', lang: 'zh-CN', localService: true }], addEventListener() {}, removeEventListener() {}, resume() {}, speak(u) { setTimeout(() => u.onend && u.onend(), 50); }, cancel() {} } });
};

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(FAKE_TTS);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errors.push(m.text()); });
  page.on('response', (r) => { if (r.status() >= 400 && r.url().includes('54321') && !r.url().includes('/recover') && !r.url().includes('grant_type=password')) errors.push(r.status() + ' ' + r.url()); });
  const signIn = async (pw) => {
    await page.goto(BASE + '/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(pw);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/dashboard/);
  };
  const signOut = async () => {
    await page.getByRole('button', { name: 'Tài khoản' }).first().click();
    await page.getByRole('menuitem', { name: 'Đăng xuất' }).click();
    await page.waitForURL(BASE + '/');
  };

  await page.goto(BASE + '/');
  check('landing lists 6 features', (await page.locator('main h3').count()) >= 9); // 3 steps + 6 features
  await page.goto(BASE + '/register');
  await page.getByLabel('Display name').fill('Stats');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('listen123');
  await page.getByLabel('Confirm password').fill('listen123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL(/onboarding/); // new accounts start in the learning-profile wizard
  await page.goto(BASE + '/dashboard');
  await page.waitForURL(/dashboard/);
  const uid = sql(`select id from auth.users where email='${email}'`);
  await page.getByTestId('stat-tiles').waitFor();
  check('dashboard: 3 tiles + goal', (await page.getByTestId('stat-tiles').locator(':scope > div').count()) === 3 && (await page.getByTestId('goal').textContent()).includes('0 / 15'));

  // ── practice to create data ──
  await page.goto(BASE + '/lessons/b0000000-0000-4000-8000-000000000301/practice');
  const box = page.getByLabel('Type what you hear');
  await box.fill('这个周未你打算做什么');
  await box.press('Enter');
  await page.getByText(/keep going/).waitFor();
  await box.fill('这个周末你打算做什么');
  await box.press('Enter');
  await page.getByText('Correct!').waitFor();
  await box.press('Enter');
  await page.getByRole('heading', { name: /Sentence 2/ }).waitFor();
  await box.fill('我想先去超市卖点儿东西然后回家做饭');
  await box.press('Enter');
  await page.getByText(/1 wrong tone/).waitFor();
  await page.goto(BASE + '/lessons/b0000000-0000-4000-8000-000000000e03/practice?s=2');
  await page.getByLabel('Type what you hear').fill('Many employers appreciate not having to commute every day');
  await page.getByLabel('Type what you hear').press('Enter');
  await page.getByText('1 word form').waitFor();
  // study time: 15 min today, 10 min yesterday (Chinese)
  sql(`insert into study_sessions (user_id, kind, language, started_at, active_seconds) values ('${uid}','dictation','zh', now(), 900), ('${uid}','dictation','zh', now() - interval '1 day', 600)`);

  // ── dashboard ──
  await page.goto(BASE + '/dashboard');
  await page.getByTestId('goal').filter({ hasText: '15 / 15' }).waitFor();
  check('daily goal reached', await page.getByText(/Đạt mục tiêu/).isVisible());
  const tiles = await page.getByTestId('stat-tiles').textContent();
  check('tiles: study time', tiles.includes('25m'), tiles.slice(0, 160));
  const bars = await page.locator('.recharts-bar-rectangle path').count();
  check('study-time chart draws bars for active days', bars >= 2, `bars=${bars}`);
  await page.locator('.recharts-bar-rectangle').last().hover();
  await page.getByText('Study time', { exact: true }).last().waitFor();
  check('chart tooltip on hover', await page.locator('.recharts-tooltip-wrapper').getByText(/min/).isVisible());
  await page.getByText('Show data table').first().click();
  check('data table view', (await page.locator('details table tbody tr').count()) === 7);
  check('continue-learning card', await page.getByRole('link', { name: 'Học tiếp' }).isVisible());
  await page.screenshot({ path: `${SHOTS}/m7-01-dashboard.png`, fullPage: true });
  await page.getByTestId('study-switch').getByRole('radio', { name: /Tiếng Trung/ }).click();
  await page.waitForTimeout(800);
  check('studying Chinese filters tiles', (await page.getByTestId('stat-tiles').textContent()).includes('25m'));

  // ── statistics ──
  await page.getByRole('link', { name: /^Tiến độ/ }).first().click();
  await page.getByTestId('mistakes').waitFor();
  await page.waitForTimeout(800);
  const mistakes = await page.getByTestId('mistakes').textContent();
  check('mistake types (zh): misheard + tone, no English word form', mistakes.includes('Misheard') && mistakes.includes('Wrong tone') && !mistakes.includes('Word form'), mistakes.slice(0, 120));
  check('Chinese tone/character insight', mistakes.includes('tone') && /\d+% of your Chinese mistakes/.test(mistakes));
  const conf = await page.getByTestId('confusions').textContent();
  check('most confused pairs (zh only)', conf.includes('末') && conf.includes('未') && conf.includes('买') && conf.includes('卖') && !conf.includes('employees'), conf);
  check('weekly accuracy point drawn', (await page.locator('.recharts-line-dot, .recharts-line-dots circle').count()) >= 1);
  await page.screenshot({ path: `${SHOTS}/m7-02-statistics-zh.png`, fullPage: true });
  await page.getByRole('button', { name: 'All' }).click();
  await page.waitForTimeout(800);
  check('all languages: word form counted', (await page.getByTestId('mistakes').textContent()).includes('Word form'));
  await page.getByRole('button', { name: '90d' }).click();
  await page.waitForTimeout(800);
  check('90-day range', (await page.getByTestId('stats-tiles').textContent()).includes('last 90 days'));

  // ── forgot / reset password ──
  await signOut();
  await page.goto(BASE + '/login');
  await page.getByRole('link', { name: 'Forgot password?' }).click();
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await page.getByText('Check your inbox').waitFor();
  check('forgot password: neutral confirmation', await page.getByText(`If an account exists for ${email}`).isVisible());
  const res = await fetch('http://127.0.0.1:54321/auth/v1/admin/generate_link', {
    method: 'POST',
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'recovery', email, redirect_to: `${BASE}/reset-password` }),
  });
  const link = (await res.json()).action_link;
  await page.goto(link);
  await page.waitForURL(/reset-password/);
  await page.getByLabel('New password', { exact: true }).fill('newpass123');
  await page.getByLabel('Confirm new password').fill('newpass123');
  await page.getByRole('button', { name: 'Save new password' }).click();
  await page.waitForURL(/dashboard/);
  check('reset link → new password saved', true);
  await page.screenshot({ path: `${SHOTS}/m7-03-reset-done.png` });
  await signOut();
  await signIn('newpass123');
  check('sign in with the new password', true);

  await page.goto(BASE + '/reset-password');
  await page.getByLabel('New password', { exact: true }).waitFor({ timeout: 5000 }).then(() => check('reset page while signed in still works', true), () => check('reset page while signed in still works', false));
  await page.goto(BASE + '/settings');
  await page.getByRole('button', { name: 'Change password' }).scrollIntoViewIfNeeded();
  await page.getByLabel('New password', { exact: true }).fill('weak');
  await page.getByRole('button', { name: 'Change password' }).click();
  check('change password validates', await page.getByText('At least 8 characters', { exact: true }).isVisible());
  await page.getByLabel('New password', { exact: true }).fill('another123');
  await page.getByLabel('Confirm new password').fill('another123');
  await page.getByRole('button', { name: 'Change password' }).click();
  await page.getByText('Password changed').waitFor();
  await signOut();
  await signIn('another123');
  check('change password in settings', true);

  const m = await (await browser.newContext({ viewport: { width: 390, height: 844 }, storageState: await ctx.storageState() })).newPage();
  await m.addInitScript(FAKE_TTS);
  for (const p of ['/dashboard', '/statistics']) {
    await m.goto(BASE + p);
    await m.waitForTimeout(1500);
    check(`mobile ${p}: no horizontal scroll`, !(await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));
  }
  await m.screenshot({ path: `${SHOTS}/m7-04-mobile-stats.png`, fullPage: true });

  check('no console/page/API errors', errors.length === 0, errors.join(' | '));
  console.log(results.join('\n'));
  await browser.close();
})().catch((e) => { console.log(results.join('\n')); console.error('CRASH', e.message.slice(0, 800)); process.exit(1); });
