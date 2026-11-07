import { Bell, BookOpen, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useStudyLanguage } from '@/features/study/context';
import { useDailyGoal } from './goal';

const today = () => new Date().toLocaleDateString('en-CA');
const read = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* private mode */
  }
};

/** Hours (local time) at which an unfinished goal triggers a system notification, once each per day. */
const REMIND_AT = [12, 20];
const SNOOZE_MS = 2 * 60 * 60 * 1000;

/**
 * Daily vocabulary goal: a banner on every page until 10 new words are learned today,
 * plus (if the learner allows it) a system notification at noon and 8 pm while the app is open.
 */
export function DailyGoalReminder() {
  const goal = useDailyGoal();
  const { lang } = useStudyLanguage();
  const navigate = useNavigate();
  const [snoozedUntil, setSnoozedUntil] = useState(() => Number(read('vocab:snooze') ?? 0));
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() => (typeof Notification === 'undefined' ? 'unsupported' : Notification.permission));
  const left = goal ? goal.goal - goal.learned : 0;

  useEffect(() => {
    if (!goal || goal.done || permission !== 'granted' || read('vocab:notify') !== 'on') return;
    const check = () => {
      const hour = new Date().getHours();
      const slot = [...REMIND_AT].reverse().find((h) => hour >= h);
      if (slot === undefined) return;
      const key = `vocab:notified:${today()}:${slot}`;
      if (read(key)) return;
      write(key, '1');
      try {
        const n = new Notification('LinguaFlow — từ vựng hôm nay', {
          body: `Bạn mới học ${goal.learned}/${goal.goal} từ mới. Còn ${left} từ nữa là xong mục tiêu hôm nay!`,
          tag: 'linguaflow-daily-words',
          icon: '/favicon.svg',
        });
        n.onclick = () => {
          window.focus();
          navigate('/review');
          n.close();
        };
      } catch {
        /* some mobile browsers only allow notifications from a service worker */
      }
    };
    check();
    const id = setInterval(check, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, [goal, permission, left, navigate]);

  if (!goal || goal.done || Date.now() < snoozedUntil) return null;

  const enableNotifications = async () => {
    if (typeof Notification === 'undefined') return;
    const p = await Notification.requestPermission();
    setPermission(p);
    if (p === 'granted') write('vocab:notify', 'on');
  };

  return (
    <div className="border-b border-violet-200 bg-violet-50 dark:border-violet-500/30 dark:bg-violet-500/10" role="status" data-testid="daily-goal-reminder">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 text-sm sm:px-6">
        <span className="flex items-center gap-2 font-medium text-violet-900 dark:text-violet-100">
          <BookOpen className="size-4 shrink-0" aria-hidden />
          Từ vựng hôm nay: {goal.learned}/{goal.goal} từ mới {lang === 'zh' ? 'tiếng Trung' : 'tiếng Anh'}
        </span>
        <span className="h-1.5 w-28 overflow-hidden rounded-full bg-violet-200 dark:bg-violet-500/30" aria-hidden>
          <span className="block h-full rounded-full bg-violet-600" style={{ width: `${(goal.learned / goal.goal) * 100}%` }} />
        </span>
        <span className="text-violet-800/80 dark:text-violet-200/80">Còn {left} từ để đạt mục tiêu.</span>
        <span className="ml-auto flex items-center gap-1">
          {permission === 'default' && (
            <Button variant="ghost" size="sm" className="h-7 text-violet-800 dark:text-violet-200" onClick={enableNotifications}>
              <Bell className="size-3.5" /> Nhắc tôi
            </Button>
          )}
          <Button asChild size="sm" className="h-7 bg-violet-600 text-white hover:bg-violet-700">
            <Link to="/review">Học ngay</Link>
          </Button>
          <button
            type="button"
            className="rounded p-1 text-violet-700 hover:bg-violet-100 dark:text-violet-300 dark:hover:bg-violet-500/20"
            aria-label="Ẩn 2 giờ"
            title="Ẩn 2 giờ"
            onClick={() => {
              const until = Date.now() + SNOOZE_MS;
              write('vocab:snooze', String(until));
              setSnoozedUntil(until);
            }}
          >
            <X className="size-4" />
          </button>
        </span>
      </div>
    </div>
  );
}
