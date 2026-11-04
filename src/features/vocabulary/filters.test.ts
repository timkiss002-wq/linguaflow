import type { VocabWord } from './api';
import { countByStatus, filterWords, parseVocabFilters, vocabFiltersToParams } from './filters';

const w = (term: string, extra: Partial<VocabWord> = {}) =>
  ({ id: term, term, language: 'en', status: 'new', topic: null, part_of_speech: null, meaning_vi: null, reading: null, context_sentence: null, examples: [], ...extra }) as VocabWord;

const WORDS = [
  w('decision', { meaning_vi: 'quyết định', part_of_speech: 'noun', topic: 'Work and study' }),
  w('demolish', { meaning_vi: 'phá bỏ hoàn toàn', part_of_speech: 'verb', status: 'learning', examples: ['They demolished the old bridge.'] }),
  w('超市', { language: 'zh', meaning_vi: 'siêu thị', reading: 'chāo shì' }),
];

it('searches meaning without Vietnamese accents', () => {
  expect(filterWords(WORDS, { q: 'quyet dinh' }).map((x) => x.term)).toEqual(['decision']);
  expect(filterWords(WORDS, { q: 'sieu thi' }).map((x) => x.term)).toEqual(['超市']);
});

it('searches examples and readings', () => {
  expect(filterWords(WORDS, { q: 'bridge' }).map((x) => x.term)).toEqual(['demolish']);
  expect(filterWords(WORDS, { q: 'chāo' }).map((x) => x.term)).toEqual(['超市']);
});

it('combines filters and can ignore one (for counts)', () => {
  expect(filterWords(WORDS, { q: '', lang: 'en', pos: 'verb' }).map((x) => x.term)).toEqual(['demolish']);
  expect(filterWords(WORDS, { q: '', lang: 'en', status: 'new' }, ['status'])).toHaveLength(2);
  expect(filterWords(WORDS, { q: '', topic: 'work and study' })).toHaveLength(1);
});

it('counts statuses', () => {
  expect(countByStatus(WORDS)).toEqual({ new: 2, learning: 1, reviewing: 0, mastered: 0 });
});

it('round-trips URL params and drops invalid values', () => {
  const f = parseVocabFilters(new URLSearchParams('q=x&lang=zh&status=learning&topic=Law&pos=noun'));
  expect(parseVocabFilters(vocabFiltersToParams(f))).toEqual(f);
  expect(parseVocabFilters(new URLSearchParams('lang=fr&status=done'))).toEqual({ q: '', lang: undefined, status: undefined, topic: undefined, pos: undefined });
});
