import { useMutation } from '@tanstack/react-query';
import { anonKey, functionUrl, getSupabase } from '@/lib/supabase';
import type { P3Type } from '@/lib/ielts/passage3';
import type { AutoPair } from '../../../supabase/functions/_shared/p3-pairs.ts';

export class PairError extends Error {
  constructor(
    public code: string,
    public limit?: number,
  ) {
    super(code);
  }
}

export const PAIR_ERRORS: Record<string, string> = {
  not_configured: 'Máy chủ chưa bật AI (cần GEMINI_API_KEY và function p3-pairs — xem docs/DEPLOY.md).',
  limit: 'Bạn đã dùng hết lượt tự ghép cặp bằng AI hôm nay.',
  ai_busy: 'Dịch vụ AI đang bận. Thử lại sau một phút.',
  ai_failed: 'Dịch vụ AI không trả lời.',
  ai_invalid: 'AI trả về kết quả không dùng được.',
  unauthorized: 'Phiên đăng nhập đã hết hạn.',
  bad_request: 'Cần dán đoạn văn (ít nhất vài câu) và ít nhất một câu hỏi.',
  network: 'Không kết nối được tới dịch vụ AI.',
};

/** Asks the p3-pairs function for the keywords of each question and their partners in the passage. */
export function useAutoPairs() {
  return useMutation({
    mutationFn: async (req: { type: P3Type; passage: string; questions: string[] }) => {
      const { data } = await getSupabase().auth.getSession();
      let res: Response;
      try {
        res = await fetch(functionUrl('p3-pairs'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: anonKey, Authorization: `Bearer ${data.session?.access_token ?? ''}` },
          body: JSON.stringify(req),
        });
      } catch {
        throw new PairError('network');
      }
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new PairError(body.error ?? 'ai_failed', body.limit);
      return body as { pairs: AutoPair[][]; remaining?: number };
    },
  });
}
