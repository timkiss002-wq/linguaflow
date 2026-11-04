import { compareEnglish } from '@/lib/compare/english';
import { initialState, reducer, summarizeSession } from './session';

const IDS = ['a', 'b', 'c'];
const r = reducer(IDS);
const ok = compareEnglish('hello', 'hello', { ignorePunctuation: true });
const bad = compareEnglish('hello world', 'hello', { ignorePunctuation: true });
const hint = { position: 2, text: 'w____', level: 1 as const, target: '2:world' };

it('tracks a first-try success', () => {
  let s = initialState(IDS, 0, 0);
  s = r(s, { type: 'input', id: 'a', value: 'hello' });
  s = r(s, { type: 'check', id: 'a', result: ok });
  expect(s.entries.a).toMatchObject({ correct: true, checks: 1, firstTry: true, bestAccuracy: 100 });
  // locked once correct
  s = r(s, { type: 'input', id: 'a', value: 'changed' });
  expect(s.entries.a!.input).toBe('hello');
});

it('a hint or a wrong check means it was not first-try', () => {
  let s = initialState(IDS, 0, 0);
  s = r(s, { type: 'hint', id: 'a', hint });
  s = r(s, { type: 'check', id: 'a', result: ok });
  expect(s.entries.a).toMatchObject({ correct: true, firstTry: false, hints: 1 });

  s = r(s, { type: 'goto', index: 1, now: 5 });
  s = r(s, { type: 'check', id: 'b', result: bad });
  s = r(s, { type: 'check', id: 'b', result: ok });
  expect(s.entries.b).toMatchObject({ correct: true, firstTry: false, checks: 2 });
});

it('skip moves on; reveal locks the answer', () => {
  let s = initialState(IDS, 0, 0);
  s = r(s, { type: 'skip', id: 'a' });
  expect(s.index).toBe(1);
  s = r(s, { type: 'goto', index: 1, now: 1 });
  s = r(s, { type: 'reveal', id: 'b' });
  s = r(s, { type: 'check', id: 'b', result: ok });
  expect(s.entries.b).toMatchObject({ revealed: true, checks: 0, correct: false });
});

it('goto clamps to the list', () => {
  const s = r(initialState(IDS, 0, 0), { type: 'goto', index: 99, now: 0 });
  expect(s.index).toBe(2);
});

it('summarizes the session', () => {
  let s = initialState(IDS, 0, 0);
  s = r(s, { type: 'check', id: 'a', result: ok }); // first try
  s = r(s, { type: 'goto', index: 1, now: 0 });
  s = r(s, { type: 'check', id: 'b', result: bad }); // 50%
  s = r(s, { type: 'reveal', id: 'b' });
  s = r(s, { type: 'goto', index: 2, now: 0 });
  s = r(s, { type: 'skip', id: 'c' }); // 0%
  expect(summarizeSession(IDS, s.entries)).toEqual({ practised: 3, correct: 1, incorrect: 2, accuracy: 50, retryIds: ['b', 'c'] });
});
