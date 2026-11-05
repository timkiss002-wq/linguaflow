import { Briefcase, Clapperboard, Coffee, GraduationCap, Mic, Music, Plane, Sparkles, type LucideIcon } from 'lucide-react';

/** A colour and a picture per topic, so lessons are recognisable at a glance. Dark enough for white text. */
const COVERS: Record<string, { gradient: string; icon: LucideIcon }> = {
  'daily-conversation': { gradient: 'from-orange-600 to-amber-500', icon: Coffee },
  travel: { gradient: 'from-sky-700 to-cyan-500', icon: Plane },
  'business-career': { gradient: 'from-indigo-700 to-violet-500', icon: Briefcase },
  education: { gradient: 'from-teal-700 to-emerald-500', icon: GraduationCap },
  'movies-tv': { gradient: 'from-rose-700 to-pink-500', icon: Clapperboard },
  'podcast-interviews': { gradient: 'from-violet-700 to-fuchsia-500', icon: Mic },
  entertainment: { gradient: 'from-pink-700 to-orange-500', icon: Music },
};
const FALLBACK = { gradient: 'from-slate-700 to-slate-500', icon: Sparkles };

export const coverFor = (topic: string | null | undefined) => (topic && COVERS[topic]) || FALLBACK;
