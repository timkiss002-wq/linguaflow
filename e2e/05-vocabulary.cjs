// Run via `npm run e2e` (see e2e/README.md). Args: <screenshots dir> [service role key]
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const SHOTS = process.argv[2];
const BASE = 'http://localhost:5173';
const DB = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const sql = (q) => execSync(`psql ${DB} -tAc "${q.replace(/"/g, '\\"')}"`).toString().trim();
const email = `m5_${Date.now()}@example.com`;
const results = [];
const check = (name, cond, extra = '') => results.push(`${cond ? 'PASS' : 'FAIL'}  ${name} ${extra}`);
const ZH1 = 'b0000000-0000-4000-8000-000000000301';
const EN1 = 'b0000000-0000-4000-8000-000000000e01';

const FAKE_TTS = () => {
  const voices = [
    { name: 'Google US English', lang: 'en-US', localService: false, default: true, voiceURI: 'e' },
    { name: 'Google 普通话（中国大陆）', lang: 'zh-CN', localService: false, default: false, voiceURI: 'g' },
  ];
  window.__spoken = [];
  let current = null;
  window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
  Object.defineProperty(window, 'speechSynthesis', {
    value: {
      paused: false, getVoices: () => voices, addEventListener() {}, removeEventListener() {}, resume() {},
      speak(u) { current = u; window.__spoken.push(u.text); u._t = setTimeout(() => { if (current === u) { current = null; u.onend && u.onend(); } }, 150); },
      cancel() { if (current) { const u = current; current = null; clearTimeout(u._t); u.onerror && u.onerror({ error: 'interrupted' }); } },
    },
  });
};

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true });
  await ctx.addInitScript(FAKE_TTS);
  await ctx.route('https://api.dictionaryapi.dev/**', (route) => {
    const word = decodeURIComponent(route.request().url().split('/').pop());
    if (word === 'shower') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ phonetic: '/ˈʃaʊ.ər/', meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'A device for washing the body.' }] }, { partOfSpeech: 'verb', definitions: [{ definition: 'To wash in a shower.' }] }] }]) });
    }
    return route.fulfill({ status: 404, contentType: 'application/json', body: '{"title":"No Definitions Found"}' });
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errors.push(m.text()); });
  page.on('response', (r) => { if (r.status() >= 400 && r.status() !== 409 && r.url().includes('54321')) errors.push(r.status() + ' ' + r.url()); });

  await page.goto(BASE + '/register');
  await page.getByLabel('Display name').fill('Vy');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('listen123');
  await page.getByLabel('Confirm password').fill('listen123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL(/dashboard/);
  const uid = sql(`select id from auth.users where email='${email}'`);
  const words = () => sql(`select string_agg(term || '|' || coalesce(part_of_speech,'-') || '|' || coalesce(meaning_vi,'-') || '|' || coalesce(topic,'-'), ' ; ' order by term) from vocabulary where user_id='${uid}'`);

  // ── click a word in an English lesson ──
  await page.goto(BASE + '/lessons/' + EN1);
  await page.getByRole('button', { name: 'Text' }).click();
  await page.getByRole('button', { name: 'Look up shower' }).click();
  const card = page.getByTestId('word-card');
  await card.getByText('/ˈʃaʊ.ər/').waitFor();
  check('popup: IPA + definitions from dictionary', await card.getByText('A device for washing the body.').isVisible());
  check('popup: type pre-selected from dictionary (noun)', (await card.getByLabel('Type').inputValue()) === 'noun');
  check('popup: shows the context sentence', await card.getByText('Then I take a quick shower and get dressed.').isVisible());
  await page.screenshot({ path: `${SHOTS}/m5-01-popup-en.png` });
  await card.getByLabel('Nghĩa tiếng Việt').fill('vòi sen; tắm vòi sen');
  await card.getByLabel('Topic').selectOption('Daily life');
  await card.getByRole('button', { name: 'Add to notebook' }).click();
  await page.getByText('Added "shower" to your notebook').waitFor();
  const shower = sql(`select context_sentence || '|' || source_lesson_id || '|' || (source_sentence_id is not null) from vocabulary where user_id='${uid}' and term='shower'`);
  check('saved with context + source', shower === `Then I take a quick shower and get dressed.|${EN1}|true`, shower);
  await page.waitForTimeout(400); // let the closing popover finish
  await page.getByRole('button', { name: 'Look up shower' }).click();
  await page.getByTestId('word-card').getByText('In your notebook').waitFor({ timeout: 4000 }).then(() => check('re-open: already in notebook', true), () => check('re-open: already in notebook', false));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Look up dressed' }).click();
  await page.getByTestId('word-card').getByText('Not in the English dictionary.').waitFor();
  check('unknown word: can still save', await page.getByTestId('word-card').getByRole('button', { name: 'Add to notebook' }).isEnabled());
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  // ── Chinese word with pinyin ──
  await page.goto(BASE + '/lessons/' + ZH1);
  await page.getByRole('button', { name: 'Text' }).click();
  await page.getByRole('button', { name: 'Look up 超市' }).first().click();
  const zc = page.getByTestId('word-card');
  await zc.getByText('chāo shì').waitFor();
  check('popup: Chinese pinyin', true);
  await zc.getByLabel('Nghĩa tiếng Việt').fill('siêu thị');
  await zc.getByLabel('Type').selectOption('noun');
  await zc.getByRole('button', { name: 'Add to notebook' }).click();
  await page.getByText('Added "超市" to your notebook').waitFor();
  await page.screenshot({ path: `${SHOTS}/m5-02-popup-zh.png` });

  // ── word from the Dictation Room answer ──
  await page.goto(BASE + `/lessons/${ZH1}/practice?s=2`);
  await page.getByRole('button', { name: 'Show answer' }).click();
  await page.getByRole('button', { name: 'Look up 东西' }).click();
  await page.getByTestId('word-card').getByLabel('Nghĩa tiếng Việt').fill('đồ đạc, đồ vật');
  await page.getByTestId('word-card').getByRole('button', { name: 'Add to notebook' }).click();
  await page.getByText('Added "东西" to your notebook').waitFor();
  check('save from dictation answer', true);

  // ── notebook sheet ──
  await page.goto(BASE + '/vocabulary');
  await page.getByText('3 words').waitFor();
  check('sheet lists 3 words', true);
  await page.getByLabel('Search vocabulary').fill('sieu thi');
  await page.getByText('1 word', { exact: true }).waitFor();
  check('accent-insensitive search', await page.locator('table').getByText('超市').isVisible());
  await page.getByLabel('Search vocabulary').fill('');
  await page.getByText('3 words').waitFor();
  await page.getByRole('button', { name: /English/ }).click();
  await page.getByText('1 word', { exact: true }).waitFor();
  // inline edit: meaning + type
  const row = page.locator('tr', { hasText: 'shower' });
  await row.getByTitle('Edit meaning').click();
  await row.getByLabel('Meaning').fill('vòi hoa sen');
  await row.getByLabel('Meaning').press('Enter');
  await row.getByTitle('Edit type').click();
  await row.getByLabel('Type').selectOption('verb');
  await row.getByLabel('Type').blur();
  await page.waitForTimeout(700);
  check('inline edits saved', words().includes('shower|verb|vòi hoa sen|Daily life'), words());
  await row.getByRole('button', { name: 'Examples for shower' }).click();
  await page.getByLabel('New example sentence').fill('I always shower before bed.');
  await page.getByLabel('New example sentence').press('Enter');
  await page.waitForTimeout(600);
  check('example added', sql(`select examples[1] from vocabulary where user_id='${uid}' and term='shower'`) === 'I always shower before bed.');
  await page.screenshot({ path: `${SHOTS}/m5-03-sheet.png` });

  // ── add manually ──
  await page.getByRole('button', { name: 'Add word' }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByLabel('Word', { exact: true }).fill('Demolish');
  await dlg.getByLabel('Nghĩa tiếng Việt').fill('phá bỏ hoàn toàn');
  await dlg.getByLabel('Type').selectOption('verb');
  await dlg.getByLabel('Example sentence (optional)').fill('They plan to demolish the old bridge.');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByText('Added "demolish"').waitFor();
  await page.getByLabel('Word', { exact: true }).fill('shower');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByText('"shower" is already in your notebook.').waitFor();
  check('add manually + duplicate blocked', true);
  await page.getByRole('button', { name: 'Done' }).click();

  // ── import CSV in the learner's sheet format ──
  const csvPath = path.join(SHOTS, 'import.csv');
  fs.writeFileSync(csvPath, [
    'ôn 1000 từ IELTS,,,,,,,,,',
    'STT,Ngày thêm,Từ mới,Giải thích,Topic,loại từ,Ôn từ vựng,Check,Ví dụ 1,Ví dụ 2',
    '1,,groceries,thực phẩm và hàng tạp hóa,Daily life,Noun,groceries,TRUE,"I buy groceries, milk and bread.",',
    '2,,observant,có khả năng quan sát tốt,Daily life,Adj,observant,TRUE,,',
    '3,,demolish,phá bỏ,Agriculture / Animals,Verb,demolish,TRUE,,',
  ].join('\n'));
  await page.getByRole('button', { name: 'Import CSV' }).click();
  await page.getByLabel('CSV file').setInputFiles(csvPath);
  await page.getByText('3 words ready to import').waitFor();
  await page.getByRole('button', { name: 'Import 3 words' }).click();
  await page.getByText('Imported 2 words · 1 already in your notebook').waitFor();
  check('CSV import: 2 new, duplicate skipped', words().includes('groceries|noun|thực phẩm và hàng tạp hóa|Daily life') && words().includes('observant|adj'));

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export CSV' }).click()]);
  const exported = fs.readFileSync(await download.path(), 'utf8');
  check('CSV export in sheet column order', exported.replace(/^﻿/, '').startsWith('STT,Ngày thêm,Từ mới,Giải thích,Topic,loại từ,Ôn từ vựng,Check,Ví dụ 1') && exported.includes('"I buy groceries, milk and bread."'), exported.split('\r\n')[0]);

  // ── typing practice ──
  const id = (t) => sql(`select id from vocabulary where user_id='${uid}' and term='${t}'`);
  await page.goto(BASE + `/vocabulary/practice?ids=${id('demolish')},${id('shower')}`);
  await page.getByText('Look at the word and type it exactly.').waitFor();
  check('level 0 = copy mode', await page.getByText('demolish', { exact: true }).isVisible());
  await page.getByLabel('Your answer').fill('demolsh');
  await page.getByLabel('Your answer').press('Enter');
  await page.getByText('Not quite — the answer is:').waitFor();
  await page.screenshot({ path: `${SHOTS}/m5-04-typing-wrong.png` });
  await page.getByLabel('Type the correct word').fill('demolish');
  await page.getByLabel('Type the correct word').press('Enter');
  await page.getByText('Got it now').waitFor();
  check('wrong → must retype correctly', true);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByLabel('Your answer').fill('shower');
  await page.getByLabel('Your answer').press('Enter');
  await page.getByText('Correct!').waitFor();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByText('1 of 2 right on the first try').waitFor();
  await page.waitForTimeout(500);
  const lv = sql(`select string_agg(term || ':' || typing_level || ':' || status, ',' order by term) from vocabulary where user_id='${uid}' and term in ('demolish','shower')`);
  check('levels + status saved', lv === 'demolish:0:learning,shower:1:learning', lv);
  check('attempts saved', sql(`select count(*) || '/' || count(*) filter (where is_correct) from practice_attempts where user_id='${uid}'`) === '2/1');

  // level 1 = listen
  await page.goto(BASE + `/vocabulary/practice?ids=${id('shower')}`);
  await page.getByText('Type the word you hear.').waitFor();
  await page.getByRole('button', { name: 'Play the word' }).click();
  await page.waitForTimeout(250);
  check('listen mode speaks the word', (await page.evaluate(() => window.__spoken)).includes('shower'));
  await page.getByLabel('Your answer').fill('shower');
  await page.getByLabel('Your answer').press('Enter');
  await page.getByText('Correct!').waitFor();
  // level 2 = recall from meaning
  await page.goto(BASE + `/vocabulary/practice?ids=${id('shower')}`);
  await page.getByText('Type the word that means this.').waitFor();
  check('recall mode shows meaning', await page.getByText('vòi hoa sen').isVisible());
  await page.getByRole('button', { name: 'Hint' }).click();
  check('hint shows first letter', await page.getByText('s_____').isVisible());
  await page.getByLabel('Your answer').fill('shower');
  await page.getByLabel('Your answer').press('Enter');
  await page.getByText('Correct!').waitFor();
  // level 3 = cloze in context
  await page.goto(BASE + `/vocabulary/practice?ids=${id('shower')}`);
  await page.getByText('Type the missing word in the sentence.').waitFor();
  check('cloze uses the source sentence', await page.getByText('Then I take a quick').isVisible());
  await page.screenshot({ path: `${SHOTS}/m5-05-typing-cloze.png` });
  await page.getByLabel('Your answer').fill('shower');
  await page.getByLabel('Your answer').press('Enter');
  await page.getByText('Correct!').waitFor();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByText(/shower is now ready for spaced review/).waitFor();
  check('level 4 → handed to spaced review', sql(`select typing_level || ':' || status from vocabulary where user_id='${uid}' and term='shower'`) === '4:reviewing');

  // Chinese: IME Enter must not submit
  await page.goto(BASE + `/vocabulary/practice?ids=${id('超市')}`);
  await page.getByLabel('Your answer').fill('超市');
  await page.getByLabel('Your answer').evaluate((el) => {
    el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, isComposing: true }));
  });
  await page.waitForTimeout(300);
  check('IME Enter does not submit', !(await page.getByText('Correct!').isVisible()));
  await page.getByLabel('Your answer').evaluate((el) => el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true })));
  await page.waitForTimeout(50);
  await page.getByLabel('Your answer').press('Enter');
  await page.getByText('Correct!').waitFor();
  check('Chinese typing correct', true);

  await page.goto(BASE + '/dashboard');
  await page.getByTestId('stat-tiles').waitFor();
  await page.waitForTimeout(1200);
  check('dashboard counts saved words', /Words saved\s*6/.test(await page.getByTestId('stat-tiles').textContent()));

  const m = await (await browser.newContext({ viewport: { width: 390, height: 844 }, storageState: await ctx.storageState() })).newPage();
  await m.addInitScript(FAKE_TTS);
  await m.goto(BASE + '/vocabulary');
  await m.getByText('6 words').waitFor();
  await m.getByRole('button', { name: 'Details & edit' }).first().click();
  check('mobile: cards, no horizontal scroll', !(await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));
  await m.screenshot({ path: `${SHOTS}/m5-06-mobile.png`, fullPage: true });

  check('no console/page/API errors', errors.length === 0, errors.join(' | '));
  console.log(results.join('\n'));
  await browser.close();
})().catch((e) => { console.log(results.join('\n')); console.error('CRASH', e.message.slice(0, 900)); process.exit(1); });
