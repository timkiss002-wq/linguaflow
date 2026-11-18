import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PracticeShell } from '@/features/practice/PracticeShell';
import { WriteRunner } from '@/features/practice/WriteRunner';
import { gapItems, writingWeek } from '@/lib/roadmap/writing';

/** /word-form/:date — the word families picked for the week's Writing: learn the table, then type the right form in 16 gaps. */
export default function WordFormWeekPage() {
  const { date = '' } = useParams();
  const [started, setStarted] = useState(false);
  return (
    <PracticeShell
      date={date}
      kind="wordform-week"
      title="Word form tuần"
      intro={
        <>
          Chỉ những họ từ dùng được trong bài Writing của tuần. Học bảng dưới đây (từ nào là danh từ, động từ, tính từ, trạng từ), rồi điền <b>đúng dạng</b> của từ trong
          ngoặc. Sai một chữ cái vẫn tính là sai — đó chính là điều cần luyện.
        </>
      }
      empty="Word form tuần có vào thứ Bảy (giai đoạn 1) hoặc thứ Năm (giai đoạn 2) của các tuần có Writing tuần."
    >
      {({ day, save }) => <Body week={day.week} date={date} started={started} onStart={() => setStarted(true)} save={save} />}
    </PracticeShell>
  );
}

function Body({ week, date, started, onStart, save }: { week: number; date: string; started: boolean; onStart: () => void; save: (score: number, total: number, answers?: unknown, passed?: boolean) => void }) {
  const w = writingWeek(week);
  const items = useMemo(() => (w ? gapItems(w) : []), [w]);
  if (!w) return <p className="text-sm text-muted-foreground">Tuần này chưa có word form.</p>;
  if (started) return <WriteRunner key={date} items={items} mode="gap" heading={`Word form · ${w.title}`} onFinish={save} storageKey={`${date}:wordform-week`} />;
  return (
    <div className="space-y-4">
      <p className="text-sm font-medium">
        Chủ đề tuần {w.week}: {w.title} · {w.forms.length} họ từ · {items.length} câu
      </p>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm" data-testid="families">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Họ từ</th>
              <th className="px-3 py-2">Các dạng (loại từ · nghĩa)</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {w.forms.map((f) => (
              <tr key={f.head} className="align-top">
                <td className="px-3 py-2 font-semibold" lang="en">
                  {f.head}
                </td>
                <td className="px-3 py-2">
                  <ul className="space-y-0.5">
                    {f.words.map((x) => (
                      <li key={x.w}>
                        <b lang="en">{x.w}</b> <span className="text-xs text-muted-foreground">({x.pos})</span> — {x.m}
                      </li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button onClick={onStart}>Bắt đầu điền {items.length} câu</Button>
    </div>
  );
}
