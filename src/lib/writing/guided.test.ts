import {
  BANDS,
  GUIDED_PROMPTS,
  GUIDED_TYPES,
  assembleEssay,
  blankTemplate,
  checkFrame,
  checkFrameOnly,
  checkSentence,
  countWords,
  findPhrase,
  guidedType,
  hintWords,
  mapPosition,
  modelEssay,
  TASK_RULES,
  paragraphLabel,
  promptWithData,
  slotOf,
  templateParts,
  visiblePrompt,
} from './guided';
import tasks from '../../../content/writing-tasks.json';

describe('guided content', () => {
  it('has six Task 1 and five Task 2 question types with distinct slot ids', () => {
    expect(GUIDED_TYPES.map((t) => t.id)).toEqual(['line', 'bar', 'pie', 'table', 'process', 'map', 'agree', 'discuss', 'advantages', 'problem', 'twopart']);
    expect(GUIDED_TYPES.filter((t) => t.task === 1)).toHaveLength(6);
    const ids = GUIDED_TYPES.flatMap((t) => t.frame.map((s) => s.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every template contains its own fixed phrases', () => {
    for (const t of GUIDED_TYPES)
      for (const s of t.frame) expect(checkFrame(s.t.replace(/___/g, 'something'), s).every((f) => f.found && !f.typo), `${s.id}: ${s.t}`).toBe(true);
  });

  it.each(GUIDED_PROMPTS.map((p) => [p.id, p] as const))('%s follows its frame at every band', (_id, p) => {
    const type = guidedType(p.type)!;
    expect(type).toBeDefined();
    // same slots, same order as the frame: the essay is the frame, filled in
    expect(p.sentences.map((s) => s.slot)).toEqual(type.frame.map((s) => s.id));
    for (const s of p.sentences) {
      expect(s.vi.trim().length, `${p.id} ${s.slot} vi`).toBeGreaterThan(5);
      for (const b of BANDS) {
        const text = s.en[b];
        expect(text, `${p.id} ${s.slot} ${b}`).toMatch(/^[A-Z].*[.!?]$/);
        const missing = checkFrame(text, slotOf(type, s.slot)!).filter((f) => !f.found || f.typo);
        expect(missing, `${p.id} ${s.slot} ${b}: ${text}`).toEqual([]);
      }
    }
    for (const b of BANDS) expect(countWords(modelEssay(p, b)), `${p.id} ${b}`).toBeGreaterThanOrEqual(type.task === 1 ? 150 : 245);
    expect(Boolean(p.chart), `${p.id}: Task 1 prompts need a figure`).toBe(type.task === 1);
  });

  it('every prompt points at an IELTS essay task with the same prompt text', () => {
    for (const p of GUIDED_PROMPTS) {
      const t = tasks.tasks.find((x) => x.id === p.task);
      expect(t, p.task).toBeDefined();
      expect(t!.kind).toBe('essay');
      expect(t!.exam).toBe('ielts');
      expect(visiblePrompt(t!.prompt)).toBe(p.prompt);
      expect(t!.prompt).toBe(promptWithData(p));
      const task = guidedType(p.type)!.task;
      expect(t!.min, p.task).toBe(TASK_RULES[task].words);
      // the AI cannot see the figure: Task 1 prompts carry its data as text
      expect(t!.prompt.includes('[Chart data]'), p.task).toBe(task === 1);
    }
  });

  it('has three prompts per Task 2 type, two per Task 1 chart type and one map', () => {
    for (const t of GUIDED_TYPES) expect(GUIDED_PROMPTS.filter((p) => p.type === t.id)).toHaveLength(t.id === 'map' ? 1 : t.task === 1 ? 2 : 3);
  });

  it('names Task 1 paragraphs after their job', () => {
    expect(paragraphLabel(guidedType('line'), 2)).toMatch(/Overview/);
    expect(paragraphLabel(guidedType('agree'), 4)).toBe('Kết bài');
  });
});

describe('findPhrase', () => {
  it('ignores case and punctuation', () => {
    expect(findPhrase('for EXAMPLE many people...', 'For example,')).toEqual({ found: true, typo: false });
  });
  it('accepts a small typo but reports it', () => {
    expect(findPhrase('In conclution, I strongly believe that it works.', 'In conclusion, I strongly believe that')).toEqual({ found: true, typo: true });
  });
  it('needs the words in order and next to each other', () => {
    expect(findPhrase('This because is', 'This is because').found).toBe(false);
    expect(findPhrase('This is, I think, because', 'This is because').found).toBe(false);
  });
  it('treats curly apostrophes like straight ones', () => {
    expect(findPhrase('people’s lives', "people's lives").found).toBe(true);
  });
});

const agree = guidedType('agree')!;
const tech = GUIDED_PROMPTS.find((p) => p.id === 'g-tech')!;
const s = (slot: string) => tech.sentences.find((x) => x.slot === slot)!;

describe('checkSentence', () => {
  it('a copy of the model is great', () => {
    const r = checkSentence(s('a-b2').en['6.5'], s('a-b2'), slotOf(agree, 'a-b2')!, '6.5');
    expect(r.verdict).toBe('great');
    expect(r.accuracy).toBe(100);
    expect(r.closest).toBe('6.5');
    expect(r.missing).toEqual([]);
  });

  it('finds the closest band', () => {
    const r = checkSentence(s('a-c5').en['7.5'], s('a-c5'), slotOf(agree, 'a-c5')!, '6.5');
    expect(r.closest).toBe('7.5');
    expect(r.verdict).toBe('great');
  });

  it('a different wording with the frame is "good" or "different", never "frame"', () => {
    const r = checkSentence('This is because social networks and games are built to keep people on their screens as long as possible.', s('a-b2'), slotOf(agree, 'a-b2')!, '6.5');
    expect(r.frameOk).toBe(true);
    expect(['good', 'different']).toContain(r.verdict);
    expect(r.missing.length).toBeGreaterThan(0);
  });

  it('without the frame phrase the verdict is "frame"', () => {
    const r = checkSentence('Because social media platforms and online games are designed to hold users attention for as long as possible.', s('a-b2'), slotOf(agree, 'a-b2')!, '6.5');
    expect(r.verdict).toBe('frame');
    expect(r.frame).toEqual([{ phrase: 'This is because', found: false, typo: false }]);
  });

  it('accepts either alternative of a fixed phrase', () => {
    const slot = slotOf(agree, 'a-i2')!;
    expect(checkFrame('I completely disagree with this view for two main reasons.', slot).every((f) => f.found)).toBe(true);
  });

  it('adds form notes in Vietnamese', () => {
    const r = checkSentence("this is because i don't know", s('a-b2'), slotOf(agree, 'a-b2')!, '6.5');
    expect(r.notes.join(' ')).toMatch(/Viết hoa/);
    expect(r.notes.join(' ')).toMatch(/dấu chấm/);
    expect(r.notes.join(' ')).toMatch(/“I”/);
    expect(r.notes.join(' ')).toMatch(/viết tắt/);
    expect(r.notes.join(' ')).toMatch(/ngắn hơn/);
  });
});

describe('frame drill', () => {
  it('blanks the fixed phrases of the template', () => {
    expect(blankTemplate(slotOf(agree, 'a-b1')!)).toBe('[ ? ] ___.');
    expect(blankTemplate(slotOf(agree, 'a-i2')!)).toBe('[ ? ] [ ? ].');
  });
  it('only the fixed phrases count, typos do not pass', () => {
    const slot = slotOf(agree, 'a-d1')!;
    expect(checkFrameOnly('In conclusion, I strongly believe that', slot).ok).toBe(true);
    expect(checkFrameOnly('In conclution, I strongly believe that', slot).ok).toBe(false);
  });
});

describe('helpers', () => {
  it('describes where a map feature is in Task 1 words', () => {
    const f = (x: number, y: number, w: number, h: number) => ({ name: '', kind: 'building' as const, x, y, w, h });
    expect(mapPosition(f(3, 3, 30, 20))).toBe('north-west');
    expect(mapPosition(f(40, 3, 20, 20))).toBe('north');
    expect(mapPosition(f(62, 38, 12, 10))).toBe('south-east');
    expect(mapPosition(f(0, 28, 100, 4))).toBe('east–west across the centre');
    expect(mapPosition(f(0, 56, 100, 14))).toBe('along the southern edge');
    expect(mapPosition(f(84, 32, 5, 38))).toBe('runs north–south in the east');
    expect(mapPosition(f(45, 28, 10, 10))).toBe('centre');
  });

  it('hint words leave out the frame and small words', () => {
    const h = hintWords(s('a-b2').en['6.5'], slotOf(agree, 'a-b2')!);
    expect(h.length).toBeLessThanOrEqual(4);
    expect(h).not.toContain('this');
    expect(h).not.toContain('because');
    expect(h).toContain('platforms');
  });
  it('assembles paragraphs in order', () => {
    expect(assembleEssay([{ p: 2, text: 'B.' }, { p: 1, text: 'A1.' }, { p: 1, text: ' A2. ' }, { p: 3, text: '' }])).toBe('A1. A2.\n\nB.');
  });
  it('marks the fixed phrases of a template', () => {
    expect(templateParts(slotOf(agree, 'a-d2')!)).toEqual([
      { text: 'For this reason', fixed: true },
      { text: ', ___ ', fixed: false },
      { text: 'should', fixed: true },
      { text: ' ___.', fixed: false },
    ]);
  });
  it('model essays have four paragraphs', () => {
    expect(modelEssay(tech, '6.5').split('\n\n')).toHaveLength(4);
  });
});
