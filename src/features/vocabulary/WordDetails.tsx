import { Plus, Trash2, Volume2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSpeech } from '@/features/audio/useSpeech';
import { toUserMessage } from '@/lib/errors';
import { useUpdateWord, type VocabWord } from './api';

/** Context sentence + up to 5 example sentences ("Ví dụ 1–5"), editable. */
export function WordDetails({ word }: { word: VocabWord }) {
  const update = useUpdateWord();
  const speech = useSpeech(word.language as 'en' | 'zh');
  const [draft, setDraft] = useState('');
  const lang = word.language === 'zh' ? 'zh' : 'en';
  const examples = word.examples ?? [];

  const saveExamples = (next: string[]) =>
    update.mutate({ id: word.id, patch: { examples: next } }, { onError: (e) => toast.error(toUserMessage(e)) });

  return (
    <div className="space-y-3 text-sm">
      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Context</p>
        {word.context_sentence ? (
          <div className="flex items-start gap-2">
            <Button variant="ghost" size="icon" className="size-7 shrink-0" aria-label="Play context sentence" onClick={() => speech.play(`ctx:${word.id}`, word.context_sentence!, 1)}>
              <Volume2 />
            </Button>
            <p lang={lang} className="pt-1">
              {word.context_sentence}
              {word.lesson?.title && word.source_lesson_id && (
                <Link to={`/lessons/${word.source_lesson_id}`} className="ml-2 text-xs text-primary hover:underline">
                  {word.lesson.title.split(' · ')[0]}
                </Link>
              )}
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground">Added manually — no source sentence.</p>
        )}
      </div>

      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Examples ({examples.length}/5)</p>
        <ol className="space-y-1">
          {examples.map((ex, i) => (
            <li key={i} className="group flex items-start gap-2">
              <span className="w-4 shrink-0 pt-1 text-right text-xs text-muted-foreground">{i + 1}</span>
              <p lang={lang} className="flex-1 pt-0.5">
                {ex}
              </p>
              <Button variant="ghost" size="icon" className="size-7 opacity-60 hover:opacity-100" aria-label={`Delete example ${i + 1}`} onClick={() => saveExamples(examples.filter((_, k) => k !== i))}>
                <Trash2 />
              </Button>
            </li>
          ))}
        </ol>
        {examples.length < 5 && (
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!draft.trim()) return;
              saveExamples([...examples, draft.trim().slice(0, 500)]);
              setDraft('');
            }}
          >
            <Input value={draft} onChange={(e) => setDraft(e.target.value)} lang={lang} placeholder="Add your own example sentence…" aria-label="New example sentence" maxLength={500} className="h-8" />
            <Button type="submit" size="sm" variant="outline" disabled={!draft.trim()}>
              <Plus /> Add
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
