import { CONFIDENCE_LABEL, confidence, levelDelta, levelLabel, ratingToLevel, ratingToScale, SKILL_LABEL, TEST_SKILLS, type TestSkill } from '@/lib/personal/levels';

/** One row per skill: estimated level on a 6-step scale, how sure we are, and change since the previous test. */
export function SkillLevels({ language, ratings, previous }: { language: 'en' | 'zh'; ratings: { skill: string; rating: number; n: number }[]; previous?: Record<string, number> }) {
  return (
    <ul className="space-y-3" data-testid="skill-levels">
      {TEST_SKILLS[language].map((skill: TestSkill) => {
        const r = ratings.find((x) => x.skill === skill);
        if (!r) return null;
        const level = ratingToLevel(r.rating);
        const prev = previous?.[skill];
        const delta = prev === undefined ? 0 : levelDelta(r.rating, prev);
        return (
          <li key={skill} data-skill={skill}>
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
              <span className="font-medium">{SKILL_LABEL[skill]}</span>
              <span>
                <b className="tabular-nums" data-testid="skill-level">{levelLabel(language, level)}</b>
                {delta !== 0 && (
                  <span className={delta > 0 ? 'ml-1.5 text-success' : 'ml-1.5 text-destructive'} title="Change in levels since the previous test">
                    {delta > 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}
                  </span>
                )}
                <span className="ml-2 text-xs text-muted-foreground">{CONFIDENCE_LABEL[confidence(r.n)]}</span>
              </span>
            </div>
            <div className="relative h-2 rounded-full bg-muted" role="img" aria-label={`${SKILL_LABEL[skill]}: ${levelLabel(language, level)}`}>
              <div className="h-full rounded-full" style={{ width: `${(ratingToScale(r.rating) / 6) * 100}%`, background: 'var(--chart-1)' }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
