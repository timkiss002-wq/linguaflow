import { escapeSearch, hasActiveFilters, parseFilters, toSearchParams } from './filters';

const p = (s: string) => parseFilters(new URLSearchParams(s));

describe('parseFilters', () => {
  it('reads valid params', () => {
    expect(p('q=story&lang=zh&level=intermediate&hsk=4&topic=education&fav=1')).toEqual({
      q: 'story',
      lang: 'zh',
      level: 'intermediate',
      hsk: 4,
      topic: 'education',
      favoritesOnly: true,
    });
  });
  it('drops invalid values instead of failing', () => {
    expect(p('lang=fr&level=expert&hsk=9&topic=DROP%20TABLE&fav=yes')).toEqual({ q: '', favoritesOnly: false });
  });
  it('ignores HSK for English', () => {
    expect(p('lang=en&hsk=3').hsk).toBeUndefined();
  });
  it('round-trips through the URL', () => {
    const f = p('q=ghost&lang=zh&hsk=5');
    expect(parseFilters(toSearchParams(f))).toEqual(f);
    expect(hasActiveFilters(p(''))).toBe(false);
    expect(hasActiveFilters(f)).toBe(true);
  });
});

it('escapes search wildcards and filter syntax', () => {
  expect(escapeSearch('100%_a\\b')).toBe('100\\%\\_a\\\\b');
  expect(escapeSearch('a,b(c)')).toBe('a b c ');
});
