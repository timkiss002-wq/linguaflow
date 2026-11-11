import { ArrowLeft, ArrowRight, BookOpen, Check, CircleSlash, Eraser, Pencil, RotateCcw, Trophy, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CoverArt } from '@/features/passage3/CoverArt';
import { PassageText, type TokenLook } from '@/features/passage3/PassageText';
import { useP3Store } from '@/features/passage3/useP3Store';
import {
  JUDGE,
  LETTERS,
  TYPE_INFO,
  answerLabel,
  grade,
  itemMeta,
  itemState,
  overlaps,
  resetSet,
  saveItem,
  setById,
  setSummary,
  settled,
  tokenize,
  type ItemState,
  type P3Set,
} from '@/lib/ielts/passage3';
import { sentenceWith } from '@/lib/ielts/locate';
import { cn } from '@/lib/utils';

/** /ielts/passage3/:setId — one short passage, 4–5 questions: pair the keywords first, then answer. */
export default function Passage3PracticePage() {
  const { setId = '' } = useParams();
  useP3Store();
  const set = setById(setId);
  if (!set)
    return (
      <EmptyState
        icon={BookOpen}
        title="Không tìm thấy bài này"
        description="Bài tự nhập chỉ có trên thiết bị đã nhập nó."
        action={
          <Button asChild variant="outline">
            <Link to="/ielts/reading?format=p3">Về Passage 3 ngắn</Link>
          </Button>
        }
      />
    );
  return <Session key={set.id} set={set} />;
}

function firstOpen(set: P3Set) {
  const i = set.items.findIndex((_, k) => !itemState(set.id, k).checked);
  return i < 0 ? 0 : i;
}

function Session({ set }: { set: P3Set }) {
  const [i, setI] = useState(() => firstOpen(set));
  const [active, setActive] = useState<string | null>(null);
  const navigate = useNavigate();
  const tokens = useMemo(() => tokenize(set.passage), [set.passage]);
  const meta = useMemo(() => itemMeta(set, i), [set, i]);
  const st = itemState(set.id, i);
  const sum = setSummary(set);
  const finished = sum.checked === set.items.length;

  const pending = meta.pills.filter((id) => !settled(st, id));
  const current = !st.checked ? (active && meta.pills.includes(active) ? active : (pending[0] ?? null)) : null;
  const allSettled = pending.length === 0;
  const step = st.checked ? 3 : allSettled ? 2 : 1;

  const update = (patch: Partial<ItemState>) => saveItem(set, i, { ...st, ...patch });
  const go = (k: number) => {
    setI(k);
    setActive(null);
  };

  const owner: Record<number, string> = {};
  for (const [id, arr] of Object.entries(st.sel)) for (const t of arr) owner[t] = id;

  const look = (k: number): TokenLook => {
    const t = tokens[k];
    const l: TokenLook = {};
    if (!t) return l;
    for (const id of meta.order) if (!meta.pills.includes(id) && overlaps(t, meta.ranges[id])) l.bg = meta.color[id];
    if (owner[k]) l.bg = meta.color[owner[k]];
    if (st.checked && !set.keyless) {
      for (const id of meta.pills) if (overlaps(t, meta.ranges[id])) l.key = meta.color[id];
      if (owner[k] && !overlaps(t, meta.ranges[owner[k]])) l.wrong = true;
    }
    return l;
  };

  const onWord = (k: number) => {
    if (!current) return;
    const had = (st.sel[current] ?? []).includes(k);
    const sel: Record<string, number[]> = {};
    for (const [id, arr] of Object.entries(st.sel)) sel[id] = arr.filter((x) => x !== k);
    if (!had) sel[current] = [...(sel[current] ?? []), k];
    setActive(current);
    update({ sel, none: { ...st.none, [current]: false } });
  };

  const markNone = () => {
    if (!current) return;
    const none = { ...st.none, [current]: true };
    update({ sel: { ...st.sel, [current]: [] }, none });
    setActive(meta.pills.find((id) => id !== current && !(none[id] || st.sel[id]?.length)) ?? null);
  };

  const check = () => {
    const res = grade(set, i, st);
    saveItem(set, i, { ...st, checked: true, res });
  };

  return (
    <div className="space-y-4" data-p3-session={set.id}>
      {/* top bar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link to="/ielts/reading?format=p3" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" aria-hidden /> Passage 3 ngắn
        </Link>
        <CoverArt id={set.id} art={set.art} className="hidden h-10 w-12 shrink-0 rounded-md sm:block" />
        <div className="order-last min-w-0 basis-full sm:order-none sm:basis-auto sm:flex-1">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {set.topic} · {TYPE_INFO[set.type].label}
          </p>
          <h1 className="truncate text-lg font-bold tracking-tight">{set.title}</h1>
        </div>
        {set.keyless && (
          <Button asChild variant="ghost" size="sm">
            <Link to={`/ielts/passage3/edit/${set.camId ?? set.id}`}>
              <Pencil /> Sửa đề
            </Link>
          </Button>
        )}
        <nav className="ml-auto flex gap-1.5" aria-label="Các câu">
          {set.items.map((_, k) => {
            const s = itemState(set.id, k);
            return (
              <button
                key={k}
                type="button"
                onClick={() => go(k)}
                aria-current={k === i ? 'step' : undefined}
                className={cn(
                  'size-8 rounded-full border text-sm font-medium transition',
                  k === i && 'border-2 border-foreground',
                  s.checked && s.res?.ansOk && 'border-emerald-400 bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-200',
                  s.checked && !s.res?.ansOk && 'border-rose-300 bg-rose-100 text-rose-900 dark:bg-rose-500/20 dark:text-rose-200',
                )}
              >
                {k + 1}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start">
        {/* passage */}
        <section className="max-h-[45vh] overflow-y-auto rounded-2xl border bg-card p-5 shadow-sm sm:p-6 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6.5rem)]" aria-label="Đoạn văn">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Passage</p>
          <PassageText tokens={tokens} look={look} onWord={onWord} interactive={!!current} />
        </section>

        {/* question */}
        <section className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm sm:p-6" aria-label="Câu hỏi">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">
              Câu {i + 1}
              <span className="font-normal text-muted-foreground">/{set.items.length}</span>
            </p>
            <Steps step={step} />
          </div>

          <p className="text-lg leading-[2.1] sm:text-xl" lang="en">
            {meta.parts.map((p, k) => {
              if (p.t === 'txt') return <span key={k}>{p.v}</span>;
              if (p.t === 'ob')
                return (
                  <span key={k} className="rounded px-1 text-neutral-900" style={{ background: meta.color[p.id] }}>
                    {p.v}
                  </span>
                );
              const done = settled(st, p.id);
              const res = st.res?.pairs.find((x) => x.id === p.id);
              const isGap = p.id === 'g';
              return (
                <button
                  key={k}
                  type="button"
                  disabled={st.checked}
                  onClick={() => setActive(p.id)}
                  data-pill={p.id}
                  className={cn(
                    'mx-0.5 inline-flex items-center gap-1 rounded-lg border-2 px-2 py-0 align-baseline leading-normal transition',
                    done ? 'border-transparent text-neutral-900' : 'border-dashed border-rose-400 bg-background text-rose-700 dark:text-rose-300',
                    current === p.id && 'ring-2 ring-foreground ring-offset-2 ring-offset-card',
                  )}
                  style={done ? { background: st.none[p.id] ? 'hsl(var(--muted))' : meta.color[p.id] } : undefined}
                >
                  <span className="text-[11px] font-semibold opacity-60">{meta.pills.indexOf(p.id) + 1}</span>
                  {isGap ? '______' : p.v}
                  {!done && <span className="text-sm font-bold">?</span>}
                  {st.none[p.id] && <CircleSlash className="size-3.5" aria-label="không có trong bài" />}
                  {res && res.ok !== null && (res.ok ? <Check className="size-4 text-emerald-700" aria-label="đúng" /> : <X className="size-4 text-rose-700" aria-label="sai" />)}
                </button>
              );
            })}
          </p>

          {!st.checked && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 text-sm">
              <span className="mr-auto text-muted-foreground">
                {current ? (
                  <>
                    Đang ghép từ khóa <b className="text-foreground">{meta.pills.indexOf(current) + 1}</b> — bấm từ tương ứng trong passage
                  </>
                ) : allSettled ? (
                  'Đã ghép xong — chọn đáp án bên dưới.'
                ) : (
                  'Bấm một từ khóa có dấu ? để bắt đầu.'
                )}
              </span>
              <Button variant="outline" size="sm" onClick={markNone} disabled={!current} data-none>
                <CircleSlash /> Không có trong bài
              </Button>
              <Button variant="ghost" size="sm" disabled={!current || !settled(st, current)} onClick={() => current && update({ sel: { ...st.sel, [current]: [] }, none: { ...st.none, [current]: false } })}>
                <Eraser /> Xoá
              </Button>
            </div>
          )}

          <Answers set={set} i={i} st={st} enabled={allSettled && !st.checked} onPick={(a) => update({ ans: a })} />

          <div className="flex items-center justify-between gap-2 pt-1">
            {i > 0 ? (
              <Button variant="ghost" onClick={() => go(i - 1)}>
                <ArrowLeft /> Câu trước
              </Button>
            ) : (
              <span />
            )}
            {!st.checked ? (
              <Button onClick={check} disabled={!allSettled || st.ans === null || st.ans === ''} data-check>
                Kiểm tra
              </Button>
            ) : i < set.items.length - 1 ? (
              <Button onClick={() => go(i + 1)}>
                Câu tiếp <ArrowRight />
              </Button>
            ) : null}
          </div>

          {st.checked && st.res && <Feedback set={set} i={i} st={st} meta={meta} />}

          {finished && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-foreground p-4 text-background">
              <Trophy className="size-5" aria-hidden />
              <p className="mr-auto text-sm">
                <b>Xong bài!</b> Đáp án đúng {sum.right}/{set.items.length}
                {sum.pairsTotal > 0 && ` · cặp từ đúng ${sum.pairsOk}/${sum.pairsTotal}`}
              </p>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  resetSet(set.id);
                  go(0);
                }}
              >
                <RotateCcw /> Làm lại
              </Button>
              <Button size="sm" variant="secondary" onClick={() => navigate('/ielts/reading?format=p3')}>
                Về trang chính
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Steps({ step }: { step: number }) {
  const s = [
    [1, 'Ghép từ khóa'],
    [2, 'Chọn đáp án'],
  ] as const;
  return (
    <ol className="flex items-center gap-1.5 text-xs">
      {s.map(([n, label]) => (
        <li
          key={n}
          className={cn(
            'flex items-center gap-1 rounded-full px-2 py-0.5',
            step === n ? 'bg-primary text-primary-foreground' : step > n ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-muted text-muted-foreground',
          )}
        >
          {step > n ? <Check className="size-3" aria-hidden /> : <span className="font-bold">{n}</span>} {label}
        </li>
      ))}
    </ol>
  );
}

function Answers({ set, i, st, enabled, onPick }: { set: P3Set; i: number; st: ItemState; enabled: boolean; onPick: (a: string | number) => void }) {
  const item = set.items[i]!;
  const tone = (v: string | number) =>
    cn(
      'rounded-xl border-2 px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed',
      !st.checked && !enabled && 'opacity-50',
      st.ans === v && !st.checked && 'border-foreground bg-muted',
      st.checked && v === item.ans && 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10',
      st.checked && st.ans === v && v !== item.ans && 'border-rose-400 bg-rose-50 dark:bg-rose-500/10',
      enabled && 'hover:border-foreground/40',
    );
  if (set.type === 'tfng' || set.type === 'ynng')
    return (
      <div className="grid grid-cols-3 gap-2">
        {JUDGE[set.type].map(([k, label]) => (
          <button key={k} type="button" className={cn(tone(k), 'text-center font-semibold')} disabled={!enabled} onClick={() => onPick(k)} data-ans={k}>
            {label}
          </button>
        ))}
      </div>
    );
  if (set.type === 'mcq')
    return (
      <div className="grid gap-2">
        {(item.options ?? []).map((o, k) => (
          <button key={k} type="button" className={tone(k)} disabled={!enabled} onClick={() => onPick(k)} data-ans={k} lang="en">
            <b className="mr-2 text-muted-foreground">{LETTERS[k]}</b>
            {o}
          </button>
        ))}
      </div>
    );
  if (set.box?.length)
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {set.box.map((w, k) => (
          <button key={k} type="button" className={tone(k)} disabled={!enabled} onClick={() => onPick(k)} data-ans={k} lang="en">
            <b className="mr-2 text-muted-foreground">{LETTERS[k]}</b>
            {w}
          </button>
        ))}
      </div>
    );
  return <Input value={st.ans === null ? '' : String(st.ans)} disabled={!enabled} placeholder="Gõ từ điền vào chỗ trống" onChange={(e) => onPick(e.target.value)} lang="en" />;
}

function Feedback({ set, i, st, meta }: { set: P3Set; i: number; st: ItemState; meta: ReturnType<typeof itemMeta> }) {
  const item = set.items[i]!;
  const res = st.res!;
  const tokens = tokenize(set.passage);
  // the sentence(s) of the passage that hold the answer, with each pair's phrase in its own colour
  const found = Object.entries(item.pairs).filter(([, pr]) => pr.p) as [string, { p: string }][];
  const sentences = set.keyless ? [] : [...new Set(found.map(([, pr]) => sentenceWith(set.passage, pr.p)).filter((x): x is string => Boolean(x)))].slice(0, 2);
  const tint = (sentence: string) => {
    const hits = found.map(([id, pr]) => ({ id, at: sentence.indexOf(pr.p), len: pr.p.length })).filter((h) => h.at >= 0).sort((a, b) => a.at - b.at);
    const out: React.ReactNode[] = [];
    let at = 0;
    for (const h of hits) {
      if (h.at < at) continue;
      out.push(sentence.slice(at, h.at));
      out.push(
        <span key={h.id + h.at} className="rounded px-0.5 text-neutral-900" style={{ background: meta.color[h.id] }}>
          {sentence.slice(h.at, h.at + h.len)}
        </span>,
      );
      at = h.at + h.len;
    }
    out.push(sentence.slice(at));
    return out;
  };
  return (
    <div className={cn('space-y-2 rounded-xl border-l-4 p-4 text-sm', res.ansOk ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-500/5' : 'border-rose-500 bg-rose-50/60 dark:bg-rose-500/5')}>
      <p className="flex flex-wrap items-baseline gap-x-3">
        <b className="text-base">{answerLabel(set, item, item.ans)}</b>
        <span className="text-muted-foreground">bạn chọn: {answerLabel(set, item, st.ans)}</span>
        <span className={cn('ml-auto font-bold tracking-wide', res.ansOk ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400')}>{res.ansOk ? 'ĐÚNG' : 'SAI'}</span>
      </p>
      {sentences.length > 0 && (
        <blockquote className="border-l-2 border-amber-500/60 pl-3 font-serif italic leading-relaxed" lang="en" data-testid="p3-evidence">
          {sentences.map((x, k) => (
            <p key={k}>{tint(x)}</p>
          ))}
        </blockquote>
      )}
      <ul className="space-y-1">
        {res.pairs.map((x) => {
          const part = meta.parts.find((p) => p.t !== 'txt' && p.id === x.id);
          const label = x.id === 'g' ? 'chỗ trống' : part && part.t !== 'txt' ? part.v : x.id;
          const pr = item.pairs[x.id];
          const mine = st.none[x.id] ? '∅ không có trong bài' : (st.sel[x.id] ?? []).map((k) => tokens[k]?.w).join(' ');
          return (
            <li key={x.id} className="flex flex-wrap items-baseline gap-x-1.5">
              {x.ok === null ? <span className="text-muted-foreground">•</span> : x.ok ? <Check className="size-3.5 self-center text-emerald-600" /> : <X className="size-3.5 self-center text-rose-600" />}
              <b lang="en">{label}</b>
              {set.keyless ? (
                <>
                  ⇄ <span className="rounded px-1 text-neutral-900" style={{ background: meta.color[x.id] }} lang="en">{mine}</span>
                </>
              ) : (
                <>
                  → {pr?.p ? <span className="rounded px-1 text-neutral-900" style={{ background: meta.color[x.id] }} lang="en">{pr.p}</span> : <i>không có trong bài (∅)</i>}
                  {pr?.vi && <span className="text-muted-foreground">· {pr.vi}</span>}
                </>
              )}
            </li>
          );
        })}
      </ul>
      {item.para?.length ? (
        <p className="flex flex-wrap gap-1.5">
          <span className="text-muted-foreground">Paraphrase:</span>
          {item.para.map(([a, b]) => (
            <span key={a} className="rounded-md bg-background px-2 ring-1 ring-border" lang="en">
              {a} ⇄ {b}
            </span>
          ))}
        </p>
      ) : null}
      {item.explain && <p className="leading-relaxed">{item.explain}</p>}
      {set.keyless && <p className="text-muted-foreground">Đề tự nhập không có key cho từng cặp — đối chiếu phần giải thích trong sách hoặc hỏi thầy.</p>}
    </div>
  );
}
