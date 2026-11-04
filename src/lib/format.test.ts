import { formatDuration } from './format';

it('formats durations', () => {
  expect(formatDuration(0)).toBe('0:00');
  expect(formatDuration(75)).toBe('1:15');
  expect(formatDuration(3725)).toBe('1:02:05');
  expect(formatDuration(null)).toBe('');
  expect(formatDuration(-1)).toBe('');
});
