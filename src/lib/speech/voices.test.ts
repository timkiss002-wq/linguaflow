import { assignVoices, pickVoice, voiceGender, voicesFor, type VoiceInfo } from './voices';

const v = (name: string, lang: string, extra: Partial<VoiceInfo> = {}): VoiceInfo => ({ name, lang, localService: true, ...extra });

const VOICES = [
  v('Microsoft David', 'en-US', { default: true }),
  v('Google US English', 'en-US', { localService: false }),
  v('Microsoft Huihui', 'zh-CN'),
  v('Microsoft Xiaoxiao Online (Natural)', 'zh-CN', { localService: false }),
  v('Google 粤語（香港）', 'zh-HK'),
  v('Mei-Jia', 'zh-TW'),
  v('Thomas', 'fr-FR'),
];

describe('pickVoice', () => {
  it('prefers natural mainland Mandarin voices', () => {
    expect(pickVoice(VOICES, 'zh')?.name).toBe('Microsoft Xiaoxiao Online (Natural)');
  });
  it('never picks Cantonese over Mandarin', () => {
    const order = voicesFor(VOICES, 'zh').map((x) => x.lang);
    expect(order.indexOf('zh-HK')).toBeGreaterThan(order.indexOf('zh-CN'));
  });
  it('prefers Google over plain system English voice', () => {
    expect(pickVoice(VOICES, 'en')?.name).toBe('Google US English');
  });
  it('respects a saved voice that still exists', () => {
    expect(pickVoice(VOICES, 'zh', 'Microsoft Huihui')?.name).toBe('Microsoft Huihui');
  });
  it('ignores a saved voice from another language or missing device voice', () => {
    expect(pickVoice(VOICES, 'zh', 'Microsoft David')?.name).toBe('Microsoft Xiaoxiao Online (Natural)');
    expect(pickVoice(VOICES, 'zh', 'Gone')?.name).toBe('Microsoft Xiaoxiao Online (Natural)');
  });
  it('handles Android-style underscores and missing voices', () => {
    expect(pickVoice([v('cmn', 'zh_CN')], 'zh')?.name).toBe('cmn');
    expect(pickVoice([v('Thomas', 'fr-FR')], 'zh')).toBeNull();
  });
});

describe('voices for several speakers', () => {
  const v = (name: string, lang = 'en-GB'): VoiceInfo => ({ name, lang, localService: true });
  it('guesses gender from common voice names', () => {
    expect(voiceGender('Microsoft Zira - English (United States)')).toBe('female');
    expect(voiceGender('Google UK English Female')).toBe('female');
    expect(voiceGender('Google UK English Male')).toBe('male');
    expect(voiceGender('Microsoft David - English (United States)')).toBe('male');
    expect(voiceGender('English Voice 3')).toBeNull();
  });
  it('gives each speaker a different voice of the right gender', () => {
    const a = assignVoices([v('Microsoft David'), v('Microsoft Zira'), v('Microsoft Mark'), v('Vietnamese An', 'vi-VN')], [
      { key: 'M', voice: 'male' },
      { key: 'W', voice: 'female' },
      { key: 'L', voice: 'male' },
    ]);
    expect(a.W!.voice!.name).toBe('Microsoft Zira');
    expect(new Set([a.M!.voice!.name, a.L!.voice!.name])).toEqual(new Set(['Microsoft David', 'Microsoft Mark']));
    expect(a.M!.pitch).toBe(1);
  });
  it('shares one voice and changes the pitch when there are too few', () => {
    const a = assignVoices([v('Microsoft David')], [{ key: 'M', voice: 'male' }, { key: 'W', voice: 'female' }]);
    expect(a.M).toMatchObject({ pitch: 1 });
    expect(a.W!.voice!.name).toBe('Microsoft David');
    expect(a.W!.pitch).toBeGreaterThan(1);
  });
});
