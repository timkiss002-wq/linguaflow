import { parseYouTubeId, youtubeWatchUrl } from './youtube';

describe('parseYouTubeId', () => {
  it.each([
    ['N28PIBa8HCo', 'N28PIBa8HCo'],
    ['https://www.youtube.com/watch?v=N28PIBa8HCo', 'N28PIBa8HCo'],
    ['https://m.youtube.com/watch?v=JXt-W7GlXzw&pp=abc', 'JXt-W7GlXzw'],
    ['https://youtu.be/N28PIBa8HCo?t=30', 'N28PIBa8HCo'],
    ['https://www.youtube.com/embed/N28PIBa8HCo', 'N28PIBa8HCo'],
    ['https://www.youtube.com/shorts/N28PIBa8HCo', 'N28PIBa8HCo'],
    ['https://www.youtube-nocookie.com/embed/N28PIBa8HCo', 'N28PIBa8HCo'],
  ])('%s', (input, expected) => expect(parseYouTubeId(input)).toBe(expected));

  it.each(['', 'hello', 'https://vimeo.com/123', 'https://www.youtube.com/watch?v=short', 'https://evil.com/watch?v=N28PIBa8HCo'])(
    'rejects %s',
    (input) => expect(parseYouTubeId(input)).toBeNull(),
  );
});

it('builds watch urls with a start time', () => {
  expect(youtubeWatchUrl('N28PIBa8HCo', 80.7)).toBe('https://www.youtube.com/watch?v=N28PIBa8HCo&t=80s');
});
