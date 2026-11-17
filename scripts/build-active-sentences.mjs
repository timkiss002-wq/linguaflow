// Builds content/roadmap/active-sentences.json from content/roadmap/active-sentences.txt
// (3 simple Vietnamese sentences per active collocation, translated back into English with it).
// Usage: node scripts/build-active-sentences.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../content/roadmap/', import.meta.url);
const vocab = JSON.parse(readFileSync(new URL('active-vocab.json', root), 'utf8'));
const lines = readFileSync(new URL('active-sentences.txt', root), 'utf8').split(/\r?\n/);

const known = new Map(vocab.topics.map((t) => [t.id, new Set(t.words.map((w) => w.t))]));
const out = {};
const errors = [];
let topic = null;
let phrase = null;

lines.forEach((raw, i) => {
  const line = raw.trim();
  const at = `dòng ${i + 1}`;
  if (!line || (line.startsWith('#') && !phrase && !topic)) return;
  if (line.startsWith('@')) {
    topic = line.slice(1).trim();
    phrase = null;
    if (!known.has(topic)) errors.push(`${at}: không có chủ đề "${topic}"`);
    return;
  }
  if (line.startsWith('#')) {
    phrase = line.slice(1).trim();
    if (topic && !known.get(topic)?.has(phrase)) errors.push(`${at}: chủ đề ${topic} không có cụm "${phrase}"`);
    out[`${topic}:${phrase}`] = [];
    return;
  }
  if (!topic || !phrase) return errors.push(`${at}: câu nằm ngoài cụm`);
  const [vi, en, hint] = line.split('||').map((s) => s.trim());
  const answers = (en ?? '').split('|').map((s) => s.trim()).filter(Boolean);
  if (!vi || !answers.length) return errors.push(`${at}: thiếu câu tiếng Việt hoặc đáp án`);
  out[`${topic}:${phrase}`].push(hint ? { vi, en: answers, hint } : { vi, en: answers });
});

for (const [k, v] of Object.entries(out)) if (v.length !== 3) errors.push(`${k}: có ${v.length} câu (cần 3)`);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

const note =
  'Câu mẫu cho bài "Dịch câu với cụm từ" (Việt → Anh): 3 câu đơn giản cho mỗi cụm chủ động, khóa "chủ đề:cụm". ' +
  'Đừng sửa tay — sửa active-sentences.txt rồi chạy node scripts/build-active-sentences.mjs. Cụm chưa có câu thì bài dùng câu ví dụ có sẵn.';
writeFileSync(new URL('active-sentences.json', root), JSON.stringify({ _note: note, items: out }, null, 1) + '\n');
console.log(`${Object.keys(out).length} cụm, ${Object.values(out).flat().length} câu`);
