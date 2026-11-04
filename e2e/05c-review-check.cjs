// Run via `npm run e2e` (see e2e/README.md). Args: <screenshots dir> [service role key]
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const SHOTS = process.argv[2];
const BASE = 'http://localhost:5173';
const DB = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const sql = (q) => execSync(`psql ${DB} -tAc "${q.replace(/"/g, '\\"')}"`).toString().trim();
const email = `m5c_${Date.now()}@example.com`;
const results = [];
const check = (name, cond, extra = '') => results.push(`${cond ? 'PASS' : 'FAIL'}  ${name} ${extra}`);

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errors.push(m.text()); });
  page.on('response', (r) => { if (r.status() >= 400 && r.url().includes('54321')) errors.push(r.status() + ' ' + r.url()); });

  await page.goto(BASE + '/register');
  await page.getByLabel('Display name').fill('Check');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('listen123');
  await page.getByLabel('Confirm password').fill('listen123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL(/onboarding/); // new accounts start in the learning-profile wizard
  await page.goto(BASE + '/dashboard');
  await page.waitForURL(/dashboard/);
  const uid = sql(`select id from auth.users where email='${email}'`);
  const state = () => sql(`select string_agg(term || '=' || review_input || '=' || review_correct, ' ; ' order by term) from vocabulary where user_id='${uid}'`);

  // Rows copied from the learner's sheet, including their "Ôn từ vựng" and "Check" values.
  const csvPath = path.join(SHOTS, 'sheet.csv');
  fs.writeFileSync(csvPath, [
    'ôn 1000 từ IELTS,,,,,,,,',
    'STT,Ngày thêm,Từ mới,Giải thích,Topic,loại từ,Ôn từ vựng,Check,Ví dụ 1',
    '1,,groceries,thực phẩm và hàng tạp hóa,Daily life,Adj,groceries,TRUE,',
    '6,,are discharged,được thải ra,Environment,,are dischared,FALSE,',
    '10,,make way for N,nhường chỗ cho,Agriculture / Animals,,make way for n,TRUE,',
    '38,,commensurate,"tương xứng, tương đương",Agriculture / Animals,Noun,,FALSE,',
  ].join('\n'));
  await page.goto(BASE + '/vocabulary');
  await page.getByRole('button', { name: 'Import CSV' }).click();
  await page.getByLabel('CSV file').setInputFiles(csvPath);
  await page.getByRole('button', { name: 'Import 4 words' }).click();
  await page.getByText('Imported 4 words').waitFor();
  await page.getByText('4 words', { exact: true }).waitFor();
  const badge = (term) => page.locator('tr', { hasText: term }).locator('[data-check]').getAttribute('data-check');
  check('imported Check values match the sheet', (await badge('groceries')) === 'TRUE' && (await badge('are discharged')) === 'FALSE' && (await badge('make way for N')) === 'TRUE' && (await badge('commensurate')) === 'FALSE');
  check('Check rate shown (2/4, 50%)', (await page.getByTestId('check-rate').textContent()).includes('2/4 (50%)'));

  await page.getByRole('button', { name: /^FALSE/ }).click();
  await page.getByText('2 words', { exact: true }).waitFor();
  check('filter FALSE → 2 rows', page.url().includes('check=false'));
  await page.screenshot({ path: `${SHOTS}/m5c-01-false-filter.png` });

  const fix = page.getByLabel('Ôn từ vựng: are discharged');
  await fix.fill('are discharged');
  await fix.press('Enter');
  await page.waitForTimeout(700);
  check('retyped correctly → TRUE in DB', state().includes('are discharged=are discharged=t'), state());
  await page.getByRole('button', { name: /^FALSE/ }).click(); // toggle filter off
  await page.getByText('4 words', { exact: true }).waitFor();
  check('rate updates to 3/4 (75%)', (await page.getByTestId('check-rate').textContent()).includes('3/4 (75%)'));

  const wrong = page.getByLabel('Ôn từ vựng: commensurate');
  await wrong.fill('comensurate');
  await wrong.press('Tab'); // blur saves too
  await page.waitForTimeout(700);
  check('misspelling → FALSE', (await badge('commensurate')) === 'FALSE' && state().includes('commensurate=comensurate=f'));

  // Editing the word re-evaluates Check
  const row = page.locator('tr', { hasText: 'commensurate' });
  await row.getByTitle('Edit word').click();
  // While editing, the word sits inside an input, so address the (single) open editor directly.
  await page.getByLabel('Word', { exact: true }).fill('comensurate');
  await page.getByLabel('Word', { exact: true }).press('Enter');
  await page.waitForTimeout(700);
  check('editing the word recomputes Check', state().includes('comensurate=comensurate=t'), state());
  await page.getByTitle('Edit word').filter({ hasText: 'comensurate' }).click();
  await page.getByLabel('Word', { exact: true }).fill('commensurate');
  await page.getByLabel('Word', { exact: true }).press('Enter');
  await page.waitForTimeout(700);

  await page.getByRole('button', { name: /Hide words/ }).click();
  check('hide words masks Từ mới', !(await page.locator('table').getByText('groceries', { exact: true }).first().isVisible()) && (await page.getByTitle('Show the word').count()) === 4);
  await page.screenshot({ path: `${SHOTS}/m5c-02-hidden.png` });
  await page.getByRole('button', { name: /Show words/ }).click();

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export CSV' }).click()]);
  const lines = fs.readFileSync(await download.path(), 'utf8').replace(/^﻿/, '').split('\r\n');
  check('export has Ôn từ vựng + Check columns', lines[0].startsWith('STT,Ngày thêm,Từ mới,Giải thích,Topic,loại từ,Ôn từ vựng,Check,Ví dụ 1') && lines.some((l) => l.includes(',are discharged,TRUE,')), lines[0]);

  const m = await (await browser.newContext({ viewport: { width: 390, height: 844 }, storageState: await ctx.storageState() })).newPage();
  await m.goto(BASE + '/vocabulary');
  await m.getByText('4 words', { exact: true }).waitFor();
  await m.getByLabel('Ôn từ vựng: groceries').fill('grocery');
  await m.getByLabel('Ôn từ vựng: groceries').press('Enter');
  await m.waitForTimeout(700);
  check('mobile: review input works', state().includes('groceries=grocery=f'));
  check('mobile: no horizontal scroll', !(await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));
  await m.screenshot({ path: `${SHOTS}/m5c-03-mobile.png` });

  check('no console/page/API errors', errors.length === 0, errors.join(' | '));
  console.log(results.join('\n'));
  await browser.close();
})().catch((e) => { console.log(results.join('\n')); console.error('CRASH', e.message.slice(0, 800)); process.exit(1); });
