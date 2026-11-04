import { findCloze, makeCloze } from './cloze';
import { importVocabularyCsv, parseCsv, vocabularyToCsv } from './csv';
import { normalizePos } from './pos';
import { normalizeTerm, splitWords } from './words';

describe('splitWords', () => {
  it('splits English into words, keeping contractions and hyphens', () => {
    const words = splitWords("I've got a well-known plan, OK?", 'en').filter((s) => s.isWord).map((s) => s.text);
    expect(words).toEqual(["I've", 'got', 'a', 'well-known', 'plan', 'OK']);
  });
  it('joins back to the original text', () => {
    const t = 'Hello,  world — again!';
    expect(splitWords(t, 'en').map((s) => s.text).join('')).toBe(t);
  });
  it('segments Chinese into words', () => {
    const segs = splitWords('我想去超市买东西。', 'zh');
    expect(segs.map((s) => s.text).join('')).toBe('我想去超市买东西。');
    expect(segs.find((s) => s.text === '超市')?.isWord).toBe(true);
    expect(segs.find((s) => s.text === '。')?.isWord).toBe(false);
  });
  it('normalizes saved terms', () => {
    expect(normalizeTerm('Decision', 'en')).toBe('decision');
    expect(normalizeTerm('IELTS', 'en')).toBe('IELTS');
    expect(normalizeTerm(' 超市 ', 'zh')).toBe('超市');
  });
});

describe('normalizePos', () => {
  it.each([
    ['Noun', 'noun'],
    ['Adj', 'adj'],
    ['adjective', 'adj'],
    ['Adv', 'adv'],
    ['idiom', 'idiom'],
    ['động từ', 'verb'],
    ['', null],
    ['banana', null],
  ])('%s → %s', (input, out) => expect(normalizePos(input)).toBe(out));
});

describe('cloze', () => {
  it('blanks a whole English word, case-insensitively', () => {
    expect(makeCloze('Commence the test now.', 'commence', 'en')).toEqual({ before: '', answer: 'Commence', after: ' the test now.' });
    expect(makeCloze('They recommenced work.', 'commence', 'en')).toBeNull();
  });
  it('handles multi-word phrases', () => {
    expect(makeCloze('Old houses make way for new flats.', 'make way for', 'en')?.before).toBe('Old houses ');
  });
  it('blanks Chinese substrings', () => {
    expect(makeCloze('我想去超市买东西。', '超市', 'zh')).toEqual({ before: '我想去', answer: '超市', after: '买东西。' });
  });
  it('falls back through context and examples', () => {
    expect(findCloze([null, 'No match here', 'The building was demolished.'], 'demolished', 'en')?.answer).toBe('demolished');
    expect(findCloze([], 'x', 'en')).toBeNull();
  });
});

describe('csv', () => {
  it('parses quotes, commas and newlines in fields', () => {
    expect(parseCsv('a,"b, c","d ""q"""\r\n1,"line\nbreak",3\n')).toEqual([
      ['a', 'b, c', 'd "q"'],
      ['1', 'line\nbreak', '3'],
    ]);
  });

  it('imports a sheet with a title row and Vietnamese headers', () => {
    const csv = [
      'ôn 1000 từ IELTS,,,,,,,,,',
      'STT,Ngày thêm,Từ mới,Giải thích,Topic,loại từ,Ôn từ vựng,Check,Ví dụ 1,Ví dụ 2',
      '1,,groceries,thực phẩm và hàng tạp hóa,Daily life,Noun,groceries,TRUE,I buy groceries on Sunday.,',
      '2,,observant,có khả năng quan sát tốt,Daily life,Adj,observant,TRUE,,',
      '3,,,,,,,,,',
      '4,,Groceries,dup,,,,,,',
    ].join('\n');
    const r = importVocabularyCsv(csv);
    expect(r.headerRow).toBe(1);
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0]).toMatchObject({ term: 'groceries', meaning_vi: 'thực phẩm và hàng tạp hóa', topic: 'Daily life', part_of_speech: 'noun', examples: ['I buy groceries on Sunday.'] });
    expect(r.skipped.map((s) => s.reason)).toEqual(['empty word', 'duplicate "Groceries"']);
  });

  it('round-trips through export', () => {
    const rows = [{ term: 'decision', meaning_vi: 'quyết định', topic: 'Work and study', part_of_speech: 'noun' as const, examples: ['Make a decision, quickly.'], context_sentence: 'We made a decision.', reading: '/dɪˈsɪʒn/', created_at: '2026-11-05T03:00:00Z' }];
    const back = importVocabularyCsv(vocabularyToCsv(rows));
    expect(back.rows[0]).toMatchObject({ term: 'decision', part_of_speech: 'noun', examples: ['Make a decision, quickly.'], reading: '/dɪˈsɪʒn/', context_sentence: 'We made a decision.' });
  });

  it('rejects files without a word column', () => {
    expect(importVocabularyCsv('a,b\n1,2').rows).toEqual([]);
  });
});
