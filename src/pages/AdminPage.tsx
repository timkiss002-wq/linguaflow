import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useProfile } from '@/features/profile/api';
import { toUserMessage } from '@/lib/errors';
import { levelLabel, levelRating, SKILL_LABEL, type TestSkill } from '@/lib/personal/levels';
import { getSupabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface Stats {
  lessons: Record<string, { attempts: number; learners: number; accuracy: number | null }>;
  items: Record<string, { answers: number; correct: number }>;
  tasks: Record<string, { texts: number; writers: number }>;
  ai: { last_24h: number; learners_24h: number; total: number; by_model: Record<string, number> };
}

const TABS = ['Lessons', 'Level test', 'Writing', 'AI feedback'] as const;
type Tab = (typeof TABS)[number];
const LANG = { en: 'EN', zh: '中文' } as const;

function useAdminData() {
  return useQuery({
    queryKey: ['admin', 'content'],
    queryFn: async () => {
      const sb = getSupabase();
      const [stats, lessons, items, tasks] = await Promise.all([
        sb.rpc('admin_content_stats'),
        sb.from('lessons').select('id, title, language, level, hsk_level, is_published').order('language').order('hsk_level'),
        sb.from('assessment_items').select('id, language, skill, kind, level, prompt, rating, status').order('language').order('skill').order('level'),
        sb.from('writing_tasks').select('id, language, kind, exam, level_min, level_max, title, is_active').order('language').order('level_min'),
      ]);
      for (const r of [stats, lessons, items, tasks]) if (r.error) throw r.error;
      return { stats: stats.data as unknown as Stats, lessons: lessons.data!, items: items.data!, tasks: tasks.data! };
    },
  });
}

type Toggle =
  | { table: 'lessons'; id: string; patch: { is_published: boolean } }
  | { table: 'assessment_items'; id: string; patch: { status: 'approved' | 'draft' } }
  | { table: 'writing_tasks'; id: string; patch: { is_active: boolean } };

function useToggle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: Toggle) => {
      // `as never`: the patch type depends on the table, which TypeScript can't follow through the union
      const { error } = await getSupabase().from(v.table).update(v.patch as never).eq('id', v.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
    onError: (e) => toast.error(toUserMessage(e)),
  });
}

export default function AdminPage() {
  const profile = useProfile();
  const [tab, setTab] = useState<Tab>('Lessons');
  if (profile.isPending) return <Skeleton className="h-96" />;
  if (profile.data?.role !== 'admin') return <EmptyState icon={ShieldCheck} title="Admins only" description="This page manages the content every learner sees." />;
  return (
    <>
      <PageHeader
        title="Content"
        description="Choose what learners see and check how content performs. Texts are edited in content/*.json and loaded with npm run seed:build (so every change is reviewed in git)."
      />
      <div className="mb-4 flex flex-wrap gap-1 rounded-md border bg-card p-1" role="tablist" aria-label="Content type">
        {TABS.map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cn('rounded px-3 py-1.5 text-sm font-medium', tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>
            {t}
          </button>
        ))}
      </div>
      <AdminTabs tab={tab} />
    </>
  );
}

function AdminTabs({ tab }: { tab: Tab }) {
  const data = useAdminData();
  if (data.isError) return <ErrorState error={data.error} onRetry={() => data.refetch()} />;
  if (!data.data) return <Skeleton className="h-96" />;
  const d = data.data;
  if (tab === 'Lessons') return <LessonsTab d={d} />;
  if (tab === 'Level test') return <ItemsTab d={d} />;
  if (tab === 'Writing') return <TasksTab d={d} />;
  return <AiTab stats={d.stats} />;
}

type Data = NonNullable<ReturnType<typeof useAdminData>['data']>;

const Th = ({ children, right }: { children: React.ReactNode; right?: boolean }) => <th className={cn('px-2 py-1.5 font-medium', right && 'text-right')}>{children}</th>;
const Td = ({ children, right, className }: { children: React.ReactNode; right?: boolean; className?: string }) => <td className={cn('px-2 py-1.5', right && 'text-right tabular-nums', className)}>{children}</td>;

function Table({ head, children, testId }: { head: React.ReactNode; children: React.ReactNode; testId: string }) {
  return (
    <Card>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full text-sm" data-testid={testId}>
          <thead className="border-b text-left text-xs text-muted-foreground">
            <tr>{head}</tr>
          </thead>
          <tbody className="divide-y">{children}</tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function LessonsTab({ d }: { d: Data }) {
  const toggle = useToggle();
  return (
    <Table
      testId="admin-lessons"
      head={
        <>
          <Th>Lesson</Th>
          <Th>Level</Th>
          <Th right>Attempts</Th>
          <Th right>Learners</Th>
          <Th right>Accuracy</Th>
          <Th right>Published</Th>
        </>
      }
    >
      {d.lessons.map((l) => {
        const s = d.stats.lessons[l.id];
        return (
          <tr key={l.id} data-row={l.id}>
            <Td>
              <span lang={l.language === 'zh' ? 'zh-CN' : 'en'}>{l.title}</span> <Badge variant="outline">{LANG[l.language]}</Badge>
            </Td>
            <Td>{l.hsk_level ? `HSK ${l.hsk_level}` : l.level.replace('_', ' ')}</Td>
            <Td right>{s?.attempts ?? 0}</Td>
            <Td right>{s?.learners ?? 0}</Td>
            <Td right>{s?.accuracy != null ? `${s.accuracy}%` : '—'}</Td>
            <Td right>
              <Switch aria-label={`Published: ${l.title}`} checked={l.is_published} disabled={toggle.isPending} onCheckedChange={(v) => toggle.mutate({ table: 'lessons', id: l.id, patch: { is_published: v } })} />
            </Td>
          </tr>
        );
      })}
    </Table>
  );
}

/** Flags questions whose answers don't match their level: almost everyone right (too easy) or wrong (too hard / broken). */
function verdict(answers: number, correct: number) {
  if (answers < 10) return null;
  const p = correct / answers;
  return p > 0.9 ? 'too easy?' : p < 0.2 ? 'too hard or wrong key?' : null;
}

function ItemsTab({ d }: { d: Data }) {
  const toggle = useToggle();
  const [lang, setLang] = useState<'en' | 'zh'>('zh');
  const rows = useMemo(() => d.items.filter((i) => i.language === lang), [d.items, lang]);
  const flagged = rows.filter((i) => verdict(d.stats.items[i.id]?.answers ?? 0, d.stats.items[i.id]?.correct ?? 0)).length;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-md border bg-card p-1" role="group" aria-label="Question language">
          {(['zh', 'en'] as const).map((l) => (
            <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)} className={cn('rounded px-3 py-1 text-sm', lang === l ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>
              {l === 'zh' ? '中文' : 'English'}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          {rows.length} questions · {rows.filter((r) => r.status === 'approved').length} approved · {flagged} to check. Draft questions are never shown to learners.
        </p>
      </div>
      <Table
        testId="admin-items"
        head={
          <>
            <Th>Question</Th>
            <Th>Skill</Th>
            <Th>Level</Th>
            <Th right>Answers</Th>
            <Th right>Correct</Th>
            <Th right>Rating</Th>
            <Th right>Approved</Th>
          </>
        }
      >
        {rows.map((i) => {
          const s = d.stats.items[i.id];
          const v = verdict(s?.answers ?? 0, s?.correct ?? 0);
          return (
            <tr key={i.id} data-row={i.id}>
              <Td className="max-w-xs">
                <span className="text-xs text-muted-foreground">{i.id}</span>
                <p className="truncate" lang={lang === 'zh' ? 'zh-CN' : 'en'} title={i.prompt}>
                  {i.prompt}
                </p>
              </Td>
              <Td>{SKILL_LABEL[i.skill as TestSkill] ?? i.skill}</Td>
              <Td>{levelLabel(lang, i.level)}</Td>
              <Td right>{s?.answers ?? 0}</Td>
              <Td right>
                {s?.answers ? `${Math.round((s.correct / s.answers) * 100)}%` : '—'}
                {v && (
                  <Badge variant="warning" className="ml-1.5">
                    {v}
                  </Badge>
                )}
              </Td>
              <Td right>
                {Math.round(i.rating)}
                {Math.round(i.rating) !== levelRating(i.level) && <span className="text-xs text-muted-foreground"> (start {levelRating(i.level)})</span>}
              </Td>
              <Td right>
                <Switch aria-label={`Approved: ${i.id}`} checked={i.status === 'approved'} disabled={toggle.isPending} onCheckedChange={(on) => toggle.mutate({ table: 'assessment_items', id: i.id, patch: { status: on ? 'approved' : 'draft' } })} />
              </Td>
            </tr>
          );
        })}
      </Table>
    </div>
  );
}

function TasksTab({ d }: { d: Data }) {
  const toggle = useToggle();
  return (
    <Table
      testId="admin-tasks"
      head={
        <>
          <Th>Prompt</Th>
          <Th>Type</Th>
          <Th>Levels</Th>
          <Th right>Texts</Th>
          <Th right>Writers</Th>
          <Th right>Active</Th>
        </>
      }
    >
      {d.tasks.map((t) => {
        const s = d.stats.tasks[t.id];
        return (
          <tr key={t.id} data-row={t.id}>
            <Td>
              <span lang={t.language === 'zh' ? 'zh-CN' : 'en'}>{t.title}</span> <Badge variant="outline">{LANG[t.language]}</Badge>
            </Td>
            <Td>
              {t.kind}
              {t.exam !== 'general' && ` · ${t.exam.toUpperCase()}`}
            </Td>
            <Td>
              {levelLabel(t.language, t.level_min)}
              {t.level_max > t.level_min && `–${levelLabel(t.language, t.level_max)}`}
            </Td>
            <Td right>{s?.texts ?? 0}</Td>
            <Td right>{s?.writers ?? 0}</Td>
            <Td right>
              <Switch aria-label={`Active: ${t.title}`} checked={t.is_active} disabled={toggle.isPending} onCheckedChange={(v) => toggle.mutate({ table: 'writing_tasks', id: t.id, patch: { is_active: v } })} />
            </Td>
          </tr>
        );
      })}
    </Table>
  );
}

function AiTab({ stats }: { stats: Stats }) {
  return (
    <div className="space-y-4" data-testid="admin-ai">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ['Reviews, last 24 h', stats.ai.last_24h],
          ['Learners, last 24 h', stats.ai.learners_24h],
          ['Reviews, all time', stats.ai.total],
        ].map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Settings</CardTitle>
          <CardDescription>Set on the server, not here, so the API key never reaches a browser.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>
            Models used: {Object.entries(stats.ai.by_model).map(([m, n]) => `${m} (${n})`).join(', ') || 'none yet'}.
          </p>
          <p className="text-muted-foreground">
            Change with <code>npx supabase secrets set GEMINI_MODEL=… WRITING_FEEDBACK_DAILY_LIMIT=…</code> — see docs/DEPLOY.md §4. Gemini's free tier also has its own per-minute and per-day limits.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
