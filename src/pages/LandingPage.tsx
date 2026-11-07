import { ArrowRight, BookOpen, CalendarCheck, ClipboardCheck, Ear, Keyboard, Languages, PenLine, Sparkles, Target, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/useAuth';
import { TONE, type Tone } from '@/lib/ui/tones';
import { cn } from '@/lib/utils';

const STEPS: { icon: LucideIcon; title: string; text: string; tone: Tone }[] = [
  { icon: ClipboardCheck, tone: 'teal', title: 'Làm đề như thi thật', text: 'Phòng thi giống bài thi IELTS trên máy: bài đọc bên trái, câu hỏi bên phải, đồng hồ, đánh dấu câu xem lại.' },
  { icon: Languages, tone: 'violet', title: 'Hiểu vì sao sai', text: 'Mỗi câu có giải thích bằng tiếng Việt và tô màu đúng chỗ chứa đáp án trong bài.' },
  { icon: Target, tone: 'orange', title: 'Luyện đúng chỗ yếu', text: 'Thống kê dạng câu hay sai, lỗi Writing hay lặp, rồi đưa vào kế hoạch học mỗi ngày.' },
];

const FEATURES: { icon: LucideIcon; title: string; text: string; tone: Tone }[] = [
  { icon: BookOpen, title: 'IELTS Reading & Listening', text: 'Đề soạn theo format IELTS Academic, chấm tự động, band ước lượng, giải thích tiếng Việt từng câu.', tone: 'teal' },
  { icon: PenLine, title: 'Writing có AI chấm band', text: 'Khung bài cho từng dạng đề, thi thử 20/40 phút, AI chấm theo 4 tiêu chí và chỉ ra từng lỗi.', tone: 'rose' },
  { icon: Keyboard, title: 'Nghe – chép chính tả', text: 'Nghe từng câu, gõ lại, thấy ngay từ thiếu, thừa hay sai chính tả. Có cả tiếng Trung (HSK, pinyin).', tone: 'teal' },
  { icon: Sparkles, title: 'Sổ từ thông minh', text: 'Lưu từ kèm câu gặp nó, ôn bằng thẻ lặp lại ngắt quãng, luyện dạng từ kiểu IELTS.', tone: 'violet' },
  { icon: Ear, title: 'Kiểm tra trình độ', text: 'Bài kiểm tra ngắn, thích ứng, cho từng kỹ năng — rồi chỉ ra đúng lỗi bạn hay lặp lại.', tone: 'sky' },
  { icon: CalendarCheck, title: 'Kế hoạch mỗi ngày', text: 'Ôn từ, một điểm yếu và một bài vừa sức — vừa đủ số phút bạn có.', tone: 'orange' },
];

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="container flex h-16 items-center justify-between">
        <Logo />
        <nav className="flex items-center gap-2">
          {user ? (
            <Button asChild>
              <Link to="/dashboard">Vào trang học</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link to="/login">Đăng nhập</Link>
              </Button>
              <Button asChild>
                <Link to="/register">Đăng ký miễn phí</Link>
              </Button>
            </>
          )}
        </nav>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute -left-32 -top-32 size-[28rem] rounded-full bg-teal-200/40 blur-3xl dark:bg-teal-500/10" />
          <div aria-hidden className="pointer-events-none absolute -right-24 top-24 size-[22rem] rounded-full bg-orange-200/40 blur-3xl dark:bg-orange-500/10" />
        <div className="container relative grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              Luyện thi IELTS · có cả tiếng Trung (HSK)
            </p>
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              Luyện đề IELTS như thi thật, hiểu từng lỗi bằng tiếng Việt.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              Reading, Listening và Writing theo đúng format bài thi trên máy. Sau khi nộp: đáp án được tô ngay trong bài, giải thích tiếng Việt từng câu, và AI chấm band Writing theo 4 tiêu chí.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link to={user ? '/dashboard' : '/register'}>
                  Bắt đầu miễn phí <ArrowRight />
                </Link>
              </Button>
              {!user && (
                <Button size="lg" variant="outline" asChild>
                  <Link to="/login">Tôi đã có tài khoản</Link>
                </Button>
              )}
            </div>
          </div>
          <IeltsPreview />
        </div>
        </section>

        <section className="border-y bg-card py-16">
          <div className="container">
            <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">Học thế nào</h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-3">
              {STEPS.map(({ icon: Icon, title, text, tone }, i) => (
                <div key={title} className="text-center">
                  <div className={cn('mx-auto flex size-14 items-center justify-center rounded-2xl', TONE[tone].tile)}>
                    <Icon className="size-5" aria-hidden />
                  </div>
                  <p className="mt-4 text-sm font-medium text-muted-foreground">Bước {i + 1}</p>
                  <h3 className="mt-1 font-semibold">{title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="container py-16">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Đủ để luyện mỗi ngày</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text, tone }) => (
              <div key={title} className="rounded-xl border border-border/70 bg-card p-6 shadow-soft transition-transform hover:-translate-y-0.5">
                <span className={cn('flex size-11 items-center justify-center rounded-xl', TONE[tone].tile)}>
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container flex flex-col items-center justify-between gap-2 text-sm text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} LinguaFlow</span>
          <span>Âm thanh được đọc ngay trên máy bạn bằng giọng đọc của trình duyệt.</span>
        </div>
      </footer>
    </div>
  );
}

/** Static illustration of a Reading test after submitting: the answer found in the passage, explained in Vietnamese, and a Writing band. */
function IeltsPreview() {
  return (
    <div aria-hidden className="rotate-1 space-y-3 rounded-2xl border bg-card p-5 shadow-lift">
      <div className="flex items-center justify-between rounded-lg border px-3 py-1.5 text-xs">
        <span className="font-semibold">Reading Passage 1</span>
        <span className="rounded-full border px-2 py-0.5 font-mono">18:42</span>
        <span className="rounded-md bg-primary px-2 py-0.5 font-semibold text-primary-foreground">Nộp bài</span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-[13px] leading-6" lang="en">
        <p className="rounded-md border p-3">
          <strong className="mr-1 text-amber-700">B</strong> By 1900, most large cities had{' '}
          <mark className="rounded-sm bg-warning/25 px-0.5 text-foreground ring-2 ring-warning">
            <sup className="mr-0.5 font-bold text-warning">3</sup>replaced gas lamps with electric light
          </mark>
          , although rural areas waited decades longer.
        </p>
        <div className="space-y-2 rounded-md border p-3">
          <p>
            <span className="mr-1 inline-flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">3</span>
            Cities kept gas lighting until 1920.
          </p>
          <p className="text-xs font-medium text-destructive" lang="vi">
            Sai · Đáp án: <b className="text-foreground">FALSE</b>
          </p>
          <p className="text-xs text-muted-foreground" lang="vi">
            Bài nói năm 1900 các thành phố lớn đã thay đèn khí bằng đèn điện, trái với câu hỏi.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-md border p-3 text-sm">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-rose-700 text-lg font-bold text-white">6.0</span>
        <span>
          <span className="font-semibold">Writing Task 2 · AI chấm band</span>
          <span className="block text-xs text-muted-foreground">Task Response 6 · Coherence 6 · Lexical 5.5 · Grammar 6</span>
        </span>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: 13 }, (_, i) => (
          <span key={i} className={cn('flex h-6 flex-1 items-center justify-center rounded text-[10px] font-semibold', i === 2 ? 'bg-destructive text-white' : i < 9 ? 'bg-success text-white' : 'border')}>
            {i + 1}
          </span>
        ))}
      </div>
    </div>
  );
}
