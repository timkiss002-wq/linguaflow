import { ArrowRight, BookOpen, Ear, Headphones, Keyboard, Layers, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/useAuth';
import { cn } from '@/lib/utils';

const STEPS = [
  { icon: Headphones, title: 'Listen', text: 'Play one short sentence from a real video. Slow it down or loop it as often as you need.' },
  { icon: Keyboard, title: 'Type', text: 'Write down exactly what you hear — English words or Chinese characters.' },
  { icon: Ear, title: 'Check', text: 'See every missing, extra or misspelled word, and whether a Chinese mistake was hearing or writing.' },
];

const FEATURES = [
  { icon: Keyboard, title: 'Dictation Room', text: 'Sentence-by-sentence listening practice with hints, replay and detailed error analysis.' },
  { icon: Sparkles, title: 'Built for Chinese too', text: 'Pinyin on demand, and homophone-aware checking that separates 的/得 slips from mishearing.' },
  { icon: BookOpen, title: 'Words in context', text: 'Tap any word to see its meaning and save it together with the sentence you heard it in.' },
  { icon: Layers, title: 'Spaced repetition', text: 'Review saved words as flashcards on an SM-2 schedule, so you remember them for good.' },
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
        <section className="container grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              English · 中文 (Simplified, with Pinyin)
            </p>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Learn languages through the videos you love.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              Turn interviews, vlogs, podcasts and dramas into active listening practice. Hear a sentence, type it, and see exactly what you missed.
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
        </section>

        <section className="border-y bg-card py-16">
          <div className="container">
            <h2 className="text-center text-2xl font-semibold tracking-tight">How it works</h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-3">
              {STEPS.map(({ icon: Icon, title, text }, i) => (
                <div key={title} className="text-center">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
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
          <h2 className="text-2xl font-semibold tracking-tight">Everything you need to practise daily</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-lg border bg-card p-6">
                <Icon className="size-5 text-primary" aria-hidden />
                <h3 className="mt-3 font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container flex flex-col items-center justify-between gap-2 text-sm text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} LinguaFlow</span>
          <span>Videos are embedded from their original sources. We never download or re-host them.</span>
        </div>
      </footer>
    </div>
  );
}

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
    <div aria-hidden className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex aspect-video items-center justify-center rounded-lg bg-gradient-to-br from-slate-800 to-slate-900">
        <div className="flex size-14 items-center justify-center rounded-full bg-white/15 backdrop-blur">
          <div className="ml-1 size-0 border-y-[10px] border-l-[16px] border-y-transparent border-l-white" />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>Sentence 4 / 18</span>
        <span>0.75x · Loop on</span>
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
