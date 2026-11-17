import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { phraseItems } from '@/lib/practice/items';
import { DAYS, activeTopicOf, activeWordsOf } from '@/lib/roadmap/plan';
import { sentencesOf } from '@/lib/roadmap/sentences';
import SentencesPage from './SentencesPage';

vi.mock('@/features/roadmap/useRoadmap', () => ({ useRoadmapContext: () => ({ notebook: undefined, p3Days: new Set(), loading: false }) }));

describe('SentencesPage', () => {
  it('shows the 5 collocations, then 3 Vietnamese sentences per collocation to translate, and saves a passing run', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-16T09:00:00'));
    const date = '2026-11-16';
    const task = DAYS.find((d) => d.date === date)!.tasks.find((t) => t.kind === 'vocab-active')!;
    const words = activeWordsOf(task);
    const items = phraseItems(activeTopicOf(task)!.id, words);
    expect(items).toHaveLength(15);
    render(
      <MemoryRouter initialEntries={[`/viet-cau/${date}`]}>
        <Routes>
          <Route path="/viet-cau/:date" element={<SentencesPage />} />
        </Routes>
      </MemoryRouter>,
    );
    for (const w of words) expect(screen.getByText(w.t)).toBeInTheDocument();
    expect(screen.queryByText(/Nhờ AI/)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu dịch' }));
    items.forEach((item, i) => {
      expect(screen.getByTestId('prompt')).toHaveTextContent(item.prompt);
      fireEvent.change(screen.getByLabelText('Câu của bạn'), { target: { value: item.en[0] } });
      fireEvent.click(screen.getByRole('button', { name: /Kiểm tra/ }));
      expect(screen.getByRole('status')).toHaveAttribute('data-verdict', 'correct');
      fireEvent.click(screen.getByRole('button', { name: i + 1 < items.length ? /Câu tiếp/ : /Xem kết quả/ }));
    });
    expect(sentencesOf(date)).toMatchObject({ passed: true, score: 15, total: 15 });
    vi.useRealTimers();
  });
});
