import { BookmarkCheck, BookPlus, Loader2, Volume2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { LookupTarget } from './useWordLookup';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { useSpeech } from '@/features/audio/useSpeech';
import { toPinyin } from '@/lib/chinese/pinyin';
import { toUserMessage } from '@/lib/errors';
import { POS, POS_LABEL, type Pos } from '@/lib/vocab/pos';
import { normalizeTerm } from '@/lib/vocab/words';
import { topicOptions, useAddWord, useEnglishLookup, useSharedMeaning, useVocabulary, type Language } from './api';
import { PosBadge } from './PosBadge';
import { FamilyGrid } from '@/features/wordforms/FamilyGrid';
import { useWordFamilyIndex } from '@/features/wordforms/api';
import { familyFor } from '@/lib/wordforms';
import { useHskWord } from '@/features/learner/api';

export function WordCard({ target, language, onDone }: { target: LookupTarget; language: Language; onDone: () => void }) {
  const term = normalizeTerm(target.word, language);
  const vocab = useVocabulary();
  const saved = vocab.data?.find((w) => w.language === language && w.term_normalized === term.toLowerCase());
  const lookup = useEnglishLookup(language === 'en' ? term : null);
  const shared = useSharedMeaning(language, term);
  const add = useAddWord();
  const speech = useSpeech(language);
  const familyIndex = useWordFamilyIndex();
  const hsk = useHskWord(language === 'zh' ? term : null);
  const family = language === 'en' && familyIndex ? familyFor(familyIndex, term) : null;

  const reading = language === 'zh' ? toPinyin(term) : (lookup.data?.reading ?? null);
  const [meaning, setMeaning] = useState('');
  const [pos, setPos] = useState<Pos | ''>('');
  const [topic, setTopic] = useState('');
  const topics = useMemo(() => topicOptions(vocab.data), [vocab.data]);

  // Pre-fill from the shared dictionary / English dictionary once they arrive (never overwrite typing).
  const sharedMeaning = shared.data?.[0]?.meaning_vi;
  const suggestedPos = (shared.data?.[0]?.part_of_speech as Pos | undefined) ?? lookup.data?.pos[0];
  useEffect(() => {
    if (sharedMeaning) setMeaning((m) => m || sharedMeaning);
  }, [sharedMeaning]);
  useEffect(() => {
    if (suggestedPos) setPos((p) => p || suggestedPos);
  }, [suggestedPos]);

  const save = () =>
    add.mutate(
      {
        language,
        term,
        reading,
        meaning_vi: meaning.trim() || null,
        part_of_speech: pos || null,
        topic: topic || null,
        context_sentence: target.sentence,
        source_lesson_id: target.lessonId ?? null,
        source_sentence_id: target.sentenceId ?? null,
      },
      {
        onSuccess: () => {
          toast.success(`Added "${term}" to your notebook`);
          onDone();
        },
        onError: (e) => toast.error(toUserMessage(e)),
      },
    );

  return (
    <div className="space-y-3 text-sm" data-testid="word-card">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xl font-semibold" lang={language === 'zh' ? 'zh' : 'en'}>
            {term}
          </p>
          <p className="text-muted-foreground">{reading ?? (lookup.isLoading ? '…' : '')}</p>
        </div>
        <Button variant="ghost" size="icon" className="size-8" aria-label={`Pronounce ${term}`} onClick={() => speech.play(`w:${term}`, term, 0.9)}>
          <Volume2 />
        </Button>
      </div>

      {language === 'en' && (
        <div className="max-h-28 space-y-1 overflow-y-auto rounded-md bg-muted/60 p-2 text-xs">
          {lookup.isLoading ? (
            <p className="flex items-center gap-1.5 text-muted-foreground">
              <Loader2 className="size-3 animate-spin" /> Looking up…
            </p>
          ) : lookup.isError ? (
            <p className="text-muted-foreground">Dictionary unavailable right now — you can still save the word.</p>
          ) : !lookup.data ? (
            <p className="text-muted-foreground">Not in the English dictionary.</p>
          ) : (
            lookup.data.definitions.slice(0, 3).map((d, i) => (
              <p key={i}>
                <PosBadge pos={d.pos} className="mr-1" />
                {d.definition}
              </p>
            ))
          )}
        </div>
      )}

      {language === 'zh' && hsk.data && (
        <div className="rounded-md bg-muted/60 p-2 text-xs" data-testid="hsk-info">
          <p className="flex flex-wrap gap-1.5">
            {hsk.data.level_v2 && <span className="rounded bg-accent px-1.5 py-0.5 font-medium text-accent-foreground">HSK 2.0 · {hsk.data.level_v2}</span>}
            {hsk.data.level_v3 && <span className="rounded bg-accent px-1.5 py-0.5 font-medium text-accent-foreground">HSK 3.0 · {hsk.data.level_v3 === 7 ? '7–9' : hsk.data.level_v3}</span>}
          </p>
          {hsk.data.meaning_en && <p className="mt-1 text-muted-foreground">English: {hsk.data.meaning_en}</p>}
        </div>
      )}

      {family && (
        <details className="rounded-md border px-2 py-1.5 text-xs" open>
          <summary className="cursor-pointer font-medium">Word family</summary>
          <div className="mt-2">
            <FamilyGrid family={family} highlight={term} compact contextSentence={target.sentence} />
          </div>
        </details>
      )}

      <p className="rounded-md border-l-2 border-primary/50 pl-2 text-xs text-muted-foreground" lang={language === 'zh' ? 'zh' : 'en'}>
        {target.sentence}
        {target.sentenceTranslation && <span className="mt-0.5 block" lang="vi">{target.sentenceTranslation}</span>}
      </p>

      {saved ? (
        <div className="flex items-center justify-between rounded-md bg-success/10 px-3 py-2 text-success">
          <span className="flex items-center gap-1.5 font-medium">
            <BookmarkCheck className="size-4" /> In your notebook
          </span>
          <Link to={`/vocabulary?q=${encodeURIComponent(saved.term)}`} className="text-xs underline" onClick={onDone}>
            Open
          </Link>
        </div>
      ) : (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="wc-meaning" className="text-xs">
              Nghĩa tiếng Việt
            </Label>
            <Input id="wc-meaning" value={meaning} onChange={(e) => setMeaning(e.target.value)} maxLength={500} placeholder={sharedMeaning ? '' : 'Type the meaning…'} className="h-9" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="wc-pos" className="text-xs">
                Type
              </Label>
              <NativeSelect id="wc-pos" value={pos} onChange={(e) => setPos(e.target.value as Pos | '')} className="h-9">
                <option value="">—</option>
                {POS.map((p) => (
                  <option key={p} value={p}>
                    {POS_LABEL[p]}
                    {lookup.data?.pos.includes(p) ? ' ✓' : ''}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1">
              <Label htmlFor="wc-topic" className="text-xs">
                Topic
              </Label>
              <NativeSelect id="wc-topic" value={topic} onChange={(e) => setTopic(e.target.value)} className="h-9">
                <option value="">—</option>
                {topics.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={add.isPending || vocab.isPending}>
            {add.isPending ? <Loader2 className="animate-spin" /> : <BookPlus />} Add to notebook
          </Button>
        </form>
      )}
    </div>
  );
}
