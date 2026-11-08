/**
 * Automatic keyword pairing for a Passage 3 the learner pasted: the prompt sent to Gemini, the JSON schema it must
 * answer with, and strict validation of the answer. Plain TypeScript with no imports, shared by the Edge Function
 * (Deno) and the app/tests (Vite).
 *
 * For every question the model returns its keywords (copied exactly from the question) and, for each, the phrase in
 * the passage that says the same thing (copied exactly from the passage) — or null when the passage has no partner,
 * which is the sign of NOT GIVEN. For a gap ("____") the keyword is "____" and the partner is the passage phrase that
 * fills it.
 */

export type P3Kind = 'tfng' | 'ynng' | 'mcq' | 'gap';

export interface PairRequest {
  type: P3Kind;
  passage: string;
  /** question text only (no answer); MCQ options may follow after " || " */
  questions: string[];
}

export interface AutoPair {
  /** the keyword as it appears in the question ("____" for a gap) */
  q: string;
  /** the phrase in the passage, verbatim, or null when the passage has no partner */
  p: string | null;
  /** short Vietnamese meaning of the pair */
  vi: string;
  /** names, numbers and words repeated unchanged: shown already paired */
  obvious: boolean;
}

export const MAX_PASSAGE = 6000;
export const MAX_QUESTIONS = 15;

const KIND: Record<P3Kind, string> = {
  tfng: 'TRUE / FALSE / NOT GIVEN statements',
  ynng: 'YES / NO / NOT GIVEN statements about the writer\'s views',
  mcq: 'multiple-choice questions (question stem, then options after "||")',
  gap: 'summary-completion sentences, where "____" is the gap',
};

export function buildPrompt(r: PairRequest) {
  const system = [
    'You help a Vietnamese learner practise IELTS Reading Passage 3 with the keyword-pairing method:',
    'before answering, every keyword of a question is paired with the words in the passage that express the same idea',
    '(a synonym, paraphrase, word-form change or the same name/number). A keyword with no partner suggests NOT GIVEN;',
    'a partner with the opposite meaning suggests FALSE/NO.',
    '',
    'For each question, list 2–5 keywords in the order they appear. Rules:',
    '- "q" must be copied EXACTLY from the question (a word or short phrase, never the whole sentence; for MCQ use the stem only).',
    '- "p" must be copied EXACTLY, character for character, from the passage: the shortest phrase that matches q. Use null only when the passage has nothing for that keyword.',
    '- For a gap question, include one keyword with q = "____" and p = the passage words that fill the gap.',
    '- "obvious" is true for names, numbers, dates and words repeated unchanged in the passage; false for paraphrases.',
    '- "vi": a short Vietnamese gloss of the passage phrase (or why there is no partner), at most 12 words.',
    'Answer with JSON only.',
  ].join('\n');
  const user = [
    `Question type: ${KIND[r.type]}`,
    '',
    'PASSAGE:',
    r.passage.slice(0, MAX_PASSAGE),
    '',
    'QUESTIONS:',
    ...r.questions.slice(0, MAX_QUESTIONS).map((q, i) => `${i + 1}. ${q}`),
  ].join('\n');
  return { system, user };
}

export function responseSchema() {
  return {
    type: 'OBJECT',
    properties: {
      questions: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            n: { type: 'INTEGER' },
            keywords: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: { q: { type: 'STRING' }, p: { type: 'STRING', nullable: true }, vi: { type: 'STRING' }, obvious: { type: 'BOOLEAN' } },
                required: ['q', 'p', 'vi', 'obvious'],
              },
            },
          },
          required: ['n', 'keywords'],
        },
      },
    },
    required: ['questions'],
  };
}

export function geminiPairsBody(r: PairRequest) {
  const { system, user } = buildPrompt(r);
  return {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: user }] }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: responseSchema(), temperature: 0.1 },
  };
}

const squash = (s: string) => s.replace(/\s+/g, ' ').trim();
const has = (hay: string, needle: string) => squash(hay).toLowerCase().includes(squash(needle).toLowerCase());

/**
 * The model's JSON as one list of pairs per question, or throws. A keyword not found in its question, or a partner
 * not found verbatim in the passage, is dropped rather than trusted.
 */
export function parsePairs(raw: string, r: PairRequest): AutoPair[][] {
  let data: { questions?: { n?: number; keywords?: unknown[] }[] };
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('AI answer is not JSON');
  }
  if (!Array.isArray(data?.questions)) throw new Error('AI answer has no questions');
  const out: AutoPair[][] = r.questions.map(() => []);
  data.questions.forEach((qq, k) => {
    const idx = Number.isInteger(qq?.n) && qq.n! >= 1 && qq.n! <= r.questions.length ? qq.n! - 1 : k;
    const stem = (r.questions[idx] ?? '').split('||')[0] ?? '';
    if (!stem || !Array.isArray(qq?.keywords)) return;
    const seen = new Set<string>();
    for (const kw of qq.keywords.slice(0, 6) as Record<string, unknown>[]) {
      const q = typeof kw?.q === 'string' ? squash(kw.q) : '';
      const p = typeof kw?.p === 'string' && kw.p.trim() ? squash(kw.p) : null;
      if (!q || q.length > 80 || seen.has(q.toLowerCase())) continue;
      const isGap = /^_{3,}$/.test(q);
      if (isGap ? !/_{3,}/.test(stem) : !has(stem, q)) continue;
      if (p && (!has(r.passage, p) || p.length > 160)) continue;
      if (isGap && !p) continue;
      seen.add(q.toLowerCase());
      out[idx]!.push({ q: isGap ? '____' : q, p, vi: typeof kw.vi === 'string' ? kw.vi.trim().slice(0, 120) : '', obvious: kw.obvious === true && !!p });
    }
  });
  if (!out.some((l) => l.length)) throw new Error('AI found no usable pairs');
  return out;
}
