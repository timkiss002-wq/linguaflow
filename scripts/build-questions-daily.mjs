// Builds content/daily/questions.json from content/daily/questions.txt (the hand-edited source).
// Usage: node scripts/build-questions-daily.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const groups = [];
let cur = null;
const errors = [];
readFileSync(join(root, 'content/daily/questions.txt'), 'utf8')
  .split(/\r?\n/)
  .forEach((raw, n) => {
    const line = raw.trim();
    if (!line || line.startsWith('#')) return;
    const at = `dòng ${n + 1}`;
    const g = /^@group (\S+) ([1-6]) (\S+) \| (.+?) \| (.+)$/.exec(line);
    if (g) {
      cur = { id: g[1], level: Number(g[2]), tags: g[3].split(','), name: g[4].trim(), tip: g[5].trim(), items: [] };
      groups.push(cur);
      return;
    }
    if (!cur) return errors.push(`${at}: nằm ngoài nhóm`);
    const kind = line[0];
    if (kind !== '?' && kind !== '>') return errors.push(`${at}: không hiểu "${line.slice(0, 30)}"`);
    const [prompt, ans, w] = line.slice(1).split('||').map((s) => s.trim());
    const en = (ans ?? '').split('//').map((s) => s.trim()).filter(Boolean);
    if (!prompt || !en.length || !w) return errors.push(`${at}: cần câu, đáp án và giải thích`);
    if (kind === '?' && !/\[[^\]]+\]/.test(prompt)) return errors.push(`${at}: thiếu [phần cần hỏi]`);
    cur.items.push({ k: kind === '?' ? 'ask' : 'vi', p: prompt, en, w });
  });
const ids = groups.map((g) => g.id);
for (const id of ids) if (ids.indexOf(id) !== ids.lastIndexOf(id)) errors.push(`trùng nhóm ${id}`);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
writeFileSync(join(root, 'content/daily/questions.json'), `${JSON.stringify({ groups }, null, 1)}\n`);
console.log(`questions.json: ${groups.length} nhóm, ${groups.reduce((s, g) => s + g.items.length, 0)} câu`);
