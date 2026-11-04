import { DEFAULT_SETTINGS, parseSettings, profileSchema } from './schemas';

describe('parseSettings', () => {
  it('returns defaults for empty or invalid json', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings([])).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('x')).toEqual(DEFAULT_SETTINGS);
  });
  it('keeps valid values and repairs invalid ones', () => {
    expect(parseSettings({ playbackRate: 0.75, autoNext: true, showPinyin: 'yes', extra: 1 })).toEqual({
      ...DEFAULT_SETTINGS,
      playbackRate: 0.75,
      autoNext: true,
    });
    expect(parseSettings({ playbackRate: 3 }).playbackRate).toBe(1);
    expect(parseSettings({ volume: 150, voiceZh: 'Microsoft Xiaoxiao' })).toMatchObject({ volume: 100, voiceZh: 'Microsoft Xiaoxiao' });
    expect(parseSettings({ srsMode: 'fixed', fixedIntervals: [2, 4, 8, 60], newPerDay: 5 })).toMatchObject({ srsMode: 'fixed', fixedIntervals: [2, 4, 8, 60], newPerDay: 5 });
    expect(parseSettings({ srsMode: 'weird', fixedIntervals: [1, 2], newPerDay: -1 })).toMatchObject({ srsMode: 'sm2', fixedIntervals: [1, 3, 7, 30], newPerDay: 20 });
  });
});

describe('profileSchema', () => {
  const ok = { displayName: 'Lan', timezone: 'Asia/Ho_Chi_Minh', dailyGoalMinutes: '20' };
  it('coerces the goal to a number', () => {
    expect(profileSchema.parse(ok).dailyGoalMinutes).toBe(20);
  });
  it('rejects unknown time zones and out-of-range goals', () => {
    expect(profileSchema.safeParse({ ...ok, timezone: 'Mars/Base' }).success).toBe(false);
    expect(profileSchema.safeParse({ ...ok, dailyGoalMinutes: 2 }).success).toBe(false);
    expect(profileSchema.safeParse({ ...ok, dailyGoalMinutes: 500 }).success).toBe(false);
  });
});
