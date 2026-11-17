import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { practicePassed } from '@/lib/practice/results';
import { gapItems, paragraphItems, writingWeek } from '@/lib/roadmap/writing';
import WordFormWeekPage from './WordFormWeekPage';
import WritingWeekPage from './WritingWeekPage';

vi.mock('@/features/roadmap/useRoadmap', () => ({ useRoadmapContext: () => ({ notebook: undefined, p3Days: new Set(), loading: false }) }));

const at = (path: string, route: string, el: React.ReactElement) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={route} element={el} />
      </Routes>
    </MemoryRouter>,
  );

describe('Word form tuần and Writing tuần (week 1)', () => {
  it('drills the week word forms on Saturday, then the paragraph on Sunday', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const w = writingWeek(1)!;

    vi.setSystemTime(new Date('2026-11-21T09:00:00'));
    const wf = at('/word-form/2026-11-21', '/word-form/:date', <WordFormWeekPage />);
    expect(screen.getByTestId('families')).toHaveTextContent('knowledgeable');
    fireEvent.click(screen.getByRole('button', { name: /Bắt đầu điền/ }));
    for (const item of gapItems(w)) {
      expect(screen.getByTestId('prompt')).toHaveTextContent(item.prompt);
      fireEvent.change(screen.getByLabelText('Câu của bạn'), { target: { value: item.en[0] } });
      fireEvent.click(screen.getByRole('button', { name: /Kiểm tra/ }));
      expect(screen.getByRole('status')).toHaveAttribute('data-verdict', 'correct');
      fireEvent.click(screen.getByRole('button', { name: /Câu tiếp|Xem kết quả/ }));
    }
    expect(practicePassed('2026-11-21:wordform-week')).toBe(true);
    wf.unmount();

    vi.setSystemTime(new Date('2026-11-22T09:00:00'));
    at('/writing-tuan/2026-11-22', '/writing-tuan/:date', <WritingWeekPage />);
    expect(screen.getByTestId('word-bank')).toHaveTextContent('keep up with');
    fireEvent.click(screen.getByRole('button', { name: /Bắt đầu dịch/ }));
    for (const item of paragraphItems(w)) {
      fireEvent.change(screen.getByLabelText('Câu của bạn'), { target: { value: item.en[0] } });
      fireEvent.click(screen.getByRole('button', { name: /Kiểm tra/ }));
      expect(screen.getByRole('status')).toHaveAttribute('data-verdict', 'correct');
      fireEvent.click(screen.getByRole('button', { name: /Câu tiếp|Xem kết quả/ }));
    }
    expect(practicePassed('2026-11-22:writing-week')).toBe(true);
    expect(screen.getByTestId('model')).toHaveTextContent('well-rounded education');
    fireEvent.change(screen.getByLabelText('Đoạn văn của bạn'), { target: { value: 'Tuition fees are high, so higher education should be free and students can gain a qualification.' } });
    expect(screen.getByTestId('targets-used')).toHaveTextContent('Đã dùng 4 ');
    vi.useRealTimers();
  });
});
