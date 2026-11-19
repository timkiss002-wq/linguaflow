// Builds content/daily/argue.json from content/daily/argue.txt (the hand-edited source).
// Usage: node scripts/build-argue-daily.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const KINDS = ['topic', 'example', 'weak', 'hedge', 'signpost', 'link', 'counter'];
const ROLES = ['P', 'E', 'X', 'L', 'O', 'R'];
const paragraphs = [];
const questions = [];
let cur = null;
let level = 1;
const errors = [];
readFileSync(join(root, 'content/daily/argue.txt'), 'utf8')
  .split(/\r?\n/)
  .forEach((raw, n) => {
    const line = raw.trim();
    const at = `dòng ${n + 1}`;
    const lv = /^#+ CẤP (\d)/.exec(line);
    if (lv) level = Number(lv[1]);
    if (!line || line.startsWith('#')) return;
    const p = /^@para (\S+) ([1-3]) (\S+) \| (.+?) \| (.+)$/.exec(line);
    if (p) {
      cur = { id: p[1], level: Number(p[2]), scene: p[3], topic: p[4].trim(), prompt: p[5].trim(), s: [] };
      paragraphs.push(cur);
      return;
    }
    if (line.startsWith('? ')) {
      cur = null;
      const [head, opts, w] = line.slice(2).split('||').map((s) => s.trim());
      const kind = head.split(' ')[0];
      const q = head.slice(kind.length).trim();
      const o = (opts ?? '').split('|').map((s) => s.trim()).filter(Boolean);
      if (!KINDS.includes(kind)) errors.push(`${at}: loại câu hỏi "${kind}" không có`);
      if (o.length !== 4 || new Set(o).size !== 4 || !w) errors.push(`${at}: cần 4 phương án khác nhau và giải thích`);
      questions.push({ kind, level, q, o, w });
      return;
    }
    const s = /^([A-Z]) (.+)$/.exec(line);
    if (s && cur && ROLES.includes(s[1])) {
      cur.s.push({ r: s[1], t: s[2].trim() });
      return;
    }
    errors.push(`${at}: không hiểu "${line.slice(0, 40)}"`);
  });
for (const p of paragraphs) if (p.s.length < 4 || p.s.length > 6) errors.push(`${p.id}: đoạn cần 4–6 câu`);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
writeFileSync(join(root, 'content/daily/argue.json'), `${JSON.stringify({ paragraphs, questions }, null, 1)}\n`);
console.log(`argue.json: ${paragraphs.length} đoạn, ${questions.length} câu hỏi`);
