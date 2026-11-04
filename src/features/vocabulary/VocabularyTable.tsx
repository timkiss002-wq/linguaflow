import { ChevronDown, ChevronRight, Volume2 } from 'lucide-react';
import { Fragment, useState } from 'react';
import { toast } from 'sonner';
import { useSpeech } from '@/features/audio/useSpeech';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { toUserMessage } from '@/lib/errors';
import { reviewCheck } from '@/lib/vocab/check';
import { POS, POS_LABEL } from '@/lib/vocab/pos';
import { cn } from '@/lib/utils';
import { topicOptions, useUpdateWord, type VocabWord } from './api';
import { EditableCell } from './EditableCell';
import { PosBadge } from './PosBadge';
import { CheckBadge, ReviewInput } from './ReviewCell';
import { StatusBadge, TypingDots } from './TypingDots';
import { WordDetails } from './WordDetails';
import { PosWarning } from './PosWarning';

const date = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');

interface Props {
  words: VocabWord[];
  allWords: VocabWord[];
  selected: Set<string>;
  onSelect: (ids: string[], on: boolean) => void;
  /** Hide "Từ mới" so the review column becomes a recall exercise. */
  hideWords?: boolean;
}

/** Desktop: a spreadsheet with inline editing. Mobile: one card per word. */
export function VocabularyList({ words, allWords, selected, onSelect, hideWords = false }: Props) {
  const [peek, setPeek] = useState<string | null>(null);
  const update = useUpdateWord();
  const [open, setOpen] = useState<string | null>(null);
  const speechEn = useSpeech('en');
  const speechZh = useSpeech('zh');
  const topics = topicOptions(allWords).map((t) => ({ value: t, label: t }));
  const posOptions = POS.map((p) => ({ value: p, label: POS_LABEL[p] }));

  const save = (w: VocabWord, patch: Parameters<typeof update.mutate>[0]['patch']) => {
    // Editing the word itself re-evaluates the Check column.
    const full = patch.term ? { ...patch, review_correct: reviewCheck(patch.term, w.review_input, w.language as 'en' | 'zh') } : patch;
    update.mutate({ id: w.id, patch: full }, { onError: (e) => toast.error(toUserMessage(e)) });
  };
  const hidden = (w: VocabWord) => hideWords && peek !== w.id;
  const masked = (w: VocabWord) => (
    <button type="button" onClick={() => setPeek(w.id)} title="Show the word" className="rounded px-1 font-mono tracking-widest text-muted-foreground hover:bg-muted">
      {'•'.repeat(Math.min(Math.max(w.term.length, 3), 10))}
    </button>
  );
  const play = (w: VocabWord) => (w.language === 'zh' ? speechZh : speechEn).play(`v:${w.id}`, w.term, 0.9);
  const allOn = words.length > 0 && words.every((w) => selected.has(w.id));
  // Render one layout only, so inputs and their labels exist once.
  const desktop = useMediaQuery('(min-width: 768px)');

  return (
    <>
      {/* Desktop table */}
      {desktop && (
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[1080px] text-sm">
          <thead className="sticky top-0 bg-muted/60 text-left text-xs font-medium text-muted-foreground">
            <tr>
              <th className="w-8 p-2">
                <input type="checkbox" aria-label="Select all" checked={allOn} onChange={(e) => onSelect(words.map((w) => w.id), e.target.checked)} />
              </th>
              <th className="w-8 p-2" />
              <th className="min-w-40 p-2">Từ mới</th>
              <th className="w-24 whitespace-nowrap p-2">Loại từ</th>
              <th className="w-28 p-2">Phiên âm</th>
              <th className="min-w-52 p-2">Giải thích</th>
              <th className="min-w-32 p-2">Topic</th>
              <th className="w-16 p-2 text-center">Ví dụ</th>
              <th className="min-w-40 p-2">Ôn từ vựng</th>
              <th className="w-20 p-2">Check</th>
              <th className="w-20 p-2">Typing</th>
              <th className="w-24 p-2">Status</th>
              <th className="w-24 whitespace-nowrap p-2">Ngày thêm</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {words.map((w) => {
              const lang = w.language === 'zh' ? 'zh' : 'en';
              const isOpen = open === w.id;
              const exampleCount = (w.examples?.length ?? 0) + (w.context_sentence ? 1 : 0);
              return (
                <Fragment key={w.id}>
                  <tr className={cn('align-top hover:bg-muted/30', selected.has(w.id) && 'bg-accent/40')}>
                    <td className="p-2">
                      <input type="checkbox" aria-label={`Select ${w.term}`} checked={selected.has(w.id)} onChange={(e) => onSelect([w.id], e.target.checked)} />
                    </td>
                    <td className="p-1">
                      <button type="button" onClick={() => play(w)} aria-label={`Pronounce ${w.term}`} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                        <Volume2 className="size-4" />
                      </button>
                    </td>
                    <td className="p-2 font-medium">
                      {hidden(w) ? masked(w) : <EditableCell label="Word" value={w.term} lang={lang} maxLength={100} onSave={(v) => v && save(w, { term: v })} />}
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-1">
                        <EditableCell label="Type" value={w.part_of_speech} options={posOptions} render={(v) => (v ? <PosBadge pos={v} /> : <span className="text-muted-foreground/50">—</span>)} onSave={(v) => save(w, { part_of_speech: v || null })} />
                        <PosWarning word={w} onFix={(pos) => save(w, { part_of_speech: pos })} />
                      </div>
                    </td>
                    <td className="p-2 text-muted-foreground">
                      {hidden(w) ? null : <EditableCell label="Reading" value={w.reading} maxLength={100} onSave={(v) => save(w, { reading: v || null })} />}
                    </td>
                    <td className="max-w-64 p-2">
                      <EditableCell label="Meaning" value={w.meaning_vi} onSave={(v) => save(w, { meaning_vi: v || null })} />
                    </td>
                    <td className="p-2">
                      <EditableCell label="Topic" value={w.topic} options={topics} onSave={(v) => save(w, { topic: v || null })} />
                    </td>
                    <td className="p-2 text-center">
                      <button type="button" onClick={() => setOpen(isOpen ? null : w.id)} aria-expanded={isOpen} aria-label={`Examples for ${w.term}`} className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs hover:bg-muted">
                        {isOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />} {exampleCount}
                      </button>
                    </td>
                    <td className="p-1">
                      <ReviewInput word={w} />
                    </td>
                    <td className="p-2">
                      <CheckBadge correct={w.review_correct} />
                    </td>
                    <td className="p-2 pt-3">
                      <TypingDots level={w.typing_level} />
                    </td>
                    <td className="p-2">
                      <StatusBadge status={w.status} />
                    </td>
                    <td className="p-2 text-xs text-muted-foreground">{date(w.created_at)}</td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-muted/20">
                      <td colSpan={2} />
                      <td colSpan={11} className="p-3">
                        <WordDetails word={w} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      )}

      {/* Mobile cards */}
      {!desktop && (
      <ul className="space-y-2">
        {words.map((w) => {
          const lang = w.language === 'zh' ? 'zh' : 'en';
          const isOpen = open === w.id;
          return (
            <li key={w.id} className={cn('rounded-lg border bg-card p-3', selected.has(w.id) && 'border-primary')}>
              <div className="flex items-start gap-2">
                <input type="checkbox" className="mt-1.5" aria-label={`Select ${w.term}`} checked={selected.has(w.id)} onChange={(e) => onSelect([w.id], e.target.checked)} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {hidden(w) ? masked(w) : (
                      <span className="text-base font-semibold" lang={lang}>
                        {w.term}
                      </span>
                    )}
                    <PosBadge pos={w.part_of_speech} />
                    <PosWarning word={w} onFix={(pos) => save(w, { part_of_speech: pos })} />
                    <span className="text-xs text-muted-foreground">{w.reading}</span>
                  </div>
                  <p className="text-sm">{w.meaning_vi ?? <span className="text-muted-foreground">No meaning yet</span>}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <ReviewInput word={w} className="border-input bg-background" />
                    <CheckBadge correct={w.review_correct} />
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <StatusBadge status={w.status} />
                    <TypingDots level={w.typing_level} />
                    {w.topic && <span>{w.topic}</span>}
                  </div>
                </div>
                <button type="button" onClick={() => play(w)} aria-label={`Pronounce ${w.term}`} className="rounded p-1.5 text-muted-foreground hover:bg-muted">
                  <Volume2 className="size-4" />
                </button>
              </div>
              <button type="button" onClick={() => setOpen(isOpen ? null : w.id)} aria-expanded={isOpen} className="mt-2 text-xs font-medium text-primary">
                {isOpen ? 'Hide details' : 'Details & edit'}
              </button>
              {isOpen && (
                <div className="mt-3 space-y-3 border-t pt-3">
                  <dl className="grid grid-cols-[5.5rem_1fr] items-center gap-x-2 gap-y-1 text-sm">
                    <dt className="text-xs text-muted-foreground">Word</dt>
                    <dd><EditableCell label="Word" value={w.term} lang={lang} maxLength={100} onSave={(v) => v && save(w, { term: v })} /></dd>
                    <dt className="text-xs text-muted-foreground">Meaning</dt>
                    <dd><EditableCell label="Meaning" value={w.meaning_vi} onSave={(v) => save(w, { meaning_vi: v || null })} /></dd>
                    <dt className="text-xs text-muted-foreground">Type</dt>
                    <dd><EditableCell label="Type" value={w.part_of_speech} options={posOptions} render={(v) => (v ? <PosBadge pos={v} /> : '—')} onSave={(v) => save(w, { part_of_speech: v || null })} /></dd>
                    <dt className="text-xs text-muted-foreground">Reading</dt>
                    <dd><EditableCell label="Reading" value={w.reading} maxLength={100} onSave={(v) => save(w, { reading: v || null })} /></dd>
                    <dt className="text-xs text-muted-foreground">Topic</dt>
                    <dd><EditableCell label="Topic" value={w.topic} options={topics} onSave={(v) => save(w, { topic: v || null })} /></dd>
                  </dl>
                  <WordDetails word={w} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
      )}
    </>
  );
}
