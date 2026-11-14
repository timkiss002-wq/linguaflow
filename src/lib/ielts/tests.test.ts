import {
  TESTS,
  bandFor,
  countAnswerWords,
  findEvidence,
  markParts,
  markQuestion,
  normalizeAnswer,
  optionsFor,
  partQuestions,
  rawFor,
  statsByType,
  type QuestionGroup,
} from './tests';

describe('test content', () => {
  it.each(TESTS.map((t) => [t.id, t] as const))('%s is a complete 40-question test (or a bank of Part 1s)', (_id, t) => {
    if (t.pack) {
      // each Part 1 in the bank is its own 10-question exercise
      for (const p of t.parts) expect(partQuestions(p).map(({ q }) => q.n), p.id).toEqual(Array.from({ length: 10 }, (_, i) => i + 1));
    } else {
      const ns = t.parts.flatMap((p) => partQuestions(p).map(({ q }) => q.n));
      expect(ns).toEqual(Array.from({ length: 40 }, (_, i) => i + 1));
      expect(t.parts).toHaveLength(t.skill === 'reading' ? 3 : 4);
    }
    for (const p of t.parts) {
      if (t.skill === 'reading') expect(p.paragraphs?.length).toBeGreaterThan(3);
      else {
        expect(p.script?.length).toBeGreaterThan(0);
        for (const [who] of p.script!) expect(p.speakers?.[who!], `${p.id}: speaker ${who}`).toBeDefined();
      }
    }
  });

  it.each(TESTS.flatMap((t) => t.parts.map((p) => [p.id, t, p] as const)))('%s: answers, options and evidence are consistent', (_id, t, p) => {
    const text = t.skill === 'reading' ? p.paragraphs!.map((x) => x[1]).join('\n') : p.script!.map((x) => x[1]).join('\n');
    for (const { group, q } of partQuestions(p)) {
      expect(findEvidence(text, q.evidence), `Q${q.n} evidence not found: ${q.evidence}`).not.toBeNull();
      expect(q.explain_vi.length, `Q${q.n}`).toBeGreaterThan(10);
      for (const [a, b] of q.keys ?? []) {
        expect(q.text, `Q${q.n} key "${a}" not in the question`).toContain(a);
        expect(text, `Q${q.n} key "${b}" not in the text`).toContain(b);
      }
      if (q.pos_hint !== undefined) expect(group.type, `Q${q.n}: pos_hint is for gap questions`).toBe('gap');
      if (group.type === 'gap') {
        expect(Array.isArray(q.answer), `Q${q.n}`).toBe(true);
        expect(q.text, `Q${q.n} needs a ___ gap`).toContain('___');
        for (const a of q.answer as string[]) expect(markQuestion(group, q, a), `Q${q.n}: "${a}" must be accepted`).toBe('correct');
      } else {
        const keys = optionsFor(group, q).map((o) => o[0]);
        expect(keys, `Q${q.n}`).toContain(q.answer);
      }
    }
  });

  it('quotes vocabulary examples from the passage itself', () => {
    for (const t of TESTS)
      for (const p of t.parts)
        for (const v of p.vocab ?? []) {
          const text = p.paragraphs!.map((x) => x[1]).join('\n');
          expect(text, `${p.id} ${v.w}`).toContain(v.ex);
          expect(v.vi.length, `${p.id} ${v.w}`).toBeGreaterThan(1);
        }
  });

  it('has unique test, part and question ids', () => {
    expect(new Set(TESTS.map((t) => t.id)).size).toBe(TESTS.length);
    const parts = TESTS.flatMap((t) => t.parts.map((p) => p.id));
    expect(new Set(parts).size).toBe(parts.length);
  });

  it('reading passages are long enough to be realistic', () => {
    for (const p of TESTS.filter((t) => t.skill === 'reading').flatMap((t) => t.parts)) {
      const words = p.paragraphs!.map((x) => x[1]).join(' ').split(/\s+/).length;
      expect(words, p.id).toBeGreaterThan(450);
    }
  });
});

const gap = (maxWords: number, allowNumber = false): QuestionGroup => ({ type: 'gap', instructions: '', maxWords, allowNumber, questions: [] });
const q = (answer: string[]) => ({ n: 1, text: '___', answer, evidence: '', explain_vi: '' });

describe('marking', () => {
  it('normalises case, accents, hyphens and leading articles', () => {
    expect(normalizeAnswer('  The Café ')).toBe('cafe');
    expect(normalizeAnswer('Study-Skills')).toBe('study skills');
    expect(normalizeAnswer('£85')).toBe('85');
    expect(normalizeAnswer('382 615')).toBe('382615');
  });

  it('counts words, numbers free when allowed', () => {
    expect(countAnswerWords('heavy metals')).toBe(2);
    expect(countAnswerWords('14th May', true)).toBe(1);
    expect(countAnswerWords('382 615', true)).toBe(0);
  });

  it('marks gap answers like the exam', () => {
    expect(markQuestion(gap(2), q(['heavy metals']), 'Heavy metals')).toBe('correct');
    expect(markQuestion(gap(2), q(['heavy metals']), 'heavy metal')).toBe('spelling');
    expect(markQuestion(gap(2), q(['heavy metals']), 'small amounts of heavy metals')).toBe('too_long');
    expect(markQuestion(gap(1), q(['cafe', 'café']), 'the café')).toBe('too_long');
    expect(markQuestion(gap(1), q(['cafe']), 'boathouse')).toBe('wrong');
    expect(markQuestion(gap(1), q(['cafe']), '  ')).toBe('empty');
    expect(markQuestion(gap(1, true), q(['14', '14th']), '14th')).toBe('correct');
    expect(markQuestion(gap(1, true), q(['382615']), '382-615')).toBe('correct');
  });

  it('marks choices exactly', () => {
    const g: QuestionGroup = { type: 'tfng', instructions: '', questions: [] };
    const tq = { n: 1, text: '', answer: 'NOT GIVEN', evidence: '', explain_vi: '' };
    expect(markQuestion(g, tq, 'NOT GIVEN')).toBe('correct');
    expect(markQuestion(g, tq, 'FALSE')).toBe('wrong');
    expect(markQuestion(g, tq, undefined)).toBe('empty');
  });

  it('marks the parts that were taken', () => {
    const t = TESTS.find((x) => x.id === 'reading-1')!;
    const part = t.parts[0]!;
    const qs = part.groups.flatMap((g) => g.questions);
    const first = qs[0]!;
    const right = Array.isArray(first.answer) ? first.answer[0]! : first.answer;
    const r = markParts(t, [part.id], { [first.n]: right });
    expect(r).toHaveLength(qs.length);
    expect(r.find((x) => x.n === first.n)!.mark).toBe('correct');
    expect(r.find((x) => x.n === qs[1]!.n)!.mark).toBe('empty');
  });

  it('has no Listening tests any more', () => {
    expect(TESTS.every((x) => x.skill === 'reading')).toBe(true);
  });
});

describe('bands and stats', () => {
  it('converts a full test to a band, not a partial one', () => {
    expect(bandFor('listening', 30, 40)).toBe(7);
    expect(bandFor('listening', 26, 40)).toBe(6.5);
    expect(bandFor('reading', 27, 40)).toBe(6.5);
    expect(bandFor('reading', 40, 40)).toBe(9);
    expect(bandFor('reading', 0, 40)).toBe(0);
    expect(bandFor('reading', 10, 13)).toBeNull();
    expect(rawFor('reading', 6.5)).toBe(27);
  });

  it('groups results by question type, weakest first', () => {
    const s = statsByType([
      { type: 'gap', mark: 'correct' },
      { type: 'gap', mark: 'spelling' },
      { type: 'tfng', mark: 'wrong' },
      { type: 'tfng', mark: 'wrong' },
    ]);
    expect(s[0]).toEqual({ type: 'tfng', answered: 2, correct: 0, form: 0 });
    expect(s[1]).toEqual({ type: 'gap', answered: 2, correct: 1, form: 1 });
  });
});
