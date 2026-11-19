// Builds content/daily/linking.json from content/daily/linking.txt (the hand-edited source).
// Usage: node scripts/build-linking-daily.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const groups = [];
let cur = null;
const errors = [];
readFileSync(join(root, 'content/daily/linking.txt'), 'utf8')
  .split(/\r?\n/)
  .forEach((raw, n) => {
    const line = raw.trim();
    if (!line || line.startsWith('#')) return;
    const at = `dòng ${n + 1}`;
    const g = /^@group (\S+) ([1-4]) \| (.+?) \| (.+)$/.exec(line);
    if (g) {
      cur = { id: g[1], level: Number(g[2]), name: g[3].trim(), tip: g[4].trim(), mcq: [], join: [], fix: [] };
      groups.push(cur);
      return;
    }
    if (!cur) return errors.push(`${at}: nằm ngoài nhóm`);
    const kind = line[0];
    const parts = line.slice(1).split('||').map((s) => s.trim());
    if (kind === '?') {
      const [q, opts, w] = parts;
      const o = (opts ?? '').split('|').map((s) => s.trim()).filter(Boolean);
      if (!q?.includes('___') || o.length !== 4 || !w) return errors.push(`${at}: câu trắc nghiệm cần ___, 4 phương án và giải thích`);
      if (new Set(o).size !== 4) errors.push(`${at}: phương án trùng`);
      cur.mcq.push({ q, o, w });
    } else if (kind === '+') {
      const [pair, use, ans, w] = parts;
      const [a, b] = (pair ?? '').split('//').map((s) => s.trim());
      const en = (ans ?? '').split('//').map((s) => s.trim()).filter(Boolean);
      if (!a || !b || !use || !en.length || !w) return errors.push(`${at}: câu nối cần 2 câu, từ nối, đáp án, giải thích`);
      cur.join.push({ a, b, use, en, w });
    } else if (kind === '!') {
      const [wrong, ans, w] = parts;
      const en = (ans ?? '').split('//').map((s) => s.trim()).filter(Boolean);
      if (!wrong || !en.length || !w) return errors.push(`${at}: câu sửa lỗi cần câu sai, đáp án, giải thích`);
      cur.fix.push({ wrong, en, w });
    } else errors.push(`${at}: không hiểu "${line.slice(0, 30)}"`);
  });
const ids = groups.map((g) => g.id);
for (const id of ids) if (ids.indexOf(id) !== ids.lastIndexOf(id)) errors.push(`trùng nhóm ${id}`);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
writeFileSync(join(root, 'content/daily/linking.json'), `${JSON.stringify({ groups }, null, 1)}\n`);
const sum = (k) => groups.reduce((s, g) => s + g[k].length, 0);
console.log(`linking.json: ${groups.length} nhóm, ${sum('mcq')} trắc nghiệm, ${sum('join')} nối câu, ${sum('fix')} sửa lỗi`);
