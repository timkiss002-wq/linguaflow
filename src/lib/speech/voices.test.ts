import { pickVoice, voicesFor, type VoiceInfo } from './voices';

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
