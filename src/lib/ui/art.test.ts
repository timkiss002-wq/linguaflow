import { describe, expect, it } from 'vitest';
import { artFor } from './art';

describe('artFor', () => {
  it('matches the topic of reading passages', () => {
    expect(artFor('Bees on the Rooftops')).toBe('leaf');
    expect(artFor('Sleep and Memory')).toBe('brain');
    expect(artFor("Saving the World's Languages")).toBe('globe');
    expect(artFor('The Return of the Tram')).toBe('road');
    expect(artFor('Do Plants Communicate?')).toBe('leaf');
    expect(artFor('Why We Put Things Off')).toBe('clock');
  });
  it('falls back to a book', () => {
    expect(artFor('Untitled')).toBe('book');
  });
});
