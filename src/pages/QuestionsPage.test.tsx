import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { practiceOf } from '@/lib/practice/results';
import { qItemsOf } from '@/lib/questions-daily';
import QuestionsPage from './QuestionsPage';

const answerAll = (n: number) => {
  for (let i = 0; i < n; i++) {
    const prompt = screen.getByTestId('prompt');
    const item =
      qItemsOf(JSON.parse(localStorage.getItem('questions:set2:2026-11-19')!) as string[]).find((q) => prompt.textContent === q.prompt.replace(/[[\]]/g, '')) ??
      qItemsOf(JSON.parse(localStorage.getItem('questions:extra:2026-11-19:1') ?? '[]') as string[]).find(
        (q) => prompt.textContent === q.prompt.replace(/[[\]]/g, ''),
      )!;
    if (item.prompt.includes('[')) expect(prompt.querySelector('mark')).not.toBeNull();
    fireEvent.change(screen.getByLabelText('Câu của bạn'), {
      target: { value: item.en[0] },
    });
    fireEvent.click(screen.getByRole('button', { name: /Kiểm tra/ }));
    expect(screen.getByRole('status')).toHaveAttribute('data-verdict', 'correct');
    fireEvent.click(
      screen.getByRole('button', {
        name: i < n - 1 ? /Câu tiếp/ : /Xem kết quả/,
      }),
    );
  }
};

describe('QuestionsPage', () => {
  it('shows 13 questions (10 everyday ones included, the part to ask about highlighted), saves the result and offers 5 more', () => {
    localStorage.clear();
    render(
      <MemoryRouter initialEntries={['/dat-cau-hoi/2026-11-19']}>
        <Routes>
          <Route path="/dat-cau-hoi/:date" element={<QuestionsPage />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId('start-questions'));
    answerAll(13);
    expect(practiceOf('2026-11-19:questions')).toMatchObject({
      best: 13,
      total: 13,
      passed: true,
    });
    fireEvent.click(screen.getByTestId('more-questions'));
    expect(screen.getByText(/Luyện thêm · lượt 1/)).toBeInTheDocument();
    const first = new Set(JSON.parse(localStorage.getItem('questions:set2:2026-11-19')!) as string[]);
    const extra = JSON.parse(localStorage.getItem('questions:extra:2026-11-19:1')!) as string[];
    expect(extra).toHaveLength(5);
    expect(extra.some((k) => first.has(k))).toBe(false);
    answerAll(5);
    expect(screen.getByTestId('more-questions')).toHaveTextContent('Luyện thêm 5 câu nữa');
  });
});
