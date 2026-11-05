import { ArrowRight, BookOpen, CalendarCheck, ClipboardCheck, Ear, Headphones, Keyboard, PenLine, Sparkles, Volume2, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/useAuth';
import { TONE, type Tone } from '@/lib/ui/tones';
import { cn } from '@/lib/utils';

const STEPS: { icon: LucideIcon; title: string; text: string; tone: Tone }[] = [
  { icon: Headphones, tone: 'teal', title: 'Listen', text: 'Hear one natural sentence read aloud. Slow it down and replay it as often as you need.' },
  { icon: Keyboard, tone: 'violet', title: 'Type', text: 'Write down exactly what you hear — English words or Chinese characters.' },
  { icon: Ear, tone: 'orange', title: 'Check', text: 'See every missing, extra or misspelled word, and whether a Chinese mistake was hearing or writing.' },
];

const FEATURES: { icon: LucideIcon; title: string; text: string; tone: Tone }[] = [
  { icon: Keyboard, title: 'Dictation Room', text: 'Sentence-by-sentence listening with slow replay, hints and a clear breakdown of every mistake.', tone: 'teal' },
  { icon: Sparkles, title: 'Built for Chinese too', text: 'Pinyin on demand, HSK levels, and checking that tells a wrong tone or a same-sound 汉字 apart from mishearing.', tone: 'teal' },
  { icon: BookOpen, title: 'Your word notebook', text: 'Save words with the sentence you met them in, flashcards with spaced repetition, IELTS word forms and typing practice.', tone: 'violet' },
  { icon: PenLine, title: 'Writing with feedback', text: 'Prompts for your level and interests, an instant analysis, and optional AI corrections explained in Vietnamese.', tone: 'rose' },
  { icon: ClipboardCheck, title: 'Level test & weak spots', text: 'A short adaptive test per skill, then the exact mistakes you repeat — tones, word endings, grammar points.', tone: 'sky' },
  { icon: CalendarCheck, title: 'A plan for every day', text: 'Reviews, one weak spot and a lesson just above your level — sized to the minutes you have.', tone: 'orange' },
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
              <Link to="/dashboard">Go to dashboard</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild>
                <Link to="/register">Get started</Link>
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
              English · 中文 (Simplified, with Pinyin)
            </p>
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              Learn languages by listening, typing and writing.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              Practise English and Chinese (HSK 3–6) with short listening lessons. Hear a sentence, type it, and see exactly what you missed — then keep the new words with spaced repetition.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link to={user ? '/dashboard' : '/register'}>
                  Start learning free <ArrowRight />
                </Link>
              </Button>
              {!user && (
                <Button size="lg" variant="outline" asChild>
                  <Link to="/login">I already have an account</Link>
                </Button>
              )}
            </div>
          </div>
          <DictationPreview />
        </div>
        </section>

        <section className="border-y bg-card py-16">
          <div className="container">
            <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">How it works</h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-3">
              {STEPS.map(({ icon: Icon, title, text, tone }, i) => (
                <div key={title} className="text-center">
                  <div className={cn('mx-auto flex size-14 items-center justify-center rounded-2xl', TONE[tone].tile)}>
                    <Icon className="size-5" aria-hidden />
                  </div>
                  <p className="mt-4 text-sm font-medium text-muted-foreground">Step {i + 1}</p>
                  <h3 className="mt-1 font-semibold">{title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="container py-16">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Everything you need to practise daily</h2>
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
          <span>Audio is generated on your device with text-to-speech.</span>
        </div>
      </footer>
    </div>
  );
}

const WAVE = [30, 55, 80, 45, 90, 60, 35, 70, 95, 50, 40, 75, 85, 45, 30, 65, 90, 55, 35, 60, 80, 40, 25, 50, 70, 45, 30, 55];

const ZH_PREVIEW: [string, string, 'ok' | 'char'][] = [
  ['今', 'jīn', 'ok'],
  ['天', 'tiān', 'ok'],
  ['天', 'tiān', 'ok'],
  ['汽', 'qì', 'char'],
  ['很', 'hěn', 'ok'],
  ['好', 'hǎo', 'ok'],
];

/** Static illustration of the Dictation Room result view (not interactive). */
function DictationPreview() {
  return (
    <div aria-hidden className="rotate-1 rounded-2xl border bg-card p-5 shadow-lift">
      <div className="flex items-center gap-4 rounded-lg bg-gradient-to-br from-teal-700 via-teal-600 to-emerald-600 p-5 text-white">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/15">
          <Volume2 className="size-5" />
        </div>
        <div className="flex h-10 flex-1 items-center gap-[3px]">
          {WAVE.map((h, i) => (
            <span key={i} className="w-1 rounded-full bg-white/70" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>Sentence 4 / 18</span>
        <span>0.75x · Replay</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-muted">
        <div className="h-full w-1/4 rounded-full bg-primary" />
      </div>
      <div className="mt-4 rounded-md border p-3 text-sm leading-7">
        <span className="text-success">I've been</span>{' '}
        <span className="rounded bg-destructive/10 px-1 text-destructive line-through">walking</span>{' '}
        <span className="rounded bg-success/10 px-1 text-success">working</span>{' '}
        <span className="text-success">here for</span>{' '}
        <span className="rounded border border-dashed border-warning px-1 text-warning">almost</span>{' '}
        <span className="text-success">three years.</span>
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-1 rounded-md border p-3" lang="zh">
        <div className="flex items-end">
          {ZH_PREVIEW.map(([char, py, state], i) => (
            <ruby key={i} className={cn('px-[1px] text-lg', state === 'ok' ? 'text-success' : 'rounded-sm bg-warning/15 text-warning')}>
              {char}
              <rt className="pb-0.5 text-[10px] font-normal text-muted-foreground">{py}</rt>
            </ruby>
          ))}
        </div>
        <span className="pb-1 text-xs text-muted-foreground">汽 → 气 · same sound, wrong character</span>
      </div>
    </div>
  );
}
