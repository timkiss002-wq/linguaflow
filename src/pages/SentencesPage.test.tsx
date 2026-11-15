import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { DAYS, activeWordsOf } from '@/lib/roadmap/plan';
import { sentencesOf } from '@/lib/roadmap/sentences';
import SentencesPage from './SentencesPage';

vi.mock('@/features/roadmap/useRoadmap', () => ({ useRoadmapContext: () => ({ notebook: undefined, p3Days: new Set(), loading: false }) }));
vi.mock('@/features/writing/api', () => ({ useSaveSubmission: () => ({ mutateAsync: vi.fn(), isPending: false }) }));

describe('SentencesPage', () => {
  it('shows the 5 collocations and the prompt, counts sentences and phrases, saves a passing answer', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-16T09:00:00'));
    const date = '2026-11-16';
    const task = DAYS.find((d) => d.date === date)!.tasks.find((t) => t.kind === 'vocab-active')!;
    const words = activeWordsOf(task);
    render(
      <MemoryRouter initialEntries={[`/viet-cau/${date}`]}>
        <Routes>
          <Route path="/viet-cau/:date" element={<SentencesPage />} />
        </Routes>
      </MemoryRouter>,
    );
    for (const w of words) expect(screen.getByText(w.t)).toBeInTheDocument();
    expect(screen.getByText(task.active!.prompt)).toBeInTheDocument();
    expect(screen.getByText('Đã dùng 0/5 cụm')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Câu của bạn'), { target: { value: words.map((w) => w.ex).join(' ') } });
    expect(screen.getByText('Đã dùng 5/5 cụm')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Lưu · hoàn thành' }));
    expect(sentencesOf(date)?.passed).toBe(true);
    vi.useRealTimers();
  });
});
