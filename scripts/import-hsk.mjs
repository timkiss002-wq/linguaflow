// One-off: converts complete.json from https://github.com/drkameleon/complete-hsk-vocabulary (MIT)
// into content/hsk-words.json. Usage: node scripts/import-hsk.mjs /path/to/complete.json
import { readFileSync, writeFileSync } from 'node:fs';

const src = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const level = (levels, prefix) => {
  const hit = levels.map((l) => /^(old|new)-(\d)$/.exec(l)).find((m) => m && m[1] === prefix);
  return hit ? Number(hit[2]) : null;
};

const seen = new Set();
const words = [];
for (const e of src) {
  const w = e.simplified?.trim();
  if (!w || seen.has(w)) continue;
  const v2 = level(e.level ?? [], 'old');
  const v3 = level(e.level ?? [], 'new');
  if (v2 === null && v3 === null) continue; // only in unofficial lists
  seen.add(w);
  const form = e.forms?.[0];
  const meaning = (form?.meanings ?? []).slice(0, 2).join('; ').slice(0, 120);
  words.push([w, form?.transcriptions?.pinyin ?? '', v2, v3, meaning]);
}
words.sort((a, b) => (a[2] ?? 9) - (b[2] ?? 9) || (a[3] ?? 9) - (b[3] ?? 9) || a[0].localeCompare(b[0], 'zh'));

writeFileSync(
  new URL('../content/hsk-words.json', import.meta.url),
  JSON.stringify({
    $comment:
      'HSK vocabulary: [word, pinyin, HSK 2.0 level (1-6), HSK 3.0 level (1-7, where 7 = levels 7-9), English meaning]. ' +
      'Source: complete-hsk-vocabulary by Yanis Zafirópulos (MIT License), https://github.com/drkameleon/complete-hsk-vocabulary',
    words,
  }).replace(/\],\[/g, '],\n['),
);
const by = (i) => [1, 2, 3, 4, 5, 6, 7].map((l) => words.filter((x) => x[i] === l).length);
console.log(`${words.length} words · HSK 2.0 per level ${by(2)} · HSK 3.0 per level ${by(3)}`);
