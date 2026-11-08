import { BookMarked, CheckCircle2, Copy, Download, Flame, HelpCircle, NotebookPen, Plus, Upload } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useP3Store } from '@/features/passage3/useP3Store';
import {
  CAM_BOOKS,
  CAM_INDEX,
  OWN_SETS,
  TYPE_INFO,
  exportBackup,
  getImports,
  getProgress,
  importBackup,
  importFor,
  nextSet,
  notebook,
  setSummary,
  streak,
  today,
  type P3Set,
} from '@/lib/ielts/passage3';
import { cn } from '@/lib/utils';

type Tab = 'sets' | 'cambridge' | 'notes';
type Pick = 'A' | 'B' | 'cam';

const PICKS: { id: Pick; label: string; hint: string }[] = [
  { id: 'A', label: 'T/F/NG · MCQ', hint: 'Option 1' },
  { id: 'B', label: 'Gap-filling', hint: 'Option 2' },
  { id: 'cam', label: 'Cambridge', hint: 'Đề bạn nhập' },
];

/**
 * /ielts/passage3 — one card says what to do today; everything else sits in three tabs
 * (ready-made sets · Cambridge 10–20 · paraphrase notebook).
 */
export default function Passage3Page() {
  useP3Store();
  const [params, setParams] = useSearchParams();
  const tab = (['sets', 'cambridge', 'notes'].includes(params.get('tab') ?? '') ? params.get('tab') : 'sets') as Tab;
  const setTab = (t: Tab) => setParams(t === 'sets' ? {} : { tab: t }, { replace: true });
  const p = getProgress();
  const notes = notebook();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Passage 3 hằng ngày</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Mỗi ngày 4–5 câu. Ghép từ khóa trong câu hỏi với từ đồng nghĩa trong bài trước, rồi mới chọn đáp án.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-sm" title="Số ngày luyện liên tiếp">
            <Flame className={cn('size-4', p.days.includes(today()) ? 'text-orange-500' : 'text-muted-foreground')} aria-hidden />
            <b>{streak(p.days)}</b> ngày
          </span>
          <HowTo />
        </div>
      </header>

      <Today />

      <div>
        <div role="tablist" className="-mx-1 mb-4 flex gap-1 overflow-x-auto border-b px-1">
          <TabButton on={tab === 'sets'} onClick={() => setTab('sets')}>
            Bài soạn sẵn <Count n={OWN_SETS.length} />
          </TabButton>
          <TabButton on={tab === 'cambridge'} onClick={() => setTab('cambridge')}>
            Cambridge 10–20 <Count n={getImports().filter((s) => s.camId).length} of={CAM_INDEX.length} />
          </TabButton>
          <TabButton on={tab === 'notes'} onClick={() => setTab('notes')}>
            Sổ paraphrase <Count n={notes.length} />
          </TabButton>
        </div>
        {tab === 'sets' && <OwnSets />}
        {tab === 'cambridge' && <Cambridge />}
        {tab === 'notes' && <Notes />}
      </div>
    </div>
  );
}

function TabButton({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={on}
      onClick={onClick}
      className={cn('-mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition', on ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}
    >
      {children}
    </button>
  );
}

const Count = ({ n, of }: { n: number; of?: number }) => (
  <span className="rounded-full bg-muted px-1.5 text-[11px] font-semibold text-muted-foreground">
    {n}
    {of !== undefined && `/${of}`}
  </span>
);

const PICK_KEY = 'lf.p3daily.pick';
function Today() {
  const [pick, setPickState] = useState<Pick>(() => {
    try {
      return (localStorage.getItem(PICK_KEY) as Pick) || 'A';
    } catch {
      return 'A';
    }
  });
  const setPick = (v: Pick) => {
    setPickState(v);
    try {
      localStorage.setItem(PICK_KEY, v);
    } catch {
      /* ignore */
    }
  };
  const set = nextSet(pick);
  const done = set ? getProgress().done[set.id] : undefined;
  const sum = set ? setSummary(set) : null;

  return (
    <section className="overflow-hidden rounded-2xl border bg-gradient-to-br from-sky-50 via-background to-violet-50 shadow-sm dark:from-sky-500/10 dark:to-violet-500/10" aria-label="Bài hôm nay">
      <div className="flex flex-wrap items-center gap-2 border-b bg-background/60 px-4 py-2.5 sm:px-5">
        <span className="mr-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hôm nay luyện</span>
        <div className="grid w-full grid-cols-3 rounded-lg bg-muted p-0.5 sm:inline-grid sm:w-auto" role="radiogroup">
          {PICKS.map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={pick === o.id}
              onClick={() => setPick(o.id)}
              className={cn('whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium transition sm:px-3 sm:text-sm', pick === o.id ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground')}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      {set ? (
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">
              {set.topic} · {TYPE_INFO[set.type].label} · {set.items.length} câu
            </p>
            <p className="mt-0.5 text-xl font-bold tracking-tight">{set.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {done ? `Đã làm hết — ôn lại bài điểm thấp nhất (${done.score}/${done.total}).` : sum && sum.checked > 0 ? `Đang làm dở: ${sum.checked}/${set.items.length} câu.` : 'Bài mới.'}
            </p>
          </div>
          <Button asChild size="lg" className="shrink-0" data-start>
            <Link to={`/ielts/passage3/${set.id}`}>{sum && sum.checked > 0 && !done ? 'Làm tiếp' : 'Bắt đầu'}</Link>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
          <p className="flex-1 text-sm text-muted-foreground">Bạn chưa nhập đề Cambridge nào. Mở sách, chọn Passage 3 của một test, dán đoạn văn và 4–5 câu hỏi vào là luyện được ngay.</p>
          <Button asChild variant="outline">
            <Link to="/ielts/passage3?tab=cambridge">Chọn đề Cambridge</Link>
          </Button>
        </div>
      )}
    </section>
  );
}

function SetRow({ set }: { set: P3Set }) {
  const d = getProgress().done[set.id];
  const sum = setSummary(set);
  return (
    <Link to={`/ielts/passage3/${set.id}`} className="group flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 transition hover:border-primary/40 hover:shadow-sm" data-set={set.id}>
      <span className="w-14 shrink-0 rounded-md bg-muted py-0.5 text-center text-[11px] font-bold text-muted-foreground">{TYPE_INFO[set.type].short}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium group-hover:text-primary">{set.title}</span>
        <span className="block truncate text-xs text-muted-foreground">{set.topic}</span>
      </span>
      {d ? (
        <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="size-3.5" aria-hidden /> {d.score}/{d.total}
        </span>
      ) : sum.checked ? (
        <span className="shrink-0 text-xs text-muted-foreground">
          {sum.checked}/{set.items.length}
        </span>
      ) : null}
    </Link>
  );
}

function OwnSets() {
  const cols: { track: 'A' | 'B'; title: string }[] = [
    { track: 'A', title: 'Option 1 · T/F/NG, Y/N/NG, MCQ' },
    { track: 'B', title: 'Option 2 · Gap-filling (word box)' },
  ];
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {cols.map((c) => (
        <section key={c.track} className="min-w-0">
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{c.title}</h2>
          <div className="space-y-2">
            {OWN_SETS.filter((s) => s.track === c.track).map((s) => (
              <SetRow key={s.id} set={s} />
            ))}
          </div>
        </section>
      ))}
      <p className="text-xs text-muted-foreground md:col-span-2">Bài soạn riêng cho LinguaFlow theo độ khó Passage 3, có key cho từng cặp từ và giải thích tiếng Việt.</p>
    </div>
  );
}

function Cambridge() {
  const [book, setBook] = useState<number>(() => {
    // the book last worked on, else the newest book whose titles are all listed
    const last = getImports().filter((s) => s.camId).pop();
    const fromLast = CAM_INDEX.find((c) => c.id === last?.camId)?.book;
    return fromLast ?? [...CAM_BOOKS].reverse().find((b) => CAM_INDEX.filter((c) => c.book === b).every((c) => c.title)) ?? 20;
  });
  const file = useRef<HTMLInputElement>(null);
  const others = getImports().filter((s) => !s.camId);

  const download = () => {
    const blob = new Blob([exportBackup()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `linguaflow-passage3-${today()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const restore = async (f: File | undefined) => {
    if (!f) return;
    try {
      const n = importBackup(await f.text());
      toast.success(`Đã khôi phục ${n} đề.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không đọc được file.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Chọn sách">
        {CAM_BOOKS.map((b) => {
          const n = CAM_INDEX.filter((c) => c.book === b && importFor(c.id)).length;
          return (
            <button
              key={b}
              type="button"
              role="radio"
              aria-checked={book === b}
              onClick={() => setBook(b)}
              className={cn('relative rounded-lg border px-3 py-1.5 text-sm font-semibold transition', book === b ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:border-primary/40')}
            >
              Cam {b}
              {n > 0 && <span className={cn('ml-1.5 rounded-full px-1.5 text-[10px]', book === b ? 'bg-primary-foreground/20' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200')}>{n}</span>}
            </button>
          );
        })}
      </div>

      <div className="divide-y rounded-xl border bg-card">
        {CAM_INDEX.filter((c) => c.book === book).map((c) => {
          const mine = importFor(c.id);
          const d = mine ? getProgress().done[mine.id] : undefined;
          return (
            <div key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3" data-cam={c.id}>
              <span className="w-16 shrink-0 text-sm font-semibold">Test {c.test}</span>
              <span className="min-w-0 flex-1">
                <span className={cn('block truncate text-sm', !(mine?.title ?? c.title) && 'italic text-muted-foreground')}>{mine?.title ?? c.title ?? 'Tên bài: điền khi nhập'}</span>
                {mine && (
                  <span className="text-xs text-muted-foreground">
                    {TYPE_INFO[mine.type].short} · {mine.items.length} câu{d ? ` · ${d.score}/${d.total}` : ''}
                  </span>
                )}
              </span>
              {mine ? (
                <span className="flex gap-1.5">
                  <Button asChild size="sm" variant="ghost">
                    <Link to={`/ielts/passage3/edit/${c.id}`}>Sửa</Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link to={`/ielts/passage3/${mine.id}`}>Luyện</Link>
                  </Button>
                </span>
              ) : (
                <Button asChild size="sm" variant="outline">
                  <Link to={`/ielts/passage3/edit/${c.id}`}>
                    <Plus /> Nhập đề
                  </Link>
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {others.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Đề khác bạn đã nhập</h2>
          <div className="space-y-2">
            {others.map((s) => (
              <SetRow key={s.id} set={s} />
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-muted/50 p-3 text-sm">
        <p className="mr-auto max-w-xl text-xs text-muted-foreground">
          Đề Cambridge có bản quyền nên LinguaFlow không lưu sẵn nội dung — bạn dán từ sách của mình, và đề chỉ nằm trên trình duyệt này. Dùng sao lưu để chuyển sang máy khác.
        </p>
        <Button asChild size="sm" variant="ghost">
          <Link to="/ielts/passage3/edit/new">
            <Plus /> Đề khác
          </Link>
        </Button>
        <Button size="sm" variant="ghost" onClick={download}>
          <Download /> Sao lưu
        </Button>
        <Button size="sm" variant="ghost" onClick={() => file.current?.click()}>
          <Upload /> Khôi phục
        </Button>
        <input ref={file} type="file" accept="application/json,.json" className="hidden" onChange={(e) => restore(e.target.files?.[0])} />
      </div>
    </div>
  );
}

function Notes() {
  const rows = notebook();
  if (!rows.length)
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-card px-6 py-10 text-center text-sm text-muted-foreground">
        <NotebookPen className="size-6" aria-hidden />
        Làm xong một bài, các cặp từ đồng nghĩa (từ trong câu hỏi ⇄ từ trong bài) sẽ được gom vào đây. Cặp bạn ghép sai nằm trên cùng.
      </div>
    );
  const copy = async () => {
    const text = rows.map((r) => [r.question, r.passage, r.vi].join('\t')).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Đã sao chép — dán vào Excel hoặc Anki.');
    } catch {
      toast.error('Trình duyệt không cho sao chép.');
    }
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {rows.length} cặp · <span className="text-rose-600 dark:text-rose-400">{rows.filter((r) => r.missed).length} cặp bạn ghép sai</span>
        </p>
        <Button size="sm" variant="outline" onClick={copy}>
          <Copy /> Sao chép
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Trong câu hỏi</th>
              <th className="px-3 py-2">Trong passage</th>
              <th className="px-3 py-2">Nghĩa</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r, k) => (
              <tr key={k} className={cn(r.missed && 'bg-rose-50/60 dark:bg-rose-500/5')}>
                <td className={cn('px-3 py-2', r.missed && 'border-l-4 border-rose-400')} lang="en">
                  {r.question}
                </td>
                <td className="px-3 py-2 font-medium" lang="en">
                  {r.passage}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{r.vi}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HowTo() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <HelpCircle /> Cách làm
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogTitle className="flex items-center gap-2">
          <BookMarked className="size-5" aria-hidden /> Tô cặp từ trước, chọn đáp án sau
        </DialogTitle>
        <DialogDescription asChild>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-foreground">
            <li>
              <b>Cặp hiển nhiên</b> (tên riêng, số, từ lặp lại) đã được tô sẵn — dùng chúng để tìm đúng chỗ trong bài.
            </li>
            <li>
              <b>Từ khóa có dấu ?</b> là từ đã bị paraphrase. Bấm vào nó, rồi bấm (các) từ cùng nghĩa trong passage.
            </li>
            <li>
              Không tìm thấy cặp → bấm <b>∅ Không có trong bài</b>: dấu hiệu của <b>NOT GIVEN</b>. Cảnh giác với <i>first, only, all, most, never, more…than</i>.
            </li>
            <li>
              Cặp mang nghĩa <b>ngược</b> (indispensable ⇄ play no part) → <b>FALSE / NO</b>. Mọi cặp đều cùng nghĩa → <b>TRUE / YES</b>.
            </li>
            <li>
              <b>Gap-filling</b>: chỗ trống cũng là một từ khóa — tìm cụm trong bài trước, rồi mới chọn từ trong word box có cùng nghĩa. Word box luôn có bẫy: từ trái nghĩa, hoặc từ có trong bài nhưng ở ý khác.
            </li>
          </ol>
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
}
