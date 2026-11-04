import { ArrowRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PosBadge } from '@/features/vocabulary/PosBadge';
import { POS_LABEL } from '@/lib/vocab/pos';
import { cn } from '@/lib/utils';
import { FORM_POS, gradeForm, makeGrid, splitExample, type FamilyIndex, type FormPos, type FormResult } from '@/lib/wordforms';
import type { WordFormAttempt } from './api';
import { Feedback } from './Feedback';
import type { Item } from './session';

interface ItemProps<K extends Item['kind']> {
  item: Extract<Item, { kind: K }>;
  index: FamilyIndex;
  onAnswer: (attempts: WordFormAttempt[], correct: boolean) => void;
  onNext: () => void;
}

/** Gap fill and Fix-the-error share one component: type a word, get an explained verdict. */
export function TypeItem({ item, index, onAnswer, onNext }: ItemProps<'gap' | 'fix'>) {
  const [typed, setTyped] = useState('');
  const [graded, setGraded] = useState<{ result: FormResult; typedPos: FormPos | null } | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), [graded]);
  const { before, answer, after } = splitExample(item.example.sentence);

  const submit = () => {
    if (graded) return onNext();
    if (!typed.trim()) return;
    const g = gradeForm(index, item.family, answer, typed);
    setGraded(g);
    onAnswer(
      [{ family_id: item.family.id, exercise: item.kind, expected: answer, expected_pos: item.example.answer_pos, typed, typed_pos: g.typedPos, result: g.result }],
      g.result === 'correct',
    );
  };

  return (
    <form onSubmit={(e) => (e.preventDefault(), submit())} className="space-y-4">
      <p className="text-lg leading-relaxed" data-testid="exercise-sentence">
        {item.kind === 'gap' ? (
          <>
            {before}
            <span className="mx-1 inline-block min-w-20 border-b-2 border-primary text-center font-semibold text-primary">{graded ? answer : ' '}</span>
            <span className="text-muted-foreground">({item.example.base_word})</span>
            {after}
          </>
        ) : (
          <>
            {before}
            <mark className={cn('rounded px-1', graded ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive line-through decoration-2')}>{graded ? answer : item.wrong}</mark>
            {after}
          </>
        )}
      </p>
      <Input
        ref={ref}
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        readOnly={Boolean(graded)}
        aria-label={item.kind === 'gap' ? 'Correct form' : 'Corrected word'}
        placeholder={item.kind === 'gap' ? `Form of "${item.example.base_word}"…` : 'Type the correct form…'}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        className="h-11 text-lg"
      />
      {graded && <Feedback result={graded.result} typed={typed} typedPos={graded.typedPos} answer={answer} answerPos={item.example.answer_pos} why={item.example.why} />}
      <Button type="submit" className="w-full" disabled={!graded && !typed.trim()}>
        {graded ? (
          <>
            Next <ArrowRight />
          </>
        ) : (
          'Check'
        )}
      </Button>
    </form>
  );
}

/** Complete the family table. Every listed form of a part of speech is accepted. */
export function GridItem({ item, index, onAnswer, onNext }: ItemProps<'grid'>) {
  const { given, cells } = makeGrid(item.family);
  const [values, setValues] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const ok = (pos: FormPos, accepted: string[]) => accepted.some((a) => a.toLowerCase() === (values[pos] ?? '').trim().toLowerCase());

  const submit = () => {
    if (checked) return onNext();
    setChecked(true);
    const attempts = cells.map((c): WordFormAttempt => {
      const typed = (values[c.pos] ?? '').trim();
      const g = ok(c.pos, c.accepted) ? { result: 'correct' as const, typedPos: null } : gradeForm(index, item.family, c.accepted[0]!, typed || '-');
      return { family_id: item.family.id, exercise: 'grid', expected: c.accepted[0]!, expected_pos: c.pos, typed: typed || '', typed_pos: g.typedPos, result: g.result };
    });
    onAnswer(attempts, attempts.every((a) => a.result === 'correct'));
  };

  return (
    <form onSubmit={(e) => (e.preventDefault(), submit())} className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {FORM_POS.map((pos) => {
          const cell = cells.find((c) => c.pos === pos);
          if (pos === given.pos)
            return (
              <div key={pos} className="rounded-md border bg-muted/50 p-3">
                <PosBadge pos={pos} />
                <p className="mt-2 text-lg font-semibold">{given.word}</p>
              </div>
            );
          if (!cell)
            return (
              <div key={pos} className="rounded-md border border-dashed p-3 text-muted-foreground">
                <PosBadge pos={pos} />
                <p className="mt-2 text-sm">—</p>
              </div>
            );
          const right = checked && ok(pos, cell.accepted);
          return (
            <label key={pos} className={cn('rounded-md border p-3', checked && (right ? 'border-success bg-success/5' : 'border-destructive bg-destructive/5'))}>
              <PosBadge pos={pos} />
              <Input
                value={values[pos] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [pos]: e.target.value }))}
                readOnly={checked}
                aria-label={POS_LABEL[pos]}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                className="mt-2"
              />
              {checked && !right && <p className="mt-1 text-sm font-medium text-success">{cell.accepted.join(' / ')}</p>}
            </label>
          );
        })}
      </div>
      <Button type="submit" className="w-full">
        {checked ? (
          <>
            Next <ArrowRight />
          </>
        ) : (
          'Check'
        )}
      </Button>
    </form>
  );
}

/** Quick sort: pick the part of speech (keys 1–4). */
export function SortItem({ item, onAnswer, onNext }: ItemProps<'sort'>) {
  const [picked, setPicked] = useState<FormPos | null>(null);
  const pick = (pos: FormPos) => {
    if (picked) return;
    setPicked(pos);
    const correct = pos === item.member.pos;
    onAnswer(
      [{ family_id: item.family.id, exercise: 'sort', expected: item.member.word, expected_pos: item.member.pos, typed: POS_LABEL[pos], typed_pos: correct ? null : pos, result: correct ? 'correct' : 'word_form' }],
      correct,
    );
    setTimeout(onNext, correct ? 450 : 1300);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const i = ['1', '2', '3', '4'].indexOf(e.key);
      if (i >= 0) pick(FORM_POS[i]!);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="space-y-5 text-center">
      <p className="text-4xl font-semibold" data-testid="sort-word">
        {item.member.word}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {FORM_POS.map((pos, i) => (
          <Button
            key={pos}
            type="button"
            variant="outline"
            onClick={() => pick(pos)}
            className={cn('h-12', picked && pos === item.member.pos && 'border-success bg-success/15 text-success', picked === pos && pos !== item.member.pos && 'border-destructive bg-destructive/10 text-destructive')}
          >
            <span className="text-xs text-muted-foreground">{i + 1}</span> {POS_LABEL[pos]}
          </Button>
        ))}
      </div>
      {picked && item.member.meaning_vi && <p className="text-sm text-muted-foreground">{item.member.meaning_vi}</p>}
    </div>
  );
}
