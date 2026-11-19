// Builds content/daily/translate.json from content/daily/translate.txt (the hand-edited source).
// Usage: node scripts/build-translate-daily.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'content/daily/translate.txt');
const out = join(root, 'content/daily/translate.json');

const tags = {};
const dialogues = [];
const stories = [];
let cur = null;
const errors = [];

readFileSync(src, 'utf8')
  .split(/\r?\n/)
  .forEach((raw, n) => {
    const line = raw.trim();
    if (!line || line.startsWith('#')) return;
    const at = `dòng ${n + 1}`;
    if (line.startsWith('@tag ')) {
      const [id, name, tip] = line.slice(5).split(' | ').map((s) => s.trim());
      if (!id || !name || !tip) errors.push(`${at}: @tag thiếu phần`);
      tags[id] = { name, tip };
      return;
    }
    const head = /^@(dialogue|story) (\S+) ([1-6]) (\S+) \| (.+)$/.exec(line);
    if (head) {
      cur = { id: head[2], level: Number(head[3]), scene: head[4], title: head[5].trim(), lines: [] };
      (head[1] === 'dialogue' ? dialogues : stories).push(cur);
      return;
    }
    if (line.startsWith('@')) return errors.push(`${at}: không hiểu "${line.slice(0, 40)}"`);
    if (!cur) return errors.push(`${at}: câu nằm ngoài bài`);
    const [vi, en, t, h] = line.split('||').map((s) => s.trim());
    const answers = (en ?? '').split('//').map((s) => s.trim()).filter(Boolean);
    const tagList = (t ?? '').split(/\s+/).filter(Boolean);
    if (!vi || !answers.length || !tagList.length) errors.push(`${at}: thiếu tiếng Việt, đáp án hoặc điểm ngữ pháp`);
    const l = { vi, en: answers, t: tagList };
    if (h) l.h = h;
    cur.lines.push(l);
  });

for (const x of [...dialogues, ...stories])
  for (const l of x.lines) for (const t of l.t) if (!tags[t]) errors.push(`${x.id}: điểm ngữ pháp "${t}" chưa khai báo bằng @tag`);
for (const d of dialogues) if (d.lines.length !== 4) errors.push(`${d.id}: hội thoại cần đúng 4 câu (có ${d.lines.length})`);
const ids = [...dialogues, ...stories].map((x) => x.id);
for (const id of ids) if (ids.indexOf(id) !== ids.lastIndexOf(id)) errors.push(`trùng id ${id}`);

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
writeFileSync(out, `${JSON.stringify({ tags, dialogues, stories }, null, 1)}\n`);
console.log(`translate.json: ${dialogues.length} hội thoại, ${stories.length} truyện, ${Object.keys(tags).length} điểm ngữ pháp`);
