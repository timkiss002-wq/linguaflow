import { BookmarkPlus, Check, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useSpeech } from '@/features/audio/useSpeech';
import { DuplicateWordError, useAddWord, useVocabulary } from '@/features/vocabulary/api';
import { PosBadge } from '@/features/vocabulary/PosBadge';
import type { PartVocab } from '@/lib/ielts/tests';
import { normalizePos } from '@/lib/vocab/pos';
import { toUserMessage } from '@/lib/errors';

/** The example sentence with the headword in bold (first word of multi-word entries, so "attribute (sth) to" still matches). */
function Example({ ex, w }: { ex: string; w: string }) {
  const stem = w.replace(/\s*\(.*?\)\s*/g, ' ').trim().split(/\s+/)[0]!.slice(0, 5).toLowerCase();
  const i = ex.toLowerCase().indexOf(stem);
  if (i < 0) return <>{ex}</>;
  const end = ex.slice(i).search(/[\s,.;]|$/) + i;
  return (
    <>
      {ex.slice(0, i)}
      <strong className="font-semibold text-foreground">{ex.slice(i, end)}</strong>
      {ex.slice(end)}
    </>
  );
}

/**
 * Vocabulary from the passage, shown after marking: word, type, IPA, meaning, synonyms and the
 * sentence of the passage it comes from — with one click to save it to the notebook.
 */
export function PartVocabulary({ vocab, source }: { vocab: PartVocab[]; source: string }) {
  const speech = useSpeech('en');
  const add = useAddWord();
  const saved = new Set((useVocabulary().data ?? []).filter((w) => w.language === 'en').map((w) => w.term.toLowerCase()));
  const save = (v: PartVocab) =>
    add.mutate(
      { language: 'en', term: v.w, meaning_vi: v.vi, part_of_speech: normalizePos(v.pos), topic: 'IELTS Reading', context_sentence: v.ex, examples: [] },
      {
        onSuccess: () => toast.success(`Đã thêm “${v.w}” vào sổ từ`),
        onError: (e) => toast.error(e instanceof DuplicateWordError ? `“${v.w}” đã có trong sổ từ` : toUserMessage(e)),
      },
    );
  return (
    <section aria-label="Từ vựng trong bài" className="space-y-3" data-testid="part-vocab">
      <div>
        <h3 className="font-semibold">Từ vựng trong bài</h3>
        <p className="text-sm text-muted-foreground">
          {vocab.length} từ đáng học từ “{source}”. Ví dụ lấy từ chính bài đọc — lưu kèm câu để ôn lại trong ngữ cảnh.
        </p>
      </div>
      <ul className="divide-y rounded-lg border bg-card">
        {vocab.map((v) => {
          const done = saved.has(v.w.toLowerCase());
          return (
            <li key={v.w} className="grid gap-x-4 gap-y-1 p-3 text-sm sm:grid-cols-[11rem_1fr_auto]">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold" lang="en">
                    {v.w}
                  </span>
                  <PosBadge pos={normalizePos(v.pos) ?? v.pos} />
                </p>
                {v.ipa && <p className="font-mono text-xs text-muted-foreground">{v.ipa}</p>}
              </div>
              <div className="min-w-0 space-y-0.5">
                <p lang="vi">{v.vi}</p>
                {v.syn && v.syn.length > 0 && (
                  <p className="text-xs text-muted-foreground" lang="en">
                    ≈ {v.syn.join(', ')}
                  </p>
                )}
                <p className="text-muted-foreground" lang="en">
                  “<Example ex={v.ex} w={v.w} />”
                </p>
              </div>
              <div className="flex items-start gap-1 sm:justify-end">
                <Button variant="ghost" size="icon" className="size-8" aria-label={`Phát âm ${v.w}`} onClick={() => speech.play(`pv:${v.w}`, v.w, 0.9)}>
                  <Volume2 />
                </Button>
                <Button variant={done ? 'ghost' : 'outline'} size="sm" disabled={done || add.isPending} onClick={() => save(v)} aria-label={done ? `${v.w} đã có trong sổ` : `Lưu ${v.w}`}>
                  {done ? <Check className="size-4 text-success" /> : <BookmarkPlus className="size-4" />}
                  {done ? 'Đã lưu' : 'Lưu'}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
