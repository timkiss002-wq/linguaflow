import { z } from 'zod';
import { normalizePos, type Pos } from './pos';

/** What the word popup can pre-fill. Every field is optional: the API may not know the word. */
export interface LookupResult {
  reading: string | null;
  /** Unique parts of speech, most common first. */
  pos: Pos[];
  definitions: { pos: Pos | null; definition: string; example: string | null }[];
  audioUrl: string | null;
}

const apiSchema = z.array(
  z.object({
    phonetic: z.string().optional(),
    phonetics: z.array(z.object({ text: z.string().optional(), audio: z.string().optional() })).optional(),
    meanings: z.array(
      z.object({
        partOfSpeech: z.string(),
        definitions: z.array(z.object({ definition: z.string(), example: z.string().optional() })),
      }),
    ),
  }),
);

const ENDPOINT = 'https://api.dictionaryapi.dev/api/v2/entries/en/';

/**
 * Free English dictionary (dictionaryapi.dev): IPA, part of speech, English definitions.
 * Returns null when the word isn't found. Throws only on network/server errors.
 */
export async function lookupEnglish(word: string, fetchImpl: typeof fetch = fetch): Promise<LookupResult | null> {
  const res = await fetchImpl(ENDPOINT + encodeURIComponent(word.trim().toLowerCase()));
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Dictionary unavailable (${res.status})`);
  const parsed = apiSchema.safeParse(await res.json());
  if (!parsed.success || parsed.data.length === 0) return null;

  const entries = parsed.data;
  const reading = entries.map((e) => e.phonetic ?? e.phonetics?.find((p) => p.text)?.text).find(Boolean) ?? null;
  const audioUrl = entries.flatMap((e) => e.phonetics ?? []).find((p) => p.audio)?.audio || null;
  const definitions = entries.flatMap((e) =>
    e.meanings.flatMap((m) =>
      m.definitions.slice(0, 2).map((d) => ({ pos: normalizePos(m.partOfSpeech), definition: d.definition, example: d.example ?? null })),
    ),
  );
  const pos = [...new Set(definitions.map((d) => d.pos).filter((p): p is Pos => p !== null))];
  return { reading, pos, definitions: definitions.slice(0, 6), audioUrl };
}
