import { CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CoverArt } from '@/features/passage3/CoverArt';
import { OWN_SETS, TYPE_INFO, getProgress, setSummary, type P3Set, type P3Type } from '@/lib/ielts/passage3';

/** A Passage 3 set as a card with its cover, type and progress. */
export function SetCard({ set }: { set: P3Set }) {
  const d = getProgress().done[set.id];
  const sum = setSummary(set);
  return (
    <Link to={`/ielts/passage3/${set.id}`} className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-colors hover:border-primary/40" data-set={set.id}>
      <div className="relative">
        <CoverArt id={set.id} art={set.art} className="aspect-[2/1] w-full" />
        <span className="absolute left-2 top-2 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-bold text-white">{TYPE_INFO[set.type].short}</span>
        {d ? (
          <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white">
            <CheckCircle2 className="size-3" aria-hidden /> {d.score}/{d.total}
          </span>
        ) : sum.checked ? (
          <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-slate-900">
            {sum.checked}/{set.items.length}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-0.5 p-3">
        <span className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-primary">{set.title}</span>
        <span className="line-clamp-1 text-xs text-muted-foreground">{set.topic}</span>
      </div>
    </Link>
  );
}

/** Sets that use a skill: unfinished ones first, six at most. */
export function Applied({ types }: { types: P3Type[] }) {
  const p = getProgress();
  const list = OWN_SETS.filter((s) => types.includes(s.type))
    .sort((a, b) => Number(!!p.done[a.id]) - Number(!!p.done[b.id]))
    .slice(0, 6);
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {list.map((s) => (
        <SetCard key={s.id} set={s} />
      ))}
    </div>
  );
}
