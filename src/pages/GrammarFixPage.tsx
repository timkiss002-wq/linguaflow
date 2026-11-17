import { ArrowLeft, Wrench } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { PracticeShell } from '@/features/practice/PracticeShell';
import { WriteRunner } from '@/features/practice/WriteRunner';
import { topicById } from '@/lib/grammar/drills';
import { fixItems, fixItemsOfTopic } from '@/lib/practice/items';
import { dayByDate } from '@/lib/roadmap/plan';

const INTRO = (
  <>
    Mỗi câu có <b>đúng một lỗi</b> mà người Việt hay mắc (số nhiều, chia động từ, to V / V-ing, trật tự từ…). Sửa thẳng trong ô rồi bấm Kiểm tra —
    sau mỗi câu có giải thích vì sao sai.
  </>
);

/** /sua-loi/:date — the day's error-correction set; /grammar/:topicId/sua-loi — all 10 items of one topic, for extra practice. */
export default function GrammarFixPage() {
  const { date = '', topicId } = useParams();
  const dayItems = useMemo(() => {
    const t = dayByDate(date)?.tasks.find((x) => x.kind === 'grammar-fix');
    return t?.fix ? fixItems(t.fix) : [];
  }, [date]);

  if (topicId) {
    const topic = topicById(topicId);
    const items = fixItemsOfTopic(topicId);
    if (!topic || !items.length)
      return (
        <EmptyState
          icon={Wrench}
          title="Chủ điểm này chưa có bài sửa lỗi"
          action={
            <Button asChild variant="outline">
              <Link to="/grammar">Tất cả chủ điểm</Link>
            </Button>
          }
        />
      );
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <Link to={`/grammar/${topicId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:underline">
          <ArrowLeft className="size-3.5" aria-hidden /> {topic.title_vi}
        </Link>
        <header>
          <h1 className="text-2xl font-bold tracking-tight">Sửa lỗi sai · {topic.title_vi}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{INTRO}</p>
        </header>
        <WriteRunner key={topicId} items={items} mode="fix" heading={topic.title_vi} onFinish={() => undefined} />
      </div>
    );
  }

  return (
    <PracticeShell date={date} kind="grammar-fix" title="Sửa lỗi sai" intro={INTRO} empty="Bài sửa lỗi có vào các ngày của giai đoạn Nền tảng và Luyện tập.">
      {({ save }) => <WriteRunner key={date} items={dayItems} mode="fix" heading="Sửa lỗi sai" onFinish={save} />}
    </PracticeShell>
  );
}
