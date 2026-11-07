// Run via `npm run e2e` (see e2e/README.md). Args: <screenshots dir> [service role key]
const { chromium } = require('playwright');
const SHOTS = process.argv[2];
const BASE = 'http://localhost:5173';
const email = `m3_${Date.now()}@example.com`;
const results = [];
const check = (name, cond, extra = '') => results.push(`${cond ? 'PASS' : 'FAIL'}  ${name} ${extra}`);
const ZH1 = 'b0000000-0000-4000-8000-000000000301';

// Fake TTS engine: records utterances, "speaks" for 300 ms.
const FAKE_TTS = () => {
  const voices = [
    { name: 'Microsoft David', lang: 'en-US', localService: true, default: true, voiceURI: 'd' },
    { name: 'Google 普通话（中国大陆）', lang: 'zh-CN', localService: false, default: false, voiceURI: 'g' },
    { name: 'Google 粤語（香港）', lang: 'zh-HK', localService: false, default: false, voiceURI: 'h' },
  ];
  window.__spoken = [];
  let current = null;
  class U { constructor(t) { this.text = t; } }
  const synth = {
    paused: false,
    getVoices: () => voices,
    addEventListener() {}, removeEventListener() {},
    speak(u) {
      current = u;
      window.__spoken.push({ text: u.text, voice: u.voice && u.voice.name, rate: u.rate, volume: u.volume });
      u._t = setTimeout(() => { if (current === u) { current = null; u.onend && u.onend(); } }, 300);
    },
    cancel() { if (current) { const u = current; current = null; clearTimeout(u._t); u.onerror && u.onerror({ error: 'interrupted' }); } },
    resume() {},
  };
  Object.defineProperty(window, 'speechSynthesis', { value: synth });
  window.SpeechSynthesisUtterance = U;
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
  await page.getByLabel('Display name').fill('Hà');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('listen123');
  await page.getByLabel('Confirm password').fill('listen123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL(/onboarding/); // new accounts start in the learning-profile wizard
  await page.goto(BASE + '/dashboard');
  await page.waitForURL(/dashboard/);

  await page.getByRole('link', { name: /^Lessons/ }).first().click();
  // the study language (top bar) defaults to English
  await page.getByText('4 lessons').waitFor();
  check('lessons list: English only → 4', true);
  await page.screenshot({ path: `${SHOTS}/m3-01-lessons.png` });
  await page.getByTestId('study-switch').getByRole('radio', { name: /Tiếng Trung/ }).click();
  await page.getByText('8 lessons').waitFor();
  check('Chinese → 8', true);
  await page.getByLabel('HSK level').selectOption('6');
  await page.getByText('2 lessons').waitFor();
  check('Chinese + HSK 6 → 2', true);
  await page.getByRole('button', { name: 'Clear all filters' }).click();
  await page.getByLabel('Search lessons').fill('火车');
  await page.getByText('1 lesson', { exact: true }).waitFor();
  check('search by Chinese title', true);

  await page.goto(BASE + '/lessons/' + ZH1);
  await page.getByRole('heading', { name: '周末的计划' }).waitFor();
  check('detail: 10 sentences hidden', (await page.getByText('Hidden — listen first').count()) === 10);
  await page.getByRole('button', { name: 'Play sentence 2', exact: true }).click();
  await page.waitForTimeout(100);
  check('playing sentence shows stop state', (await page.getByRole('button', { name: 'Play sentence 2', exact: true }).locator('svg.lucide-pause').count()) === 1);
  await page.waitForTimeout(400);
  let spoken = await page.evaluate(() => window.__spoken);
  check('sentence 2 spoken with Mandarin voice at 1x', spoken.length === 1 && spoken[0].text === '我想先去超市买点儿东西，然后回家做饭。' && spoken[0].voice === 'Google 普通话（中国大陆）' && spoken[0].rate === 1, JSON.stringify(spoken[0]));

  await page.getByLabel('Speed').selectOption('0.75');
  await page.getByRole('button', { name: 'Play all' }).click();
  await page.waitForFunction(() => window.__spoken.length >= 3, null, { timeout: 5000 });
  await page.getByRole('button', { name: 'Stop' }).click();
  await page.waitForTimeout(1500);
  spoken = await page.evaluate(() => window.__spoken);
  const all = spoken.slice(1);
  check('play all goes in order at 0.75x', all[0].text.startsWith('这个周末') && all[1].text.startsWith('我想先去') && all.every((s) => s.rate === 0.75));
  check('stop ends the sequence', all.length <= 3, `spoke ${all.length}`);

  await page.getByRole('button', { name: 'Text' }).click();
  check('show text with pinyin ruby', (await page.locator('ruby').count()) > 50 && (await page.locator('rt', { hasText: 'zhōu' }).count()) >= 1);
  await page.getByRole('button', { name: 'Pinyin' }).click();
  check('pinyin toggle off', (await page.locator('ruby').count()) === 0);
  await page.getByRole('button', { name: 'Pinyin' }).click();
  await page.getByRole('button', { name: 'Tiếng Việt' }).click();
  check('translation shown', await page.getByText('Cuối tuần này bạn định làm gì?').isVisible());
  await page.screenshot({ path: `${SHOTS}/m3-02-lesson-zh.png`, fullPage: true });

  // Settings: choose voice + volume, verify they are used
  await page.goto(BASE + '/settings');
  await page.getByLabel('Chinese voice', { exact: true }).waitFor();
  const zhOptions = await page.getByLabel('Chinese voice', { exact: true }).locator('option').allTextContents();
  check('settings: Mandarin first, Cantonese after', zhOptions[1].startsWith('Google 普通话') && zhOptions[2].startsWith('Google 粤語'), zhOptions.join(' | '));
  await page.getByLabel('Chinese voice', { exact: true }).selectOption('Google 粤語（香港）');
  await page.getByText('Preferences saved').first().waitFor();
  await page.getByLabel('Volume').fill('60');
  await page.getByLabel('Volume').dispatchEvent('pointerup');
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SHOTS}/m3-03-settings.png`, fullPage: true });
  await page.goto(BASE + '/lessons/' + ZH1);
  await page.getByRole('button', { name: 'Play sentence 1', exact: true }).click();
  await page.waitForTimeout(500);
  spoken = await page.evaluate(() => window.__spoken);
  check('saved voice + volume applied', spoken.at(-1).voice === 'Google 粤語（香港）' && spoken.at(-1).volume === 0.6, JSON.stringify(spoken.at(-1)));

  // No-voice device on an English lesson
  const noVoice = await browser.newContext({ viewport: { width: 1280, height: 900 }, storageState: await ctx.storageState() });
  await noVoice.addInitScript(() => {
    const synth = { getVoices: () => [], addEventListener() {}, removeEventListener() {}, speak() {}, cancel() {}, resume() {}, paused: false };
    Object.defineProperty(window, 'speechSynthesis', { value: synth });
    window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
  });
  const p2 = await noVoice.newPage();
  await p2.goto(BASE + '/lessons/b0000000-0000-4000-8000-000000000e01');
  await p2.getByRole('heading', { name: 'Morning Routine' }).waitFor();
  await p2.getByRole('button', { name: 'Play sentence 1', exact: true }).click();
  await p2.getByText('No English voice is installed on this device.').waitFor({ timeout: 6000 });
  check('no voice → clear guidance', await p2.getByText('Audio unavailable').isVisible());
  await p2.screenshot({ path: `${SHOTS}/m3-04-no-voice.png` });

  // favourites + my learning still work
  await page.goto(BASE + '/lessons');
  await page.getByRole('button', { name: 'Add to favorites' }).first().click();
  await page.waitForTimeout(500);
  await page.goto(BASE + '/my-learning?tab=favorites');
  await page.locator('main a[href^="/lessons/b"]').first().waitFor();
  check('favorite lesson in My Learning', (await page.locator('main a[href^="/lessons/b"]').count()) === 1);

  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, storageState: await ctx.storageState() });
  await mctx.addInitScript(FAKE_TTS);
  const m = await mctx.newPage();
  await m.goto(BASE + '/lessons/b0000000-0000-4000-8000-000000000601');
  await m.getByRole('heading', { name: '城市化与乡愁' }).waitFor();
  await m.getByRole('button', { name: 'Text' }).click();
  check('mobile: no horizontal scroll with pinyin', !(await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));
  await m.screenshot({ path: `${SHOTS}/m3-05-mobile-lesson.png`, fullPage: true });

  check('no console/page/API errors', errors.length === 0, errors.join(' | '));
  console.log(results.join('\n'));
  await browser.close();
})().catch((e) => { console.log(results.join('\n')); console.error('CRASH', e.message.slice(0, 700)); process.exit(1); });
