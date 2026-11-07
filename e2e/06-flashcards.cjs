// Run via `npm run e2e` (see e2e/README.md). Args: <screenshots dir> [service role key]
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const SHOTS = process.argv[2];
const BASE = 'http://localhost:5173';
const DB = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const sql = (q) => execSync(`psql ${DB} -tAc "${q.replace(/"/g, '\\"')}"`).toString().trim();
const email = `m6_${Date.now()}@example.com`;
const results = [];
const check = (name, cond, extra = '') => results.push(`${cond ? 'PASS' : 'FAIL'}  ${name} ${extra}`);
const FAKE_TTS = () => {
  window.__spoken = [];
  window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
  Object.defineProperty(window, 'speechSynthesis', { value: { paused: false, getVoices: () => [{ name: 'E', lang: 'en-US', localService: true }, { name: 'Z', lang: 'zh-CN', localService: true }], addEventListener() {}, removeEventListener() {}, resume() {}, speak(u) { window.__spoken.push(u.text); setTimeout(() => u.onend && u.onend(), 50); }, cancel() {} } });
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
  await page.getByLabel('Display name').fill('SRS');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('listen123');
  await page.getByLabel('Confirm password').fill('listen123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL(/onboarding/); // new accounts start in the learning-profile wizard
  await page.goto(BASE + '/dashboard');
  await page.waitForURL(/dashboard/);
  const uid = sql(`select id from auth.users where email='${email}'`);
  const card = (t) => sql(`select repetitions || '|' || interval_days || '|' || status || '|' || round(extract(epoch from (due_at - now()))/86400) from vocabulary where user_id='${uid}' and term='${t}'`);

  const importCsv = async (lang, lines) => {
    const p = path.join(SHOTS, `m6-${lang}.csv`);
    fs.writeFileSync(p, lines.join('\n'));
    await page.goto(BASE + '/vocabulary');
    await page.getByRole('button', { name: 'Import CSV' }).click();
    await page.getByLabel('Language of the words').selectOption(lang);
    await page.getByLabel('CSV file').setInputFiles(p);
    await page.getByRole('button', { name: new RegExp(`Import ${lines.length - 1} words`) }).click();
    await page.getByText(`Imported ${lines.length - 1} words`).waitFor();
  };
  await importCsv('en', ['Từ mới,Giải thích,loại từ,Ngữ cảnh', 'demolish,phá dỡ,Verb,They plan to demolish the old bridge.', 'reliable,đáng tin cậy,Adj,The bus is cheap and reliable.', 'commute,đi làm hằng ngày,Verb,']);
  await importCsv('zh', ['Từ mới,Giải thích,Phiên âm', '超市,siêu thị,chāo shì', '面试,phỏng vấn,miàn shì']);

  // ── English review: new cards ──
  await page.goto(BASE + '/review?lang=en');
  await page.getByTestId('due-now').waitFor();
  check('overview: 0 due, 3 new', (await page.getByTestId('due-now').textContent()) === '0' && (await page.getByTestId('new-today').textContent()).startsWith('3'));
  await page.screenshot({ path: `${SHOTS}/m6-01-overview.png` });
  await page.getByRole('button', { name: /Lật 3 thẻ/ }).click();
  const front = async () => (await page.getByTestId('flashcard').locator('p').first().textContent()).trim();

  const t1 = await front();
  check('card front hides the meaning', !(await page.getByTestId('card-back').count()));
  await page.keyboard.press('Space');
  await page.getByTestId('card-back').waitFor();
  check('reveal shows meaning + plays audio', (await page.evaluate(() => window.__spoken)).includes(t1));
  const labels = await page.locator('button', { hasText: /· [1-4]$/ }).allTextContents();
  check('buttons show next intervals (10m/1d/1d/4d)', labels.join('|') === 'Again10m · 1|Hard1d · 2|Good1d · 3|Easy4d · 4', labels.join('|'));
  await page.screenshot({ path: `${SHOTS}/m6-02-card.png` });
  await page.keyboard.press('3');
  const t2 = await front();
  await page.keyboard.press('Space');
  await page.keyboard.press('1'); // Again → comes back
  const t3 = await front();
  await page.keyboard.press('Space');
  await page.keyboard.press('4'); // Easy
  await page.getByText(/4 \/ 4/).waitFor();
  check('Again card returns in the same session', (await front()) === t2);
  await page.keyboard.press('Space');
  await page.keyboard.press('3');
  await page.getByRole('heading', { name: 'Review done' }).waitFor();
  await page.waitForTimeout(800);
  check('Good: 1 day, reviewing', card(t1) === '1|1.00|reviewing|1', card(t1));
  check('Easy: 4 days', card(t3) === '1|4.00|reviewing|4', card(t3));
  check('Again then Good: 1 day', card(t2) === '1|1.00|reviewing|1', card(t2));
  check('review log saved (4 rows)', sql(`select count(*) || '/' || count(*) filter (where rating='again') from vocabulary_reviews where user_id='${uid}'`) === '4/1');
  await page.screenshot({ path: `${SHOTS}/m6-03-done.png` });
  await page.getByRole('button', { name: 'Back to review overview' }).click();
  await page.getByText('All done for now').waitFor();
  const bars = await page.getByTestId('forecast').locator('[title]').evaluateAll((els) => els.map((e) => e.getAttribute('title').split(': ')[1]));
  check('forecast: 2 tomorrow, 1 in 4 days', bars.slice(0, 4).join(',') === '2,0,0,1', bars.join(','));

  // ── a day later ──
  sql(`update vocabulary set due_at = now() - interval '1 minute' where user_id='${uid}' and term='${t1}'`);
  await page.reload();
  await page.getByTestId('due-now').waitFor();
  check('due card appears after its date', (await page.getByTestId('due-now').textContent()) === '1');
  await page.getByRole('button', { name: /Lật 1 thẻ/ }).click();
  await page.keyboard.press('Space');
  check('second Good previews 3d', (await page.locator('button', { hasText: /^Good/ }).textContent()).includes('3d'));
  await page.keyboard.press('3');
  await page.getByRole('heading', { name: 'Review done' }).waitFor();
  await page.waitForTimeout(600);
  check('interval grows 1 → 3 days', card(t1) === '2|3.00|reviewing|3', card(t1));

  // ── fixed intervals like the sheet ──
  await page.goto(BASE + '/settings');
  await page.getByRole('radio', { name: /Fixed intervals/ }).click();
  await page.getByText('Review settings saved').first().waitFor();
  check('fixed mode shows 1/3/7/30', (await page.getByLabel('Mới (New)').inputValue()) === '1' && (await page.getByLabel('Thành thạo (Mastered)').inputValue()) === '30');
  for (const [label, v] of [['Mới (New)', '2'], ['Đang học (Learning)', '4'], ['Ôn lại (Reviewing)', '8'], ['Thành thạo (Mastered)', '60']]) {
    await page.getByLabel(label).fill(v);
    await page.getByLabel(label).blur();
    await page.waitForTimeout(400);
  }
  check('custom intervals saved', sql(`select settings->>'srsMode' || ' ' || (settings->'fixedIntervals')::text from profiles where id='${uid}'`) === 'fixed [2, 4, 8, 60]');
  await page.screenshot({ path: `${SHOTS}/m6-04-settings.png`, fullPage: true });

  await page.goto(BASE + '/review?lang=zh');
  await page.getByLabel('Card front').selectOption('reverse');
  await page.getByRole('button', { name: /Lật 2 thẻ/ }).click();
  const zhFront = await front();
  check('reverse card shows the meaning first', ['siêu thị', 'phỏng vấn'].includes(zhFront), zhFront);
  await page.keyboard.press('Space');
  const zhLabels = await page.locator('button', { hasText: /· [1-4]$/ }).allTextContents();
  check('fixed previews (10m/2d/4d/8d)', zhLabels.join('|') === 'Again10m · 1|Hard2d · 2|Good4d · 3|Easy8d · 4', zhLabels.join('|'));
  check('back shows hanzi + pinyin', /(超市|面试)/.test(await page.getByTestId('card-back').textContent()) && /(chāo shì|miàn shì)/.test(await page.getByTestId('card-back').textContent()));
  await page.screenshot({ path: `${SHOTS}/m6-05-zh-reverse.png` });
  await page.keyboard.press('3');
  await page.waitForTimeout(600);
  const zhTerm = zhFront === 'siêu thị' ? '超市' : '面试';
  check('fixed Good → 4 days, learning', card(zhTerm) === '1|4.00|learning|4', card(zhTerm));
  await page.getByRole('button', { name: 'End session' }).click();

  // ── new-card limit + dashboard agreement ──
  await page.goto(BASE + '/dashboard');
  await page.waitForTimeout(1200);
  check('dashboard due = 1 (one Chinese new card left)', /Due for review\s*1/.test(await page.locator('main').textContent()));
  await page.goto(BASE + '/settings');
  await page.getByLabel('New cards per day').fill('1');
  await page.getByLabel('New cards per day').blur();
  await page.getByText('Review settings saved').first().waitFor();
  await page.goto(BASE + '/review?lang=zh');
  await page.getByText('All done for now').waitFor();
  check('daily new limit respected', (await page.getByTestId('new-today').textContent()).startsWith('0'));

  const m = await (await browser.newContext({ viewport: { width: 390, height: 844 }, storageState: await ctx.storageState() })).newPage();
  await m.addInitScript(FAKE_TTS);
  sql(`update vocabulary set due_at = now() - interval '1 minute' where user_id='${uid}' and term='reliable'`);
  await m.goto(BASE + '/review?lang=en');
  await m.getByRole('button', { name: /Start review/ }).click();
  await m.getByRole('button', { name: /Show answer/ }).click();
  check('mobile: no horizontal scroll', !(await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));
  await m.screenshot({ path: `${SHOTS}/m6-06-mobile.png`, fullPage: true });

  check('no console/page/API errors', errors.length === 0, errors.join(' | '));
  console.log(results.join('\n'));
  await browser.close();
})().catch((e) => { console.log(results.join('\n')); console.error('CRASH', e.message.slice(0, 800)); process.exit(1); });
