import { lookupEnglish } from './dictionary';

const respond = (status: number, body: unknown) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

it('maps IPA, parts of speech and definitions', async () => {
  const r = await lookupEnglish(
    'Decision',
    respond(200, [
      {
        phonetic: '/dɪˈsɪʒ.ən/',
        phonetics: [{ text: '/dɪˈsɪʒ.ən/', audio: 'https://x/decision.mp3' }],
        meanings: [
          { partOfSpeech: 'noun', definitions: [{ definition: 'A choice made.', example: 'a tough decision' }, { definition: 'Firmness.' }, { definition: 'ignored third' }] },
          { partOfSpeech: 'verb', definitions: [{ definition: 'To decide.' }] },
        ],
      },
    ]),
  );
  expect(r).toEqual({
    reading: '/dɪˈsɪʒ.ən/',
    audioUrl: 'https://x/decision.mp3',
    pos: ['noun', 'verb'],
    definitions: [
      { pos: 'noun', definition: 'A choice made.', example: 'a tough decision' },
      { pos: 'noun', definition: 'Firmness.', example: null },
      { pos: 'verb', definition: 'To decide.', example: null },
    ],
  });
});

it('returns null for unknown words and malformed bodies', async () => {
  expect(await lookupEnglish('qwzx', respond(404, { title: 'No Definitions Found' }))).toBeNull();
  expect(await lookupEnglish('x', respond(200, { weird: true }))).toBeNull();
});

it('throws on server errors so the UI can say the dictionary is down', async () => {
  await expect(lookupEnglish('x', respond(503, {}))).rejects.toThrow('Dictionary unavailable (503)');
});
