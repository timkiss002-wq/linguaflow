import { describe, expect, it } from 'vitest';
import { aiPrompt } from './aiPrompt';
import { parseImport } from './passage3';

describe('prompt for an outside chatbot', () => {
  it('includes the passage, the questions, the word box and the format for the type', () => {
    const p = aiPrompt({ type: 'gap', passage: 'Memory was once fixed.', questions: 'Memory was ____. || fixed', box: 'fixed\nfluid' });
    expect(p).toContain('ĐOẠN VĂN:\nMemory was once fixed.');
    expect(p).toContain('CÂU HỎI:\nMemory was ____. || fixed');
    expect(p).toContain('WORD BOX:\nfixed\nfluid');
    expect(p).toContain('[____ = cụm trong bài');
  });

  it('shows placeholders when nothing is pasted yet', () => {
    expect(aiPrompt({ type: 'tfng', passage: '', questions: '', box: '' })).toContain('<DÁN ĐOẠN VĂN');
  });

  it('its example line is valid input for the app', () => {
    const passage = 'an empty motorway tolerates conversation better than a crowded junction.';
    const line = aiPrompt({ type: 'tfng', passage, questions: 'x', box: '' }).split('VÍ DỤ MỘT DÒNG ĐÚNG ĐỊNH DẠNG:\n')[1]!.split('\n')[0]!;
    const { set, errors } = parseImport({ title: 't', type: 'tfng', passage, questions: line, box: '' });
    expect(errors).toEqual([]);
    expect(set!.keyless).toBe(false);
  });
});
