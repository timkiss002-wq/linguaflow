// Run via `npm run e2e` (see e2e/README.md). Args: <screenshots dir> [service role key]
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const SHOTS = process.argv[2];
const BASE = 'http://localhost:5173';
const DB = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const sql = (q) => execSync(`psql ${DB} -tAc "${q.replace(/"/g, '\\"')}"`).toString().trim();
const email = `m5b_${Date.now()}@example.com`;
const results = [];
const check = (name, cond, extra = '') => results.push(`${cond ? 'PASS' : 'FAIL'}  ${name} ${extra}`);
const EXAMPLES = JSON.parse(sql(`select json_agg(json_build_object('sentence', sentence, 'answer', answer, 'base', base_word)) from word_family_examples`));
const MEMBERS = JSON.parse(sql(`select json_agg(json_build_object('f', family_id, 'w', word, 'p', pos)) from word_family_members`));
const answerFor = (shown) => {
  const t = shown.replace(/ /g, ' ');
  return EXAMPLES.find((e) => {
    const [b, a] = e.sentence.split(/\[[^\]]+\]/);
    return t.startsWith(b) && t.endsWith(a) && t.includes(`(${e.base})`);
  });
};
const FAKE_TTS = () => {
  window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
  Object.defineProperty(window, 'speechSynthesis', { value: { paused: false, getVoices: () => [{ name: 'E', lang: 'en-US', localService: true }], addEventListener() {}, removeEventListener() {}, resume() {}, speak(u) { setTimeout(() => u.onend && u.onend(), 50); }, cancel() {} } });
};

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(FAKE_TTS);
  await ctx.route('https://api.dictionaryapi.dev/**', (r) => r.fulfill({ status: 404, body: '{}' }));
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errors.push(m.text()); });
  page.on('response', (r) => { if (r.status() >= 400 && r.url().includes('54321')) errors.push(r.status() + ' ' + r.url()); });

  await page.goto(BASE + '/register');
  await page.getByLabel('Display name').fill('WF');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('listen123');
  await page.getByLabel('Confirm password').fill('listen123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL(/dashboard/);
  const uid = sql(`select id from auth.users where email='${email}'`);

  // ── import words with the wrong types from the learner's sheet ──
  const csvPath = path.join(SHOTS, 'wf.csv');
  fs.writeFileSync(csvPath, ['STT,Ngày thêm,Từ mới,Giải thích,Topic,loại từ', '1,,groceries,thực phẩm,Daily life,Adj', '2,,observant,có khả năng quan sát tốt,Daily life,Adv', '3,,announce,thông báo,Daily life,Adj', '4,,increase,tăng,Economics,Noun'].join('\n'));
  await page.goto(BASE + '/vocabulary');
  await page.getByRole('button', { name: 'Import CSV' }).click();
  await page.getByLabel('CSV file').setInputFiles(csvPath);
  await page.getByRole('button', { name: 'Import 4 words' }).click();
  await page.getByText('Imported 4 words').waitFor();
  await page.getByText('4 words', { exact: true }).waitFor();
  await page.getByRole('button', { name: /Type looks wrong: observant/ }).waitFor();
  check('wrong type flagged: observant → Adj?', await page.getByRole('button', { name: /observant is usually a Adj/ }).isVisible());
  check('wrong type flagged: announce → Verb?', await page.getByRole('button', { name: /announce is usually a Verb/ }).isVisible());
  check('no warning for unknown or multi-type words', (await page.getByRole('button', { name: /Type looks wrong: (groceries|increase)/ }).count()) === 0);
  await page.screenshot({ path: `${SHOTS}/m5b-01-warnings.png` });
  await page.getByRole('button', { name: /observant is usually a Adj/ }).click();
  await page.waitForTimeout(700);
  check('one click fixes the type', sql(`select part_of_speech from vocabulary where user_id='${uid}' and term='observant'`) === 'adj');

  // family grid in notebook details + add another form
  await page.getByRole('button', { name: 'Examples for observant' }).click();
  const grid = page.getByTestId('family-grid');
  await grid.waitFor();
  check('family grid in notebook', (await grid.textContent()).includes('observation') && (await grid.textContent()).includes('observer'));
  await page.getByRole('button', { name: 'Add observation (noun) to notebook' }).click();
  await page.getByText('Added "observation"').waitFor();
  check('add a family member to notebook', sql(`select part_of_speech || '|' || meaning_vi from vocabulary where user_id='${uid}' and term='observation'`) === 'noun|sự quan sát');
  await page.screenshot({ path: `${SHOTS}/m5b-02-family-notebook.png` });

  // popup in a lesson: "employees" → employ family (inflection)
  await page.goto(BASE + '/lessons/b0000000-0000-4000-8000-000000000e03');
  await page.getByRole('button', { name: 'Text' }).click();
  await page.getByRole('button', { name: 'Look up employees' }).click();
  await page.getByTestId('word-card').getByText('Word family').waitFor();
  check('popup shows family for an inflected word', (await page.getByTestId('word-card').getByTestId('family-grid').textContent()).includes('unemployment'));
  await page.screenshot({ path: `${SHOTS}/m5b-03-popup.png` });
  await page.keyboard.press('Escape');

  // dictation: employers instead of employees → word form
  await page.goto(BASE + '/lessons/b0000000-0000-4000-8000-000000000e03/practice?s=2');
  await page.getByRole('heading', { name: /Sentence 2/ }).waitFor();
  await page.getByLabel('Type what you hear').fill('Many employers appreciate not having to commute every day');
  await page.getByRole('button', { name: 'Check' }).click();
  await page.getByText('1 word form').waitFor();
  check('dictation reports word form error', (await page.locator('[data-kind="word_form"]').count()) === 1);

  // ── Word Forms page: gap fill ──
  await page.goto(BASE + '/word-forms');
  await page.getByText('Do a few exercises').waitFor();
  check('weak spots empty state', true);
  await page.getByRole('button', { name: /Gap fill/ }).click();
  for (let i = 0; i < 10; i++) {
    const shown = await page.getByTestId('exercise-sentence').textContent();
    const ex = answerFor(shown);
    if (!ex) { check('gap: find answer for item', false, shown); break; }
    const typed = i === 0 ? ex.base : ex.answer;
    await page.getByLabel('Correct form').fill(typed);
    await page.getByLabel('Correct form').press('Enter');
    const res = await page.locator('[data-result]').getAttribute('data-result');
    if (i === 0) {
      check('gap: base word → word_form feedback with why', res === 'word_form' && (await page.locator('[data-result]').textContent()).includes('this sentence needs the'));
      await page.screenshot({ path: `${SHOTS}/m5b-04-gap-feedback.png` });
    } else if (res !== 'correct') check(`gap item ${i} correct`, false, `${typed} → ${res}`);
    await page.getByRole('button', { name: 'Next' }).click();
  }
  await page.getByRole('heading', { name: '9 / 10' }).waitFor();
  check('gap fill score 9/10', true);
  const att = sql(`select count(*) || '/' || count(*) filter (where result='word_form' and typed_pos is not null) from word_form_attempts where user_id='${uid}'`);
  check('attempts saved with typed_pos', att === '10/1', att);
  await page.getByRole('button', { name: 'Back' }).click();
  await page.getByTestId('weak-spots').waitFor();
  check('weak spots profile appears', (await page.getByTestId('weak-spots').textContent()).includes('Most common mix-up'));

  // fix the error: one item
  await page.getByRole('button', { name: /Fix the error/ }).click();
  check('fix: wrong word highlighted', (await page.locator('mark').count()) === 1);
  await page.getByLabel('Corrected word').fill('zzz');
  await page.getByLabel('Corrected word').press('Enter');
  check('fix: other answer → shows the answer', (await page.locator('[data-result]').getAttribute('data-result')) === 'other');
  await page.getByRole('button', { name: 'Stop' }).click();

  // complete the family: fill from DB
  await page.getByRole('button', { name: /Complete the family/ }).click();
  const givenWord = (await page.locator('.bg-muted\\/50 p.text-lg').textContent()).trim();
  const fam = MEMBERS.find((m) => m.w === givenWord).f;
  for (const pos of ['noun', 'verb', 'adj', 'adv']) {
    const label = { noun: 'Noun', verb: 'Verb', adj: 'Adj', adv: 'Adv' }[pos];
    const input = page.getByLabel(label, { exact: true });
    if (await input.count()) await input.fill(MEMBERS.find((m) => m.f === fam && m.p === pos).w);
  }
  await page.getByRole('button', { name: 'Check' }).click();
  check('family grid all correct', (await page.locator('.border-destructive').count()) === 0 && (await page.locator('.border-success').count()) >= 1);
  await page.screenshot({ path: `${SHOTS}/m5b-05-grid.png` });
  await page.getByRole('button', { name: 'Stop' }).click();

  // quick sort with keys
  await page.getByRole('button', { name: /Quick sort/ }).click();
  for (let i = 0; i < 3; i++) {
    const w = (await page.getByTestId('sort-word').textContent()).trim();
    const pos = MEMBERS.find((m) => m.w === w).p;
    await page.keyboard.press(String(['noun', 'verb', 'adj', 'adv'].indexOf(pos) + 1));
    await page.waitForTimeout(600);
  }
  check('quick sort with number keys', (await page.getByText(/3 correct/).count()) === 1);
  await page.getByRole('button', { name: 'Stop' }).click();

  await page.getByRole('tab', { name: 'Rules & traps' }).click();
  check('rules: trap cards with families', (await page.locator('[data-trap="ic-ical"]').textContent()).includes('economy'));
  await page.getByRole('tab', { name: 'Families' }).click();
  await page.getByLabel('Find a word family').fill('econom');
  await page.getByText('1 families').waitFor();
  check('families: search', (await page.getByTestId('family-grid').textContent()).includes('economical'));
  await page.screenshot({ path: `${SHOTS}/m5b-06-families.png`, fullPage: true });

  const m = await (await browser.newContext({ viewport: { width: 390, height: 844 }, storageState: await ctx.storageState() })).newPage();
  await m.goto(BASE + '/word-forms');
  await m.getByTestId('weak-spots').waitFor();
  check('mobile: no horizontal scroll', !(await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));
  await m.screenshot({ path: `${SHOTS}/m5b-07-mobile.png`, fullPage: true });

  check('no console/page/API errors', errors.length === 0, errors.join(' | '));
  console.log(results.join('\n'));
  await browser.close();
})().catch((e) => { console.log(results.join('\n')); console.error('CRASH', e.message.slice(0, 800)); process.exit(1); });
