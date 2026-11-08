import { ClipboardPaste, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { WEB_SOURCES } from '@/lib/ielts/webSources';

/** "Đề trên web khác": free practice elsewhere, and a way to paste a passage from there to practise pairing here. */
export function WebSources() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {WEB_SOURCES.map((w) => (
          <article key={w.id} className="flex flex-col rounded-xl border bg-card p-4" data-source={w.id}>
            <h3 className="font-semibold">{w.name}</h3>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{new URL(w.url).hostname.replace(/^www\./, '')}</p>
            <p className="mt-2 flex-1 text-sm text-muted-foreground">{w.desc}</p>
            <div className="mt-3 flex flex-wrap gap-1">
              {w.tags.map((t) => (
                <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-xs">
                  {t}
                </span>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild size="sm">
                <a href={w.url} target="_blank" rel="noreferrer noopener">
                  Mở trang <ExternalLink />
                </a>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to={`/ielts/passage3/edit/new?from=${encodeURIComponent(w.name)}`}>
                  <ClipboardPaste /> Dán đề vào app
                </Link>
              </Button>
            </div>
          </article>
        ))}
      </div>
      <p className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
        Đề trên các trang này thuộc bản quyền của họ nên LinguaFlow chỉ dẫn link, không chép nội dung. Làm đề ở đó; khi muốn luyện ghép cặp từ khóa với một đoạn
        Passage 3, bấm “Dán đề vào app”, dán đoạn văn và 4–5 câu hỏi — đề chỉ lưu trên trình duyệt của bạn và hiện trong mục Cambridge 10–20 → Đề khác.
      </p>
    </div>
  );
}
