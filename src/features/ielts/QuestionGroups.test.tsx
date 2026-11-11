import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { locateQuote } from '@/lib/ielts/locate';
import type { QuestionGroup } from '@/lib/ielts/tests';
import { QuestionGroups } from './QuestionGroups';

const paragraphs = [
  ['A', 'Rats were studied first. Their brain patterns were very similar when awake and asleep.'],
  ['B', 'Whales keep half their brain awake. They show no sign of REM sleep.'],
];
const groups: QuestionGroup[] = [
  {
    type: 'tfng',
    instructions: 'Do the statements agree?',
    questions: [
      { n: 1, text: 'Rats showed similar brain activity awake and asleep.', answer: 'TRUE', evidence: 'very similar when awake and asleep', explain_vi: 'Khớp → TRUE.' },
      { n: 2, text: 'Whales dream vividly.', answer: 'NOT GIVEN', evidence: 'They show no sign of REM sleep.', explain_vi: 'Bài không nói về độ sống động.' },
    ],
  },
];

function renderReview(onlyWrong = false) {
  const onShowEvidence = vi.fn();
  render(
    <QuestionGroups
      groups={groups}
      answers={{ 1: 'TRUE', 2: 'FALSE' }}
      onAnswer={() => {}}
      review={{ marks: { 1: 'correct', 2: 'wrong' }, active: null, onShowEvidence, locate: (q) => locateQuote(paragraphs, q.evidence), onlyWrong }}
    />,
  );
  return { onShowEvidence };
}

describe('review feedback', () => {
  it('shows answer, location, quoted sentence and explanation in a fixed order', () => {
    const { onShowEvidence } = renderReview();
    const block = screen.getAllByText(/Đáp án/)[1]!.closest('[data-mark]')!;
    expect(block).toHaveAttribute('data-mark', 'wrong');
    expect(block).toHaveTextContent('NOT GIVEN');
    const locBtn = screen.getByRole('button', { name: 'Đoạn B, câu 2' });
    locBtn.click();
    expect(onShowEvidence).toHaveBeenCalled();
    expect(block.querySelector('blockquote')).toHaveTextContent('They show no sign of REM sleep.');
    expect(block).toHaveTextContent('Giải thích: Bài không nói về độ sống động.');
    // the whole sentence is quoted, not just the fragment
    expect(screen.getByRole('button', { name: 'Đoạn A, câu 2' }).closest('[data-mark]')!.querySelector('blockquote')).toHaveTextContent('Their brain patterns were very similar when awake and asleep.');
  });

  it('hides correct questions when onlyWrong is set', () => {
    renderReview(true);
    expect(screen.queryByText('Rats showed similar brain activity awake and asleep.')).toBeNull();
    expect(screen.getByText('Whales dream vividly.')).toBeInTheDocument();
  });
});
