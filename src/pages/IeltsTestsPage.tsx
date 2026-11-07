import { BookOpen, Headphones } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ErrorState } from '@/components/ErrorState';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useIeltsAttempts, type IeltsAttempt } from '@/features/ielts/api';
import { TESTS, TYPE_LABEL, fmtBand, statsByType, testById, type Skill } from '@/lib/ielts/tests';

export default function IeltsTestsPage() {
  const attempts = useIeltsAttempts();
  return (
    <>
      <PageHeader
        title="IELTS Reading & Listening"
        description="Đề luyện tập soạn riêng cho LinguaFlow theo đúng format IELTS. Chấm tự động, giải thích từng câu bằng tiếng Việt và chỉ ra chỗ chứa đáp án trong bài."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {TESTS.map((t) => {
          const Icon = t.skill === 'reading' ? BookOpen : Headphones;
          const mine = (attempts.data ?? []).filter((a) => a.test_id === t.id);
          const best = mine.filter((a) => a.band !== null).sort((a, b) => Number(b.band) - Number(a.band))[0];
          return (
            <Card key={t.id} className="flex flex-col" data-test={t.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="size-5 text-teal-600" aria-hidden /> {t.title}
                </CardTitle>
                <CardDescription>
                  {t.parts.length} {t.skill === 'reading' ? 'passages' : 'parts'} · 40 questions · {t.minutes} minutes
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between gap-3">
                <ul className="text-sm text-muted-foreground">
                  {t.parts.map((p) => (
                    <li key={p.id}>
                      {p.title}: {p.heading}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm">
                    {attempts.isPending ? (
                      <Skeleton className="h-5 w-24" />
                    ) : best ? (
                      <Badge>Band tốt nhất {fmtBand(Number(best.band))}</Badge>
                    ) : mine.length ? (
                      <span className="text-muted-foreground">{mine.length} lần luyện</span>
                    ) : (
                      <span className="text-muted-foreground">Chưa làm</span>
                    )}
                  </span>
                  <Button asChild>
                    <Link to={`/ielts/${t.id}`}>Làm bài</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {attempts.isError && <ErrorState error={attempts.error} onRetry={() => attempts.refetch()} />}
      {attempts.data && attempts.data.length > 0 && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <WeakTypes attempts={attempts.data} skill="reading" />
          <WeakTypes attempts={attempts.data} skill="listening" />
          <History attempts={attempts.data} />
        </div>
      )}
    </>
  );
}

function WeakTypes({ attempts, skill }: { attempts: IeltsAttempt[]; skill: Skill }) {
  const stats = statsByType(attempts.filter((a) => a.skill === skill).flatMap((a) => a.results));
  if (!stats.length) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{skill === 'reading' ? 'Reading' : 'Listening'}: theo dạng câu hỏi</CardTitle>
        <CardDescription>Tất cả các lần luyện — dạng yếu nhất ở trên cùng.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm" data-testid={`types-${skill}`}>
          {stats.map((s) => {
            const p = Math.round((s.correct / s.answered) * 100);
            return (
              <li key={s.type}>
                <div className="flex justify-between gap-2">
                  <span>{TYPE_LABEL[s.type].en}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {s.correct}/{s.answered} · {p}%
                  </span>
                </div>
                <Progress value={p} className="h-1" label={`${TYPE_LABEL[s.type].en} ${p}%`} />
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function History({ attempts }: { attempts: IeltsAttempt[] }) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Lịch sử làm bài</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm" data-testid="ielts-history">
          <thead className="text-left text-xs text-muted-foreground">
            <tr>
              <th className="py-1 pr-3 font-medium">Ngày</th>
              <th className="py-1 pr-3 font-medium">Bài</th>
              <th className="py-1 pr-3 font-medium">Phần</th>
              <th className="py-1 pr-3 text-right font-medium">Đúng</th>
              <th className="py-1 text-right font-medium">Band</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {attempts.slice(0, 30).map((a) => {
              const t = testById(a.test_id);
              return (
                <tr key={a.id}>
                  <td className="py-1.5 pr-3 tabular-nums">{new Date(a.created_at).toLocaleDateString()}</td>
                  <td className="py-1.5 pr-3">{t?.title ?? a.test_id}</td>
                  <td className="py-1.5 pr-3 text-muted-foreground">
                    {t && a.parts.length === t.parts.length ? 'Cả bài' : a.parts.map((p) => t?.parts.find((x) => x.id === p)?.title ?? p).join(', ')} · {a.mode === 'exam' ? 'thi thử' : 'luyện tập'}
                  </td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">
                    {a.correct}/{a.total}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{a.band === null ? '—' : fmtBand(Number(a.band))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
