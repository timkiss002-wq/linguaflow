import type { CompareResult, DiffToken, ErrorKind } from '@/lib/compare';
import { ERROR_LABELS } from './errorLabels';
import { cn } from '@/lib/utils';

const toneClass = {
  red: 'text-destructive decoration-destructive',
  amber: 'text-warning decoration-warning',
  muted: 'text-muted-foreground',
};

function needsSpace(language: 'en' | 'zh', t: DiffToken, i: number) {
  if (language === 'zh' || i === 0) return false;
  const text = t.expected ?? t.actual ?? '';
  return !(t.punct && /^[.,!?;:%)\]}'"]$/.test(text));
}

/**
 * After "Check": shows where the mistakes are without giving the answer away.
 * When `reveal` is set (correct or answer shown): shows the corrections.
 */
export function DiffView({ result, language, reveal }: { result: CompareResult; language: 'en' | 'zh'; reveal: boolean }) {
  return (
    <p lang={language === 'zh' ? 'zh' : 'en'} className={cn('text-lg leading-loose', language === 'zh' && 'tracking-wide')} data-testid="diff">
      {result.tokens.map((t, i) => (
        <span key={i}>
          {needsSpace(language, t, i) && ' '}
          <Token t={t} reveal={reveal} language={language} />
        </span>
      ))}
    </p>
  );
}

function Token({ t, reveal, language }: { t: DiffToken; reveal: boolean; language: 'en' | 'zh' }) {
  if (t.kind === 'correct') return <span className="text-success">{reveal ? t.expected : t.actual}</span>;
  const meta = ERROR_LABELS[t.kind];
  const title = `${meta.label}: ${meta.tip}`;

  if (t.expected === undefined) {
    // extra
    return (
      <del title={title} data-kind={t.kind} className={cn('rounded px-0.5 decoration-2', toneClass[meta.tone], 'bg-destructive/10')}>
        {t.actual}
      </del>
    );
  }
  if (t.actual === undefined) {
    // missing
    const blank = language === 'zh' ? '＿' : '_'.repeat(Math.min([...t.expected].length, 12));
    return (
      <span title={title} data-kind={t.kind} className={cn('rounded border border-dashed px-1 font-mono', t.punct ? 'border-muted-foreground/40' : 'border-warning', toneClass[meta.tone])}>
        {reveal ? t.expected : blank}
      </span>
    );
  }
  // substitution
  if (!reveal) {
    return (
      <span title={title} data-kind={t.kind} className={cn('rounded px-0.5 underline decoration-wavy decoration-2 underline-offset-4', toneClass[meta.tone], 'bg-destructive/5')}>
        {t.actual}
      </span>
    );
  }
  return (
    <span title={title} data-kind={t.kind} className="whitespace-nowrap">
      <del className="mr-0.5 text-destructive/70 decoration-1">{t.actual}</del>
      <ins className="rounded bg-success/10 px-0.5 text-success no-underline">{t.expected}</ins>
    </span>
  );
}

export function ErrorChips({ result, ignorePunctuation }: { result: CompareResult; ignorePunctuation: boolean }) {
  const items = (Object.keys(ERROR_LABELS) as ErrorKind[]).filter((k) => result.counts[k] > 0 && !(k === 'punctuation' && ignorePunctuation));
  if (!items.length) return null;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Mistakes">
      {items.map((k) => (
        <li
          key={k}
          title={ERROR_LABELS[k].tip}
          className={cn(
            'rounded-full border px-2 py-0.5 text-xs font-medium',
            ERROR_LABELS[k].tone === 'red' ? 'border-destructive/30 text-destructive' : ERROR_LABELS[k].tone === 'amber' ? 'border-warning/40 text-warning' : 'text-muted-foreground',
          )}
        >
          {result.counts[k]} {ERROR_LABELS[k].label.toLowerCase()}
        </li>
      ))}
    </ul>
  );
}
