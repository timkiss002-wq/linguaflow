import { BookMarked, CheckCircle2, Copy, Download, Flame, HelpCircle, NotebookPen, Plus, Upload } from 'lucide-react';
import { useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CoverArt } from '@/features/passage3/CoverArt';
import { useP3Store } from '@/features/passage3/useP3Store';
import { activeDays, dailyDone, dailyVersion, subscribeDaily } from '@/lib/daily';
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
  notebook,
  setSummary,
  streak,
  today,
  type P3Set,
  type P3Type,
} from '@/lib/ielts/passage3';
import { cn } from '@/lib/utils';

type Tab = 'sets' | 'cambridge' | 'notes';
type TypeFilter = 'all' | P3Type;
type StatusFilter = 'all' | 'todo' | 'done';

/**
 * /ielts/passage3 — the Reading Passage 3 library. Filters sit in a left column (source, question type, status), the
 * sets fill a grid on the right. Today's three tasks live on "Hôm nay" (/dashboard).
 */
export default function Passage3Page() {
  useP3Store();
  useSyncExternalStore(subscribeDaily, dailyVersion);
  const [params, setParams] = useSearchParams();
  const tab = (['sets', 'cambridge', 'notes'].includes(params.get('tab') ?? '') ? params.get('tab') : 'sets') as Tab;
  const setTab = (t: Tab) => setParams(t === 'sets' ? {} : { tab: t }, { replace: true });
  const [type, setType] = useState<TypeFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const p = getProgress();
  const notes = notebook();
  const done = dailyDone();
  const days = [...new Set([...p.days, ...activeDays()])];
  const doneCount = OWN_SETS.filter((s) => p.done[s.id]).length;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reading Passage 3</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Mỗi ngày 4–5 câu, tô cặp từ đồng nghĩa giữa câu hỏi và bài đọc · đã làm {doneCount}/{OWN_SETS.length} bài
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-sm" title="Số ngày luyện liên tiếp">
            <Flame className={cn('size-4', done.length ? 'text-orange-500' : 'text-muted-foreground')} aria-hidden />
            <b>{streak(days)}</b> ngày
          </span>
          <HowTo />
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="space-y-5 lg:sticky lg:top-16" aria-label="Bộ lọc">
          <FilterGroup title="Nguồn">
            <FilterItem on={tab === 'sets'} onClick={() => setTab('sets')} n={OWN_SETS.length}>
              Bài soạn sẵn
            </FilterItem>
            <FilterItem on={tab === 'cambridge'} onClick={() => setTab('cambridge')} n={`${getImports().filter((s) => s.camId).length}/${CAM_INDEX.length}`}>
              Cambridge 10–20
            </FilterItem>
            <FilterItem on={tab === 'notes'} onClick={() => setTab('notes')} n={notes.length}>
              Sổ paraphrase
            </FilterItem>
            <Link to="/ielts/reading" className="flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
              Đề Reading đầy đủ <span aria-hidden>→</span>
            </Link>
          </FilterGroup>
          {tab === 'sets' && (
            <>
              <FilterGroup title="Dạng câu hỏi">
                {(['all', 'tfng', 'ynng', 'mcq', 'gap'] as TypeFilter[]).map((t) => (
                  <FilterItem key={t} on={type === t} onClick={() => setType(t)} n={t === 'all' ? OWN_SETS.length : OWN_SETS.filter((s) => s.type === t).length}>
                    {t === 'all' ? 'Tất cả' : TYPE_INFO[t].label}
                  </FilterItem>
                ))}
              </FilterGroup>
              <FilterGroup title="Trạng thái">
                {(
                  [
                    ['all', 'Tất cả', OWN_SETS.length],
                    ['todo', 'Chưa làm', OWN_SETS.length - doneCount],
                    ['done', 'Đã làm', doneCount],
                  ] as [StatusFilter, string, number][]
                ).map(([k, label, n]) => (
                  <FilterItem key={k} on={status === k} onClick={() => setStatus(k)} n={n}>
                    {label}
                  </FilterItem>
                ))}
              </FilterGroup>
            </>
          )}
        </aside>
        <div className="min-w-0">
          {tab === 'sets' && <OwnSets type={type} status={status} />}
          {tab === 'cambridge' && <Cambridge />}
          {tab === 'notes' && <Notes />}
        </div>
      </div>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1 px-2.5 text-xs font-semibold text-muted-foreground">{title}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function FilterItem({ on, onClick, n, children }: { on: boolean; onClick: () => void; n: number | string; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        'flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        on ? 'bg-accent font-semibold text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      <span className="truncate">{children}</span>
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{n}</span>
    </button>
  );
}

function SetCard({ set }: { set: P3Set }) {
  const d = getProgress().done[set.id];
  const sum = setSummary(set);
  return (
    <Link to={`/ielts/passage3/${set.id}`} className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-colors hover:border-primary/40" data-set={set.id}>
      <div className="relative">
        <CoverArt id={set.id} art={set.art} className="aspect-[2/1] w-full" />
        <span className="absolute left-2 top-2 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-bold text-white">{TYPE_INFO[set.type].short}</span>
        {d ? (
          <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white">
            <CheckCircle2 className="size-3" aria-hidden /> {d.score}/{d.total}
          </span>
        ) : sum.checked ? (
          <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-slate-900">
            {sum.checked}/{set.items.length}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-0.5 p-3">
        <span className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-primary">{set.title}</span>
        <span className="line-clamp-1 text-xs text-muted-foreground">{set.topic}</span>
      </div>
    </Link>
  );
}

/** cards shown before "Xem thêm" (five rows of three) */
const PAGE = 15;

function OwnSets({ type, status }: { type: TypeFilter; status: StatusFilter }) {
  const [shown, setShown] = useState(PAGE);
  const p = getProgress();
  const list = OWN_SETS.filter((s) => (type === 'all' || s.type === type) && (status === 'all' || (status === 'done') === !!p.done[s.id]));
  return (
    <div className="space-y-4" key={`${type}-${status}`}>
      <p className="text-sm text-muted-foreground">
        <b className="text-foreground">{list.length}</b> bài · soạn riêng theo độ khó Passage 3, có key từng cặp từ và giải thích tiếng Việt
      </p>
      {list.length ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-4">
          {list.slice(0, shown).map((s) => (
            <SetCard key={s.id} set={s} />
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Không có bài nào khớp bộ lọc.</p>
      )}
      {list.length > shown && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setShown((n) => n + PAGE)} data-more>
            Xem thêm ({list.length - shown} bài)
          </Button>
        </div>
      )}
    </div>
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

function Cambridge() {
  const [book, setBook] = useState<number>(() => {
    // the book last worked on, else the newest book whose titles are all listed
    const last = getImports()
      .filter((s) => s.camId)
      .pop();
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
              className={cn(
                'relative rounded-lg border px-3 py-1.5 text-sm font-semibold transition',
                book === b ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:border-primary/40',
              )}
            >
              Cam {b}
              {n > 0 && (
                <span
                  className={cn('ml-1.5 rounded-full px-1.5 text-[10px]', book === b ? 'bg-primary-foreground/20' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200')}
                >
                  {n}
                </span>
              )}
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
                    {TYPE_INFO[mine.type].short} · {mine.items.length} câu
                    {d ? ` · ${d.score}/${d.total}` : ''}
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
          <BookMarked className="size-5" aria-hidden /> Cách làm bài tập hằng ngày
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
              <b>Writing</b>: mỗi ngày một đề ngẫu nhiên — chọn <i>Viết theo khung</i> nếu muốn có câu gợi ý từng bước. <b>Listening Part 1</b>: từ khóa được đọc chậm và rõ hơn; nộp bài xong có thể
              bấm ▶ để nghe lại từng câu.
            </li>
            <li>
              <b>Gap-filling</b>: chỗ trống cũng là một từ khóa — tìm cụm trong bài trước, rồi mới chọn từ trong word box có cùng nghĩa. Word box luôn có bẫy: từ trái nghĩa, hoặc từ có trong bài nhưng
              ở ý khác.
            </li>
          </ol>
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
}
