import { formatDuration, formatTimestamp } from './format';

it('formats durations', () => {
  expect(formatDuration(0)).toBe('0:00');
  expect(formatDuration(75)).toBe('1:15');
  expect(formatDuration(3725)).toBe('1:02:05');
  expect(formatDuration(null)).toBe('');
  expect(formatDuration(-1)).toBe('');
});

it('formats segment timestamps', () => {
  expect(formatTimestamp(80)).toBe('01:20.0');
  expect(formatTimestamp(88.25)).toBe('01:28.2');
  expect(formatTimestamp(3599.99)).toBe('59:59.9');
});
