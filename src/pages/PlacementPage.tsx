import { ArrowLeft, ClipboardCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import data from '../../content/roadmap/placement.json';
import { BASELINE, todayKey } from '@/lib/roadmap/plan';
import { placements, savePlacement, type PlacementResult } from '@/lib/roadmap/progress';
import { cn } from '@/lib/utils';

interface Q {
  level: string;
  q: string;
  options: string[];
  answer: number;
}
const GRAMMAR = data.grammar as Q[];
const VOCAB = data.vocab as Q[];
const READING = data.reading as Q[];
const SECTIONS = [
  { id: 'g', name: 'Phần 1 · Ngữ pháp', items: GRAMMAR },
  { id: 'v', name: 'Phần 2 · Từ vựng', items: VOCAB },
  { id: 'r', name: 'Phần 3 · Đọc hiểu', items: READING },
] as const;
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/**
 * /lo-trinh/kiem-tra — the placement test of 14/11/2026, taken again at the end of each phase.
 * Multiple choice is marked here; the translations are shown next to a model answer, the paragraph is kept.
 */
export default function PlacementPage() {
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [texts, setTexts] = useState<string[]>(['', '', '', '', '']);
  const [missing, setMissing] = useState<string[]>([]);
  const [result, setResult] = useState<PlacementResult | null>(null);
  const started = useRef(Date.now());
  const history = placements();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [result]);

  const submit = () => {
    const miss = SECTIONS.flatMap((s) => s.items.map((_, i) => `${s.id}${i}`).filter((k) => picked[k] === undefined));
    texts.slice(0, 4).forEach((t, i) => t.trim().length < 5 && miss.push(`w${i}`));
    if (words(texts[4]!) < 40) miss.push('w4');
    setMissing(miss);
    if (miss.length) {
      document.querySelector(`[data-q="${miss[0]}"]`)?.scrollIntoView({ block: 'center' });
      return;
    }
    const score = (id: string, items: Q[]): [number, number] => [items.filter((q, i) => picked[`${id}${i}`] === q.answer).length, items.length];
    const r: PlacementResult = { date: todayKey(), grammar: score('g', GRAMMAR), vocab: score('v', VOCAB), reading: score('r', READING), minutes: Math.round((Date.now() - started.current) / 60000), writing: texts };
    savePlacement(r);
    setResult(r);
  };

  if (result) return <Result result={result} />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/lo-trinh" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:underline">
        <ArrowLeft className="size-3.5" aria-hidden /> Lộ trình
      </Link>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Kiểm tra trình độ</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Khoảng 60 phút: 15 câu ngữ pháp, 12 câu từ vựng, 1 bài đọc 7 câu, 4 câu dịch và 1 đoạn văn. Không tra từ điển. Lần đầu (14/11/2026): ngữ pháp {BASELINE.grammar.join('/')}, từ vựng {BASELINE.vocab.join('/')}, đọc hiểu {BASELINE.reading.join('/')}.
        </p>
        {history.length > 0 && <p className="mt-1 text-sm text-muted-foreground">Đã làm lại {history.length} lần, gần nhất ngày {history[history.length - 1]!.date}.</p>}
      </header>

      {SECTIONS.map((s) => (
        <section key={s.id} aria-labelledby={`sec-${s.id}`} className="space-y-3">
          <h2 id={`sec-${s.id}`} className="text-lg font-semibold">
            {s.name}
          </h2>
          {s.id === 'r' && (
            <Card>
              <CardContent className="space-y-3 pt-5 font-serif text-[15px] leading-relaxed" lang="en">
                {data.passage.map((p) => (
                  <p key={p.slice(0, 20)}>{p}</p>
                ))}
              </CardContent>
            </Card>
          )}
          {s.items.map((q, i) => {
            const k = `${s.id}${i}`;
            return (
              <div key={k} className="rounded-xl border bg-card p-4" data-q={k}>
                <p className="mb-2 text-[15px]" lang="en">
                  <span className="mr-2 text-sm text-muted-foreground">{s.id.toUpperCase()}{i + 1}</span>
                  {q.q}
                </p>
                <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={`${s.id.toUpperCase()}${i + 1}`}>
                  {q.options.map((o, j) => (
                    <button
                      key={o}
                      type="button"
                      role="radio"
                      aria-checked={picked[k] === j}
                      onClick={() => {
                        setPicked((p) => ({ ...p, [k]: j }));
                        setMissing((m) => m.filter((x) => x !== k));
                      }}
                      className={cn('rounded-lg border px-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', picked[k] === j ? 'border-primary bg-primary/10' : 'hover:bg-muted')}
                      lang="en"
                    >
                      {String.fromCharCode(65 + j)}. {o}
                    </button>
                  ))}
                </div>
                {missing.includes(k) && <p className="mt-1 text-sm text-destructive">Chọn một đáp án</p>}
              </div>
            );
          })}
        </section>
      ))}

      <section aria-labelledby="sec-w" className="space-y-3">
        <h2 id="sec-w" className="text-lg font-semibold">
          Phần 4 · Viết
        </h2>
        {data.translate.map((t, i) => (
          <div key={t.vi} className="rounded-xl border bg-card p-4" data-q={`w${i}`}>
            <p className="mb-2 text-[15px]">
              <span className="mr-2 text-sm text-muted-foreground">W{i + 1}</span>
              {t.vi}
            </p>
            <Textarea
              value={texts[i]}
              onChange={(e) => {
                const v = e.target.value;
                setTexts((x) => x.map((y, j) => (j === i ? v : y)));
                setMissing((m) => m.filter((x) => x !== `w${i}`));
              }}
              placeholder="Bản dịch của bạn"
              lang="en"
            />
            {missing.includes(`w${i}`) && <p className="mt-1 text-sm text-destructive">Viết bản dịch (dịch được bao nhiêu thì viết bấy nhiêu)</p>}
          </div>
        ))}
        <div className="rounded-xl border bg-card p-4" data-q="w4">
          <p className="mb-2 text-[15px]">
            <span className="mr-2 text-sm text-muted-foreground">W5</span>
            Viết đoạn văn 120–180 từ: <i lang="en">{data.essay}</i>
          </p>
          <Textarea
            className="min-h-48"
            value={texts[4]}
            onChange={(e) => {
              const v = e.target.value;
              setTexts((x) => x.map((y, j) => (j === 4 ? v : y)));
              setMissing((m) => m.filter((x) => x !== 'w4'));
            }}
            lang="en"
          />
          <p className="mt-1 text-xs text-muted-foreground">Số từ: {words(texts[4]!)}</p>
          {missing.includes('w4') && <p className="mt-1 text-sm text-destructive">Viết ít nhất 40 từ</p>}
        </div>
      </section>

      <div className="flex items-center justify-end gap-3">
        {missing.length > 0 && <p className="text-sm text-destructive">Còn {missing.length} câu chưa làm</p>}
        <Button size="lg" onClick={submit}>
          <ClipboardCheck /> Nộp bài
        </Button>
      </div>
    </div>
  );
}

function Result({ result }: { result: PlacementResult }) {
  const rows: { name: string; now: [number, number]; base: readonly [number, number] }[] = [
    { name: 'Ngữ pháp', now: result.grammar, base: BASELINE.grammar },
    { name: 'Từ vựng', now: result.vocab, base: BASELINE.vocab },
    { name: 'Đọc hiểu', now: result.reading, base: BASELINE.reading },
  ];
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="text-2xl font-bold tracking-tight">Kết quả ngày {result.date}</h1>
      <div className="grid gap-3 sm:grid-cols-3">
        {rows.map((r) => {
          const diff = r.now[0] - r.base[0];
          return (
            <Card key={r.name}>
              <CardContent className="pt-5">
                <p className="text-sm text-muted-foreground">{r.name}</p>
                <p className="text-2xl font-bold tabular-nums">
                  {r.now[0]}/{r.now[1]}
                </p>
                <p className={cn('text-sm', diff > 0 ? 'text-success' : diff < 0 ? 'text-destructive' : 'text-muted-foreground')}>
                  {diff > 0 ? `+${diff}` : diff} so với 14/11 ({r.base[0]}/{r.base[1]})
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <Card>
        <CardContent className="space-y-4 pt-5">
          <h2 className="font-semibold">Phần dịch: so với bản mẫu</h2>
          {data.translate.map((t, i) => (
            <div key={t.vi} className="space-y-0.5 text-sm">
              <p className="font-medium">{t.vi}</p>
              <p lang="en">
                Bạn viết: <span className="text-muted-foreground">{result.writing[i]}</span>
              </p>
              <p lang="en">
                Bản mẫu: <b>{t.model}</b>
              </p>
            </div>
          ))}
          <p className="text-sm text-muted-foreground">
            Đoạn văn W5 ({words(result.writing[4] ?? '')} từ) đã được lưu. Muốn chấm band, dán đoạn văn vào Viết tự do và nộp để nhận nhận xét AI.
          </p>
        </CardContent>
      </Card>
      <div className="flex gap-2">
        <Button asChild>
          <Link to="/dashboard">Về trang Hôm nay</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/writing/new/en-w-ielts-edu">Viết tự do</Link>
        </Button>
      </div>
    </div>
  );
}
