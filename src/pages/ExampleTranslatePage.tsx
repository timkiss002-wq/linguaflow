import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { PracticeShell } from '@/features/practice/PracticeShell';
import { WriteRunner } from '@/features/practice/WriteRunner';
import { exampleItems } from '@/lib/practice/items';
import { dayByDate } from '@/lib/roadmap/plan';

/** /dich-vi-du/:date — the example sentence of every word learned that day, in Vietnamese, to translate back into English. */
export default function ExampleTranslatePage() {
  const { date = '' } = useParams();
  const items = useMemo(() => {
    const day = dayByDate(date);
    return day ? exampleItems(day) : [];
  }, [date]);
  return (
    <PracticeShell
      date={date}
      kind="vocab-translate"
      title="Dịch ví dụ Việt → Anh"
      intro={
        <>
          Mỗi câu là ví dụ của một từ / cụm từ hôm nay. Dịch sang tiếng Anh và <b>phải dùng đúng từ đó</b> (được chia thì, thêm -s…). Câu của bạn
          khác đáp án nhưng vẫn đúng thì bấm “Tôi viết đúng”.
        </>
      }
      empty="Bài dịch ví dụ có vào các ngày học từ mới, khi từ đã có câu ví dụ tiếng Việt."
    >
      {({ save }) => <WriteRunner key={date} items={items} mode="translate" heading="Dịch ví dụ" onFinish={save} />}
    </PracticeShell>
  );
}
