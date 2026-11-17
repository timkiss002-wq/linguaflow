// Builds content/roadmap/writing-weeks.json from content/roadmap/writing-weeks.txt
// (one Writing topic per week: word forms, extra words, a model paragraph to translate, a prompt to write alone).
// Usage: node scripts/build-writing-weeks.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../content/roadmap/', import.meta.url);
const vocab = JSON.parse(readFileSync(new URL('active-vocab.json', root), 'utf8'));
const topics = new Map(vocab.topics.map((t) => [t.id, t]));
const lines = readFileSync(new URL('writing-weeks.txt', root), 'utf8').split(/\r?\n/);

const weeks = [];
const errors = [];
let w = null;
let section = null;
let family = null;
const POS = new Set(['n', 'v', 'adj', 'adv', 'n/v', 'n/adj', 'adj/n', 'adj/adv', 'v/n']);

/** "50,000" is also accepted as "50000". */
const withNumbers = (list) => [...new Set(list.flatMap((s) => (/\d,\d{3}/.test(s) ? [s, s.replace(/(\d),(\d{3})/g, '$1$2')] : [s])))];

lines.forEach((raw, i) => {
  const line = raw.trim();
  const at = `dòng ${i + 1}`;
  if (!line || (line.startsWith('#') && !w)) return;
  if (line.startsWith('===')) {
    const [n, topic, title] = line.slice(3).split('|').map((s) => s.trim());
    if (!topics.has(topic)) errors.push(`${at}: không có chủ đề "${topic}"`);
    w = { week: Number(n), topic, title, forms: [], bank: [], paragraph: [] };
    weeks.push(w);
    section = null;
    return;
  }
  if (!w) return;
  const field = line.match(/^(prompt|prompt_vi|own|own_vi):\s*(.+)$/);
  if (field) {
    w[field[1]] = field[2];
    return;
  }
  if (line.startsWith('@')) {
    section = line.slice(1).trim();
    family = null;
    return;
  }
  if (section === 'forms') {
    if (line.startsWith('- ')) {
      if (!family) return errors.push(`${at}: câu điền nằm ngoài họ từ`);
      const [s, why] = line.slice(2).split('||').map((x) => x.trim());
      const m = s.match(/\[([^\]]+)\]/);
      if (!m || !why) return errors.push(`${at}: câu điền cần [đáp án] và giải thích`);
      family.gaps.push({ s: s.replace(/\[[^\]]+\]/, '____'), a: m[1].split('/').map((x) => x.trim()), why });
      return;
    }
    const [head, rest] = line.split('|').map((x) => x.trim());
    const words = (rest ?? '').split(';').map((x) => x.trim()).filter(Boolean).map((x) => {
      const mm = x.match(/^(.+?)\s*\(([^)]+)\)\s*(.+)$/);
      if (!mm || !POS.has(mm[2])) errors.push(`${at}: không đọc được "${x}"`);
      return mm ? { w: mm[1], pos: mm[2], m: mm[3] } : { w: x, pos: '', m: '' };
    });
    family = { head, words, gaps: [] };
    w.forms.push(family);
    return;
  }
  if (section === 'bank') {
    const [type, term, m, ex] = line.split('|').map((x) => x.trim());
    if (!type || !term || !m) return errors.push(`${at}: từ bổ sung thiếu cột`);
    w.bank.push({ type, term, m, ex: ex && ex !== '—' ? ex : '' });
    return;
  }
  if (section === 'paragraph') {
    const [vi, en, use, hint] = line.split('||').map((x) => x.trim());
    const answers = (en ?? '').split('|').map((x) => x.trim()).filter(Boolean);
    if (!vi || !answers.length || !use) return errors.push(`${at}: câu đoạn văn thiếu cột`);
    w.paragraph.push({ vi, en: withNumbers(answers), use, hint: hint ?? '' });
    return;
  }
  errors.push(`${at}: dòng không thuộc mục nào`);
});

for (const x of weeks) {
  for (const k of ['prompt', 'prompt_vi', 'own', 'own_vi']) if (!x[k]) errors.push(`tuần ${x.week}: thiếu ${k}`);
  if (x.forms.length < 6) errors.push(`tuần ${x.week}: cần ít nhất 6 họ từ`);
  for (const f of x.forms) if (f.gaps.length < 2) errors.push(`tuần ${x.week} · ${f.head}: cần 2 câu điền`);
  if (x.paragraph.length < 6) errors.push(`tuần ${x.week}: đoạn văn quá ngắn`);
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

const note =
  'Writing theo tuần (đề, word form, từ bổ sung, đoạn văn mẫu dịch Việt → Anh). Đừng sửa tay — sửa writing-weeks.txt rồi chạy ' +
  'node scripts/build-writing-weeks.mjs.';
writeFileSync(new URL('writing-weeks.json', root), JSON.stringify({ _note: note, weeks }, null, 1) + '\n');
console.log(`${weeks.length} tuần, ${weeks.reduce((n, x) => n + x.forms.length, 0)} họ từ, ${weeks.reduce((n, x) => n + x.forms.reduce((k, f) => k + f.gaps.length, 0), 0)} câu điền, ${weeks.reduce((n, x) => n + x.paragraph.length, 0)} câu đoạn văn`);
