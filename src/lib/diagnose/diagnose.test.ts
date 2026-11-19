import { describe, expect, it } from 'vitest';
import { checkTranslation, type DrillItem } from '@/lib/grammar/drills';
import { diagnose, findingTags } from './index';

const run = (answer: string, typed: string, tags: string[] = []) => {
  const r = checkTranslation({ en: [answer] } as DrillItem, typed);
  return diagnose(r.diff.tokens, tags);
};
const tagsOf = (answer: string, typed: string, tags: string[] = []) => findingTags(run(answer, typed, tags));

describe('diagnose', () => {
  it('finds a missing -s after he / she / it', () => {
    expect(tagsOf('My father is an engineer. He works in a factory.', 'My father is an engineer. He work in a factory.', ['article', 'sva'])).toEqual(['sva']);
  });
  it('finds a plural noun without -s', () => {
    expect(tagsOf('There are two bedrooms and a kitchen.', 'There are two bedroom and a kitchen.', ['there', 'plural'])).toEqual(['plural']);
  });
  it('finds a missing or wrong article', () => {
    expect(tagsOf('My father is an engineer.', 'My father is engineer.', ['article'])).toEqual(['article']);
    expect(tagsOf('My father is an engineer.', 'My father is a engineer.', ['article'])).toEqual(['article']);
  });
  it('finds a present verb where the past is needed, regular and irregular', () => {
    expect(tagsOf('I watched a film last night.', 'I watch a film last night.', ['past'])).toEqual(['past']);
    expect(tagsOf('I went to the cinema with my sister.', 'I go to the cinema with my sister.', ['past'])).toEqual(['past']);
  });
  it('finds is / are and a missing be', () => {
    expect(tagsOf('There are many photos on the wall.', 'There is many photos on the wall.', ['there', 'plural'])).toEqual(['sva']);
    expect(tagsOf('I am very tired.', 'I very tired.', ['be'])).toEqual(['be']);
  });
  it('finds a wrong preposition and a missing to', () => {
    expect(tagsOf('I go to school at seven in the morning.', 'I go to school in seven in the morning.', ['prep'])).toEqual(['prep']);
    expect(tagsOf('I want to learn English.', 'I want learn English.', ['vpat'])).toEqual(['vpat']);
  });
  it('finds a missing do in a question and word order', () => {
    expect(tagsOf('Where do you live?', 'Where you live?', ['question'])).toEqual(['question']);
    expect(tagsOf('I usually play football with my friends.', 'I play usually football with my friends.', ['order'])).toEqual(['order']);
  });
  it('a word choice is shown but has no grammar point', () => {
    const f = run('I have a headache.', 'I have a stomachache.', []);
    expect(f.length).toBe(1);
    expect(f[0]!.tag).toBeNull();
  });
});
