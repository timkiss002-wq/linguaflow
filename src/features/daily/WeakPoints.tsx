import { readErrors, weakTags, type ErrorLog } from '@/lib/translate-daily';

/**
 * "Lỗi bạn hay mắc": the grammar points with the most recent first-try mistakes, counted together from the daily
 * translation and the daily multiple choice. Both exercises lean towards these points.
 */
export function WeakPoints({ log }: { log?: ErrorLog }) {
  const weak = weakTags(log ?? readErrors());
  return (
    <section aria-labelledby="weak" className="space-y-2">
      <h2 id="weak" className="text-sm font-semibold">
        Lỗi bạn hay mắc <span className="font-normal text-muted-foreground">· tính chung bài dịch, trắc nghiệm ngữ pháp và từ nối</span>
      </h2>
      {weak.length ? (
        <ul className="space-y-1.5">
          {weak.map((t) => (
            <li key={t.id} className="rounded-lg border bg-card px-3 py-2 text-sm">
              <span className="font-medium">{t.name}</span>
              <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700 tabular-nums dark:bg-rose-500/15 dark:text-rose-300">sai {Math.round(t.weight)} lần gần đây</span>
              <p className="mt-0.5 text-muted-foreground">{t.tip}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Chưa có. Câu nào sai ngay lần đầu (ở bài dịch hay trắc nghiệm) sẽ được ghi lại theo điểm ngữ pháp; bài hôm sau của cả hai sẽ ưu tiên đúng những điểm đó.</p>
      )}
    </section>
  );
}
