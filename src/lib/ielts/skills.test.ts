import { describe, expect, it } from 'vitest';
import { SKILLS, saveSkillScore, skillById, skillProgress } from './skills';

describe('Passage 3 skills', () => {
  it('has unique ids and well-formed drills', () => {
    expect(new Set(SKILLS.map((s) => s.id)).size).toBe(SKILLS.length);
    for (const s of SKILLS) {
      expect(s.drills.length).toBeGreaterThanOrEqual(5);
      expect(s.steps.length).toBeGreaterThanOrEqual(3);
      expect(s.types.length).toBeGreaterThan(0);
      for (const d of s.drills) {
        expect(d.answer).toBeGreaterThanOrEqual(0);
        expect(d.answer).toBeLessThan(d.options.length);
        expect(new Set(d.options).size).toBe(d.options.length);
        expect(d.why.length).toBeGreaterThan(30);
      }
    }
  });

  it('finds skills by id', () => {
    expect(skillById('pairing')?.name).toBe('Ghép cặp từ khóa');
    expect(skillById('nope')).toBeUndefined();
  });

  it('keeps the best score', () => {
    localStorage.clear();
    saveSkillScore('gap', 4, 6);
    saveSkillScore('gap', 2, 6);
    expect(skillProgress().gap).toEqual({ best: 4, total: 6 });
    saveSkillScore('gap', 6, 6);
    expect(skillProgress().gap?.best).toBe(6);
  });
});
