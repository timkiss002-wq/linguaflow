import { AlertTriangle, ArrowLeft, CheckCircle2, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CAM_INDEX, TYPE_INFO, deleteImport, getImports, importFor, parseImport, saveImport, toImportInput, type ImportInput, type P3Type } from '@/lib/ielts/passage3';
import { cn } from '@/lib/utils';

const EXAMPLE: Record<P3Type, string> = {
  tfng: 'The reviewer [accepts] that [earlier ethical thinking] about happiness is now [out of date]. || FALSE',
  ynng: 'The writer [believes] that boredom is [necessary for] creativity. || NOT GIVEN',
  mcq: 'What does the writer [suggest] about [early journals]? || They printed little research. || Editors chose what to publish. || Experts reviewed every paper. || They were rarely read. || B',
  gap: 'Engineers should [draw out] the ____ behind a design and [adapt] it. || H',
};

/** /ielts/passage3/edit/:key — paste a Passage 3 from the learner's own Cambridge book (key = cam10-t1…, "new", or a saved set id). */
export default function Passage3ImportPage() {
  const { key = 'new' } = useParams();
  // ?from=YouPass — the site the learner is copying from ("Đề trên web khác")
  const from = new URLSearchParams(useLocation().search).get('from');
  const navigate = useNavigate();
  const cam = CAM_INDEX.find((c) => c.id === key);
  const existing = cam ? importFor(cam.id) : getImports().find((s) => s.id === key);
  const [form, setForm] = useState<ImportInput>(() =>
    existing ? toImportInput(existing) : { camId: cam?.id, title: cam?.title ?? '', type: 'tfng', passage: '', questions: '', box: '' },
  );
  const [tried, setTried] = useState(false);
  const parsed = useMemo(() => parseImport(form), [form]);
  const set = <K extends keyof ImportInput>(k: K, v: ImportInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const nQuestions = form.questions.split('\n').filter((l) => l.trim()).length;

  const save = () => {
    setTried(true);
    if (!parsed.set) return;
    const s = existing ? { ...parsed.set, id: existing.id } : parsed.set;
    saveImport(s);
    toast.success('Đã lưu đề trên thiết bị này.');
    navigate(`/ielts/passage3/${s.id}`);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Link to={from ? '/ielts/reading?format=web' : '/ielts/reading?format=cam'} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" aria-hidden /> {from ? 'Đề trên web khác' : 'Cambridge 10–20'}
      </Link>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{cam ? `Cambridge ${cam.book} · Test ${cam.test} · Passage 3` : from ? `Đề từ ${from}` : 'Đề khác'}</p>
        <h1 className="text-2xl font-bold tracking-tight">{existing ? 'Sửa đề' : from ? 'Dán đề bạn đang làm' : 'Nhập đề từ sách của bạn'}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Chỉ cần một đoạn của Passage 3 và 4–5 câu hỏi liên quan đến đoạn đó. Đề được lưu trên trình duyệt này, không gửi lên server.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div className="space-y-1.5">
              <Label htmlFor="p3-title">Tên bài</Label>
              <Input id="p3-title" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="VD: The psychology of innovation" />
            </div>
            <div className="space-y-1.5">
              <Label>Dạng câu hỏi</Label>
              <div className="inline-flex rounded-lg bg-muted p-0.5" role="radiogroup">
                {(Object.keys(TYPE_INFO) as P3Type[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={form.type === t}
                    onClick={() => set('type', t)}
                    className={cn('rounded-md px-2.5 py-1.5 text-sm font-medium', form.type === t ? 'bg-background shadow-sm' : 'text-muted-foreground')}
                  >
                    {TYPE_INFO[t].short}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="p3-passage">Đoạn văn</Label>
            <Textarea id="p3-passage" rows={10} value={form.passage} onChange={(e) => set('passage', e.target.value)} placeholder="Dán một đoạn trong Passage 3 (giữ dòng trống giữa các đoạn)…" className="font-serif" lang="en" />
          </div>

          {form.type === 'gap' && (
            <div className="space-y-1.5">
              <Label htmlFor="p3-box">Word box (mỗi dòng 1 từ — để trống nếu đề yêu cầu lấy từ trong bài)</Label>
              <Textarea id="p3-box" rows={5} value={form.box} onChange={(e) => set('box', e.target.value)} placeholder={'A  methodical\nB  commercial\nC  power'} lang="en" />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="p3-q">Câu hỏi — mỗi dòng một câu, đáp án sau dấu ||</Label>
            <Textarea id="p3-q" rows={7} value={form.questions} onChange={(e) => set('questions', e.target.value)} placeholder={EXAMPLE[form.type]} lang="en" />
          </div>

          {(tried || nQuestions > 0) && parsed.errors.length > 0 && (
            <ul className="space-y-1 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-500/40 dark:bg-amber-500/10">
              {parsed.errors.map((e) => (
                <li key={e} className="flex gap-2">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden /> {e}
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={save} disabled={!parsed.set} data-save>
              <CheckCircle2 /> Lưu và luyện {parsed.set ? `(${parsed.set.items.length} câu)` : ''}
            </Button>
            {existing && (
              <Button
                variant="ghost"
                className="text-destructive"
                onClick={() => {
                  deleteImport(existing.id);
                  toast('Đã xoá đề.');
                  navigate("/ielts/reading?format=cam");
                }}
              >
                <Trash2 /> Xoá đề
              </Button>
            )}
          </div>
        </div>

        <aside className="space-y-3 text-sm lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-xl border bg-card p-4">
            <p className="mb-2 font-semibold">Cách ghi câu hỏi</p>
            <ul className="list-disc space-y-1.5 pl-4 text-muted-foreground">
              <li>
                Đặt từ khóa cần ghép trong <code className="rounded bg-muted px-1">[ngoặc vuông]</code> — đó chính là các từ thầy bảo tô màu.
              </li>
              <li>
                Chỗ trống viết <code className="rounded bg-muted px-1">____</code>.
              </li>
              <li>
                Đáp án ở cuối, sau <code className="rounded bg-muted px-1">||</code>: TRUE/FALSE/NOT GIVEN, YES/NO/NOT GIVEN, chữ cái (MCQ, word box) hoặc từ cần điền (nhiều đáp án: <code className="rounded bg-muted px-1">a / b</code>).
              </li>
              <li>MCQ: các phương án cũng cách nhau bằng ||.</li>
            </ul>
          </div>
          <div className="rounded-xl border bg-muted/40 p-4">
            <p className="mb-1 font-semibold">Ví dụ ({TYPE_INFO[form.type].short})</p>
            <p className="break-words font-mono text-xs leading-relaxed" lang="en">
              {EXAMPLE[form.type]}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
