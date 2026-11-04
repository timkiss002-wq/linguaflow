import { INTERESTS } from '@/lib/personal/goals';
import type { Lang, Metrics, TaskKind } from './analyze';

export interface WritingTask {
  id: string;
  language: Lang;
  kind: TaskKind;
  exam: 'general' | 'hsk' | 'ielts';
  level_min: number;
  level_max: number;
  topic: string | null;
  title: string;
  prompt: string;
  prompt_vi: string | null;
  min_length: number;
  max_length: number | null;
  words: string[];
}

export interface TaskPick {
  task: WritingTask;
  reasons: string[];
}

const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);

/**
 * Prompts for today: at the learner's level (or one either side), favouring their interests and exam,
 * and prompts not written recently. Same day → same order.
 */
export function pickTasks(
  tasks: WritingTask[],
  o: { language: Lang; level: number; interests: string[]; exam?: string | null; recent: Set<string>; today: string },
  limit = 3,
): TaskPick[] {
  return tasks
    .filter((t) => t.language === o.language && t.level_min - 1 <= o.level && o.level <= t.level_max + 1)
    .map((task) => {
      const reasons: string[] = [];
      let score = 0;
      if (task.level_min <= o.level && o.level <= task.level_max) {
        score += 3;
        reasons.push('at your level');
      } else if (task.level_min > o.level) {
        score += 1;
        reasons.push('a step up');
      } else reasons.push('easier');
      const interest = INTERESTS.find((i) => i.value === task.topic && o.interests.includes(i.value));
      if (interest) {
        score += 2;
        reasons.push(`you like ${interest.label.toLowerCase()}`);
      }
      const examMatch = (o.exam === 'ielts' && task.exam === 'ielts') || ((o.exam === 'hsk2' || o.exam === 'hsk3') && task.exam === 'hsk');
      if (examMatch) {
        score += 2.5; // exam practice beats a general prompt at the same level
        reasons.push(task.exam === 'ielts' ? 'IELTS format' : 'HSK format');
      }
      if (o.recent.has(task.id)) {
        score -= 4;
        reasons.push('written recently');
      }
      return { task, reasons, score, tie: hash(task.id + o.today) };
    })
    .sort((a, b) => b.score - a.score || a.tie - b.tie)
    .slice(0, limit)
    .map(({ task, reasons }) => ({ task, reasons }));
}

/** Up to `n` target words: the learner's own notebook words first (writing them is reviewing them), then the prompt's. */
export function targetWords(task: WritingTask, notebook: string[], n = 5): { words: string[]; fromNotebook: string[] } {
  // HSK-format prompts use exactly their own words, like the real exam
  if (task.exam === 'hsk') return { words: task.words.slice(0, n), fromNotebook: [] };
  const fromNotebook = [...new Set(notebook)].filter((w) => !task.words.includes(w)).slice(0, 2);
  return { words: [...fromNotebook, ...task.words].slice(0, n), fromNotebook };
}

/** Change against the average of earlier texts in the same language (null when there is nothing to compare). */
export function compareWithPrevious(now: Metrics, earlier: Metrics[]) {
  if (!earlier.length) return null;
  const avg = (f: (m: Metrics) => number) => earlier.reduce((a, m) => a + f(m), 0) / earlier.length;
  const linkerKinds = (m: Metrics) => new Set(m.linkers.map((l) => l.category)).size;
  const above = (m: Metrics) => m.aboveLevel?.length ?? 0;
  return {
    count: earlier.length,
    variety: now.variety - Math.round(avg((m) => m.variety)),
    avgSentence: Math.round((now.avgSentence - avg((m) => m.avgSentence)) * 10) / 10,
    linkerKinds: linkerKinds(now) - Math.round(avg(linkerKinds) * 10) / 10,
    issues: now.issues.length - Math.round(avg((m) => m.issues.length) * 10) / 10,
    aboveLevel: now.language === 'zh' ? above(now) - Math.round(avg(above) * 10) / 10 : undefined,
  };
}
