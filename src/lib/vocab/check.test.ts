import { reviewCheck } from './check';

it.each([
  ['groceries', 'groceries', true],
  ['make way for N', 'make way for n', true],
  ['Mutual benefit', 'mutual benefit', true],
  ['are discharged', 'are dischared', false],
  ['mental illness', '  mental   illness ', true],
  ['commensurate', '', false],
  ["don't", 'don’t', true],
  ['The site, which was previously a factory', 'the site which was previously a factory', true],
])('%s vs %s → %s', (term, input, expected) => {
  expect(reviewCheck(term, input, 'en')).toBe(expected);
});

it('works for Chinese', () => {
  expect(reviewCheck('超市', '超市', 'zh')).toBe(true);
  expect(reviewCheck('超市', '超事', 'zh')).toBe(false);
});
