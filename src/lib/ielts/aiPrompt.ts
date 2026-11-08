import { TYPE_INFO, type P3Type } from './passage3';

/**
 * A prompt the learner copies into any outside chatbot (ChatGPT, Claude, Gemini…). The chatbot answers with the
 * question lines already in LinguaFlow's import format, keyed pair by pair, ready to paste back into the questions box.
 */

const FORMAT: Record<P3Type, string> = {
  tfng: 'Câu hỏi có từ khóa || TRUE hoặc FALSE hoặc NOT GIVEN',
  ynng: 'Câu hỏi có từ khóa || YES hoặc NO hoặc NOT GIVEN',
  mcq: 'Câu hỏi có từ khóa || phương án A || phương án B || phương án C || phương án D || chữ cái đáp án đúng',
  gap: 'Câu tóm tắt có từ khóa, chỗ trống ghi [____ = cụm trong bài lấp chỗ trống] || đáp án (từ cần điền, hoặc chữ cái nếu đề có word box)',
};

const EXAMPLE: Record<P3Type, string> = {
  tfng: '[Talking = conversation = cuộc trò chuyện] while driving [does less harm = tolerates conversation better = chịu được tốt hơn] on a [quiet motorway = empty motorway = đường cao tốc vắng] than in [heavy traffic = crowded junction = giao lộ đông xe]. || TRUE',
  ynng: 'The writer [believes = I think = tác giả cho rằng] that {GDP} [should be abandoned = -]. || NOT GIVEN',
  mcq: 'What did the team [conclude = identify = xác định] [caused = the real cause = nguyên nhân thật] the decline? || pollution || a fungal infection || a shortage of water || repeated testing || B',
  gap: 'Scientists [once thought = believed = từng tin] that a memory was [____ = permanent form = dạng vĩnh viễn]. || fixed',
};

export function aiPrompt(input: { type: P3Type; passage: string; questions: string; box: string }) {
  const passage = input.passage.trim() || '<DÁN ĐOẠN VĂN PASSAGE 3 VÀO ĐÂY>';
  const questions = input.questions.trim() || '<DÁN CÁC CÂU HỎI (VÀ ĐÁP ÁN NẾU CÓ) VÀO ĐÂY, MỖI DÒNG MỘT CÂU>';
  const box = input.type === 'gap' && input.box.trim() ? `\n\nWORD BOX:\n${input.box.trim()}` : '';
  return `Bạn là giáo viên IELTS. Tôi luyện Reading Passage 3 bằng phương pháp "ghép cặp từ khóa": trước khi chọn đáp án, mỗi từ khóa trong câu hỏi được ghép với cụm trong bài có cùng ý (từ đồng nghĩa, paraphrase, đổi từ loại, đổi cấu trúc câu). Từ khóa không có cặp trong bài → dấu hiệu NOT GIVEN; cặp mang nghĩa ngược → FALSE/NO.

Dạng câu hỏi: ${TYPE_INFO[input.type].label}

Hãy viết lại từng câu hỏi bên dưới theo đúng định dạng sau, để tôi dán thẳng vào ứng dụng:

ĐỊNH DẠNG (mỗi câu hỏi đúng MỘT dòng):
${FORMAT[input.type]}

QUY TẮC
1. Giữ nguyên chữ của câu hỏi, chỉ đặt 2–5 từ khóa quan trọng nhất vào ngoặc vuông.
2. Mỗi từ khóa viết: [từ khóa = cụm trong bài = nghĩa tiếng Việt ngắn].
   - "cụm trong bài" phải CHÉP NGUYÊN VĂN từ đoạn văn (đúng từng chữ), ngắn nhất có thể.
   - Nếu bài không có gì tương ứng với từ khóa đó, viết [từ khóa = -].
3. Tên riêng, con số, năm và từ lặp y nguyên trong bài: đặt trong ngoặc nhọn {…}, không cần ghi cặp.
4. Ghi đáp án đúng ở cuối dòng sau dấu ||. Nếu tôi đã cho đáp án thì giữ nguyên; nếu chưa có thì bạn tự xác định.
5. Không dùng dấu [ ] { } = || ở chỗ nào khác. Không đánh số câu, không giải thích, không markdown, không dòng trống.
6. Chỉ trả về các dòng câu hỏi, không thêm gì khác.

VÍ DỤ MỘT DÒNG ĐÚNG ĐỊNH DẠNG:
${EXAMPLE[input.type]}

ĐOẠN VĂN:
${passage}${box}

CÂU HỎI:
${questions}`;
}
