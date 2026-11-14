import vocabJson from '../../../content/roadmap/vocab.json';
import type { Pos } from '@/lib/vocab/pos';

/**
 * The personal IELTS path from the placement test (14/11/2026, about band 5.0) to the target date 15/04/2027 (6.5).
 * Linear: foundation (grammar + vocabulary) → practice (small exercises by question type) → mock tests.
 * Everything here is pure: the same dates always give the same days and the same words, so progress can be keyed on them.
 */

export const START = '2026-11-14';
export const TARGET = '2027-04-15';
export const TARGET_BAND = 6.5;

export type Phase = 0 | 1 | 2 | 3;

export const PHASES: { id: Phase; name: string; short: string; from: string; to: string; goal: string }[] = [
  { id: 0, name: 'Khởi động', short: 'Khởi động', from: '2026-11-14', to: '2026-11-15', goal: 'Kiểm tra trình độ, làm quen lộ trình và sổ từ.' },
  { id: 1, name: 'Giai đoạn 1 · Nền tảng', short: 'Nền tảng', from: '2026-11-16', to: '2027-01-10', goal: '16 chủ điểm ngữ pháp theo đúng thứ tự lỗi gốc → lỗi phức tạp, 15 từ mới mỗi ngày. Mục tiêu: viết câu đúng, hết lỗi số nhiều, chia động từ, trật tự từ.' },
  { id: 2, name: 'Giai đoạn 2 · Luyện tập', short: 'Luyện tập', from: '2027-01-11', to: '2027-03-07', goal: 'Reading theo từng dạng câu hỏi (ưu tiên bẫy trắc nghiệm), Writing theo khung từng dạng đề Task 2 rồi Task 1, 12 từ mới mỗi ngày.' },
  { id: 3, name: 'Giai đoạn 3 · Thi thử', short: 'Thi thử', from: '2027-03-08', to: '2027-04-15', goal: 'Mỗi tuần 2 đề Reading đủ 60 phút, 1–2 đề Writing đủ 60 phút, chữa lỗi kỹ. Không học từ mới, chỉ ôn.' },
];

/** Baseline from the placement test, for the comparison after each retest. */
export const BASELINE = { date: '2026-11-14', grammar: [7, 15], vocab: [9, 12], reading: [4, 7], band: { overall: 5.0, reading: '5.0–5.5', writing: '4.5–5.0' } } as const;

export type TaskKind =
  | 'placement'
  | 'setup'
  | 'grammar-learn'
  | 'grammar-drill'
  | 'grammar-own'
  | 'grammar-review'
  | 'vocab-new'
  | 'vocab-review'
  | 'reading-p3'
  | 'reading-skill'
  | 'reading-part'
  | 'writing-frame'
  | 'writing-guided'
  | 'writing-exam'
  | 'writing-paragraph'
  | 'writing-mistakes'
  | 'mock-reading'
  | 'mock-paper'
  | 'mock-review'
  | 'week-review'
  | 'retest'
  | 'rest';

export interface Task {
  /** `${date}:${kind}` — stable, used as the progress key */
  id: string;
  kind: TaskKind;
  title: string;
  detail: string;
  minutes: number;
  href?: string;
  /** grammar topic id (grammar-* tasks) */
  topic?: string;
  /** index range [from, to) into NEW_WORDS (vocab-new) */
  words?: [number, number];
  /** done only through the exercise itself (≥ 80 %), not by ticking */
  gated?: boolean;
}

export interface Day {
  date: string;
  week: number;
  phase: Phase;
  /** 0 = Sunday … 6 = Saturday */
  weekday: number;
  light?: boolean;
  note?: string;
  tasks: Task[];
}

export interface Week {
  n: number;
  phase: Phase;
  start: string;
  title: string;
  focus: string;
  grammar?: [string, string];
  skill?: { id: string; name: string };
  frames?: string[];
  /** Phase 3: what to do on Monday (reading test) and Saturday (paper test) */
  mock?: { mon: { title: string; href?: string }; sat: string; essay: string; task1?: string };
  /** days (yyyy-mm-dd) that are light because of a holiday */
  light?: string[];
}

export interface PlanWord {
  t: string;
  m: string;
  p?: Pos;
  topic: string;
  ex?: string;
  known: boolean;
  src: string;
}
export const ALL_WORDS = (vocabJson as { words: PlanWord[] }).words;
/** Words still to learn, in the order of the learner's sheet (weeks 1–10, the reading list), then the added topics. */
export const NEW_WORDS = ALL_WORDS.filter((w) => !w.known);

const SKILL = {
  distractor: { id: 'distractor', name: 'Bẫy trắc nghiệm (MCQ distractors)' },
  falseNg: { id: 'false-ng', name: 'FALSE hay NOT GIVEN' },
  paraphrase: { id: 'paraphrase', name: 'Nhận ra paraphrase' },
  gap: { id: 'gap', name: 'Điền từ: đoán loại từ cần điền' },
  writer: { id: 'writer-view', name: 'Quan điểm tác giả (Y/N/NG)' },
  pairing: { id: 'pairing', name: 'Ghép cặp keyword' },
} as const;

/** One essay prompt per Task 2 type: the guided prompt and its free-writing twin for exam mode. */
const ESSAY: Record<string, { guided: string; exam: string }[]> = {
  agree: [{ guided: 'g-tech', exam: 'en-w-ielts-tech' }, { guided: 'g-health', exam: 'en-w-ielts-health' }, { guided: 'g-volunteer', exam: 'en-w-ielts-volunteer' }],
  discuss: [{ guided: 'g-transport', exam: 'en-w-ielts-traffic' }, { guided: 'g-museums', exam: 'en-w-ielts-museums' }, { guided: 'g-languages', exam: 'en-w-ielts-languages' }],
  advantages: [{ guided: 'g-wfh', exam: 'en-w-ielts-work' }, { guided: 'g-tourism', exam: 'en-w-ielts-tourism' }, { guided: 'g-shopping', exam: 'en-w-ielts-shopping' }],
  problem: [{ guided: 'g-traffic', exam: 'en-w-ielts-traffic' }, { guided: 'g-social', exam: 'en-w-ielts-social' }, { guided: 'g-housing', exam: 'en-w-ielts-housing' }],
  twopart: [{ guided: 'g-alone', exam: 'en-w-ielts-alone' }, { guided: 'g-reading', exam: 'en-w-ielts-reading' }, { guided: 'g-freelance', exam: 'en-w-ielts-freelance' }],
};
const TASK1: Record<string, string[]> = {
  line: ['g1-transport', 'g1-drinks'],
  bar: ['g1-exercise', 'g1-leisure'],
  pie: ['g1-energy', 'g1-spending'],
  table: ['g1-rent', 'g1-tourism'],
  process: ['g1-glass', 'g1-tea'],
  map: ['g1-village'],
};
const FRAME_NAME: Record<string, string> = {
  agree: 'Agree / Disagree',
  discuss: 'Discuss both views',
  advantages: 'Advantages / Disadvantages',
  problem: 'Problems & Solutions',
  twopart: 'Two-part question',
  line: 'Line graph',
  bar: 'Bar chart',
  pie: 'Pie charts',
  table: 'Table',
  process: 'Process',
  map: 'Maps',
};

export const WEEKS: Week[] = [
  { n: 0, phase: 0, start: '2026-11-14', title: 'Khởi động', focus: 'Kiểm tra trình độ và chuẩn bị sổ từ.' },
  // Phase 1 — the order follows the placement test: the root mistakes first (plurals, agreement), then tenses, then complex sentences.
  { n: 1, phase: 1, start: '2026-11-16', title: 'Danh từ & hòa hợp chủ ngữ', focus: 'Hai lỗi xuất hiện nhiều nhất trong bài viết của bạn: thiếu -s số nhiều, chia sai động từ theo chủ ngữ.', grammar: ['nouns-articles', 'agreement'] },
  { n: 2, phase: 1, start: '2026-11-23', title: 'Hiện tại đơn & quá khứ đơn', focus: 'Củng cố hai thì nền tảng — dùng nhiều nhất trong Task 1 và Task 2.', grammar: ['present-simple', 'past-simple'] },
  { n: 3, phase: 1, start: '2026-11-30', title: 'Hiện tại hoàn thành & tương lai', focus: 'since/for, xu hướng đến hiện tại, dự đoán (will, be expected to).', grammar: ['present-perfect', 'future'] },
  { n: 4, phase: 1, start: '2026-12-07', title: 'Bị động & động từ + to V / V-ing', focus: 'Sửa lỗi "student was learned", "choose live", "suggest take".', grammar: ['passive', 'verb-patterns'] },
  { n: 5, phase: 1, start: '2026-12-14', title: 'Trật tự từ & so sánh', focus: 'Sửa lỗi "should more invest", "make decision better".', grammar: ['word-order', 'comparison'] },
  { n: 6, phase: 1, start: '2026-12-21', title: 'Although / Despite & từ nối', focus: 'Mệnh đề hay cụm danh từ — câu G9 trong bài kiểm tra.', grammar: ['contrast-cause', 'linking'] },
  { n: 7, phase: 1, start: '2026-12-28', title: 'Mệnh đề quan hệ & điều kiện 1–2', focus: 'Hai loại câu phức dễ ghi điểm nhất trong Writing 6.5.', grammar: ['relative', 'conditionals'] },
  { n: 8, phase: 1, start: '2027-01-04', title: 'Điều kiện loại 3 & động từ khuyết thiếu', focus: 'Hoàn thành nền ngữ pháp. Chủ nhật 10/01: kiểm tra lại trình độ.', grammar: ['conditionals-3', 'modals'] },
  // Phase 2 — one Reading skill and one Writing question type a week.
  { n: 9, phase: 2, start: '2027-01-11', title: 'MCQ & Agree / Disagree', focus: 'Ưu tiên số 1: bẫy trắc nghiệm (bạn sai 3/3 câu MCQ trong bài kiểm tra).', skill: SKILL.distractor, frames: ['agree'] },
  { n: 10, phase: 2, start: '2027-01-18', title: 'FALSE vs NOT GIVEN & Discuss', focus: 'Giữ điểm mạnh T/F/NG, tập phân biệt FALSE và NOT GIVEN khó.', skill: SKILL.falseNg, frames: ['discuss'] },
  { n: 11, phase: 2, start: '2027-01-25', title: 'Paraphrase & Advantages', focus: 'Nhận ra cách viết lại ý trong bài đọc; luận điểm lợi – hại.', skill: SKILL.paraphrase, frames: ['advantages'] },
  { n: 12, phase: 2, start: '2027-02-01', title: 'Điền từ & Problem – Solution', focus: 'Đoán loại từ cần điền; nguyên nhân – giải pháp. Từ thứ Năm 04/02 nhẹ dần vì Tết.', skill: SKILL.gap, frames: ['problem'], light: ['2027-02-04', '2027-02-05', '2027-02-06', '2027-02-07'] },
  { n: 13, phase: 2, start: '2027-02-08', title: 'Nghỉ Tết', focus: 'Chỉ ôn thẻ từ và 1 bài Reading ngắn mỗi ngày (khoảng 20 phút).', light: ['2027-02-08', '2027-02-09', '2027-02-10', '2027-02-11', '2027-02-12', '2027-02-13', '2027-02-14'] },
  { n: 14, phase: 2, start: '2027-02-15', title: 'Quan điểm tác giả & Two-part', focus: 'Y/N/NG và câu hỏi hai phần.', skill: SKILL.writer, frames: ['twopart'] },
  { n: 15, phase: 2, start: '2027-02-22', title: 'Ghép keyword & Task 1: line, bar', focus: 'Ôn kỹ năng ghép cặp; bắt đầu Task 1 với ngữ pháp miêu tả xu hướng.', skill: SKILL.pairing, frames: ['line', 'bar'] },
  { n: 16, phase: 2, start: '2027-03-01', title: 'Task 1: pie, table, process, map', focus: 'Làm Reading theo từng passage của đề đầy đủ. Chủ nhật 07/03: kiểm tra lại trình độ.', skill: SKILL.distractor, frames: ['pie', 'table', 'process', 'map'] },
  // Phase 3 — mock tests. Practice tests 1–2 are in the app; Cambridge 17–19 from the learner's own books, on paper.
  { n: 17, phase: 3, start: '2027-03-08', title: 'Thi thử 1', focus: 'Làm quen áp lực thời gian: Reading 60 phút, Writing 60 phút.', mock: { mon: { title: 'Practice test 1 (trong app)', href: '/ielts/reading-1' }, sat: 'Cambridge 17 · Test 1', essay: 'en-w-ielts-env', task1: 'g1-drinks' } },
  { n: 18, phase: 3, start: '2027-03-15', title: 'Thi thử 2', focus: 'So sánh với tuần trước: dạng câu nào vẫn sai?', mock: { mon: { title: 'Practice test 2 (trong app)', href: '/ielts/reading-2' }, sat: 'Cambridge 17 · Test 2', essay: 'en-w-ielts-edu', task1: 'g1-leisure' } },
  { n: 19, phase: 3, start: '2027-03-22', title: 'Thi thử 3', focus: 'Đề Cambridge trên giấy, chấm bằng đáp án cuối sách.', mock: { mon: { title: 'Cambridge 17 · Test 3 (Reading)' }, sat: 'Cambridge 18 · Test 1', essay: 'en-w-ielts-space', task1: 'g1-spending' } },
  { n: 20, phase: 3, start: '2027-03-29', title: 'Thi thử 4', focus: 'Tập trung vào dạng câu sai nhiều nhất trong sổ lỗi.', mock: { mon: { title: 'Cambridge 18 · Test 2 (Reading)' }, sat: 'Cambridge 18 · Test 3', essay: 'en-w-ielts-housing', task1: 'g1-tourism' } },
  { n: 21, phase: 3, start: '2027-04-05', title: 'Thi thử 5', focus: 'Đề cuối cùng như thi thật, cả Reading và Writing trong một buổi.', mock: { mon: { title: 'Cambridge 19 · Test 1 (Reading)' }, sat: 'Cambridge 19 · Test 2', essay: 'en-w-ielts-freelance', task1: 'g1-tea' } },
  { n: 22, phase: 3, start: '2027-04-12', title: 'Về đích', focus: 'Giảm tải, giữ phong độ. Không học thêm điều mới.', mock: { mon: { title: 'Cambridge 19 · Test 3 (Reading)' }, sat: '', essay: 'en-w-ielts-shopping' } },
];

/** Phase 2 and 3: one foundation topic is revisited on Thursdays, in the order they were learned. */
const REVIEW_ORDER = WEEKS.filter((w) => w.grammar).flatMap((w) => w.grammar!);

const DAY_MS = 86_400_000;
export const toDate = (key: string) => new Date(`${key}T00:00:00`);
export const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const addDays = (key: string, n: number) => dateKey(new Date(toDate(key).getTime() + n * DAY_MS + 12 * 3_600_000));
export const daysBetween = (a: string, b: string) => Math.round((toDate(b).getTime() - toDate(a).getTime()) / DAY_MS);
export const todayKey = () => dateKey(new Date());

const grammarHref = (topic: string) => `/grammar/${topic}`;
const vocabPerDay = (phase: Phase) => (phase === 1 ? 15 : phase === 2 ? 12 : 0);

function build(): Day[] {
  const days: Day[] = [];
  let cursor = 0;
  const total = daysBetween(START, TARGET);
  for (let i = 0; i <= total; i++) {
    const date = addDays(START, i);
    const week = [...WEEKS].reverse().find((w) => w.start <= date)!;
    const weekday = toDate(date).getDay();
    const light = week.light?.includes(date);
    const day: Day = { date, week: week.n, phase: week.phase, weekday, light, tasks: [] };
    const add = (kind: TaskKind, t: Omit<Task, 'id' | 'kind'>) => day.tasks.push({ id: `${date}:${kind}`, kind, ...t });

    const vocabNew = () => {
      const k = vocabPerDay(week.phase);
      if (!k || cursor >= NEW_WORDS.length) return;
      const to = Math.min(NEW_WORDS.length, cursor + k);
      const topics = [...new Set(NEW_WORDS.slice(cursor, to).map((w) => w.topic))].join(', ');
      add('vocab-new', { title: `${to - cursor} từ mới · ${topics}`, detail: 'Đọc nghĩa và ví dụ, thêm vào Sổ từ, gõ lại từng từ ở cột "Ôn từ vựng". Xong khi cả nhóm từ đã được ôn ít nhất một lần.', minutes: 20, href: '/vocabulary', words: [cursor, to] });
      cursor = to;
    };
    const review = (minutes = 10) => add('vocab-review', { title: 'Ôn thẻ từ đến hạn', detail: 'Ôn các từ đã học theo lịch lặp lại ngắt quãng. Làm hết số thẻ đến hạn hôm nay.', minutes, href: '/review' });
    const p3 = (detail = '4–5 câu Passage 3: ghép từng keyword với cụm đồng nghĩa trong bài rồi mới chọn đáp án.') => add('reading-p3', { title: 'Reading · Passage 3 ngắn', detail, minutes: 15, href: '/ielts/reading?format=p3' });

    if (week.phase === 0) {
      if (i === 0) add('placement', { title: 'Bài kiểm tra trình độ', detail: 'Đã làm: ngữ pháp 7/15, từ vựng 9/12, đọc hiểu 4/7 — khoảng band 5.0.', minutes: 33, href: '/lo-trinh/kiem-tra' });
      else {
        add('setup', { title: 'Đọc lộ trình', detail: 'Xem 3 giai đoạn, cách mở khóa bài và việc mỗi ngày. Ngày chưa tới thì xem trước được nhưng chưa làm được.', minutes: 10, href: '/lo-trinh' });
        review(15);
      }
    } else if (light) {
      review(15);
      p3('Một bộ câu ngắn để giữ nhịp. Nghỉ ngơi là một phần của lộ trình.');
      day.note = 'Ngày nhẹ (Tết)';
    } else if (week.phase === 1) {
      const [a, b] = week.grammar!;
      const topic = weekday >= 1 && weekday <= 3 ? a : b;
      const step = weekday === 0 ? 0 : ((weekday - 1) % 3) + 1; // 1 learn · 2 drill · 3 own sentences
      if (step === 1) add('grammar-learn', { title: 'Ngữ pháp · lý thuyết + nhận diện', detail: 'Xem hình minh hoạ, công thức, lỗi hay gặp; làm 6 câu nhận diện. Cần đúng ít nhất 5/6 (≥ 80%).', minutes: 20, href: grammarHref(topic), topic, gated: true });
      if (step === 2) add('grammar-drill', { title: 'Ngữ pháp · dịch 8 câu Việt → Anh', detail: 'Cần đúng ngay lần đầu ít nhất 7/8 câu. Chưa đạt thì luyện lại câu sai rồi làm lại cả bài.', minutes: 20, href: grammarHref(topic), topic, gated: true });
      if (step === 3) add('grammar-own', { title: 'Ngữ pháp · tự đặt 5 câu', detail: 'Viết 5 câu của riêng bạn dùng cấu trúc vừa học và từ vựng tuần này, ở "Viết tự do". Đọc lại, tự sửa từng câu theo phần "Lỗi hay gặp".', minutes: 15, href: '/writing', topic });
      if (weekday === 0) {
        if (week.n === 8) add('retest', { title: 'Kiểm tra lại trình độ', detail: 'Cùng dạng bài ngày 14/11. So sánh để thấy tiến bộ trước khi sang giai đoạn Luyện tập.', minutes: 40, href: '/lo-trinh/kiem-tra' });
        else add('week-review', { title: 'Ôn tập tuần', detail: 'Làm lại các câu dịch sai của 2 chủ điểm tuần này cho đến khi đúng hết.', minutes: 20, href: grammarHref(a), topic: a });
        if (week.n >= 4 && week.n < 8) add('writing-paragraph', { title: 'Viết một đoạn 120–150 từ', detail: 'Chọn một đề IELTS ở "Viết tự do", viết một đoạn thân bài: câu chủ đề → giải thích → ví dụ. Dùng ít nhất 2 cấu trúc đã học.', minutes: 25, href: '/writing' });
        review(15);
        if (week.n < 8) p3();
      } else {
        vocabNew();
        review();
        p3();
      }
    } else if (week.phase === 2) {
      const frame = week.frames?.[Math.min(week.frames.length - 1, weekday === 0 ? 0 : Math.floor((weekday - 1) / 2) % week.frames.length)];
      const isTask1 = frame ? Boolean(TASK1[frame]) : false;
      const prompt = frame ? (isTask1 ? TASK1[frame]![0]! : ESSAY[frame]![(week.n + weekday) % 3]!.guided) : undefined;
      const exam = frame && !isTask1 ? ESSAY[frame]![(week.n + weekday) % 3]!.exam : undefined;
      const skill = week.skill;
      switch (weekday) {
        case 1:
          if (skill) add('reading-skill', { title: `Kỹ năng Reading · ${skill.name}`, detail: 'Đọc cách làm, làm hết các câu luyện nhanh có giải thích tiếng Việt.', minutes: 25, href: `/ielts/reading?skill=${skill.id}` });
          vocabNew();
          review();
          break;
        case 2:
          if (frame) add('writing-frame', { title: `Writing · luyện khung ${FRAME_NAME[frame]}`, detail: 'Học thuộc khung bài: câu mở đầu, câu chủ đề từng đoạn, câu kết. Làm bài luyện khung đến khi đúng hết.', minutes: 25, href: `/writing/guided/frame/${frame}` });
          p3(skill ? `Áp dụng kỹ năng "${skill.name}" vào 4–5 câu Passage 3.` : undefined);
          vocabNew();
          review();
          break;
        case 3:
          if (prompt) add('writing-guided', { title: `Writing · viết theo khung (${FRAME_NAME[frame!]})`, detail: 'Dịch từng câu theo khung với gợi ý giảm dần, nộp để được chấm band và sửa lỗi.', minutes: 35, href: `/writing/guided/${prompt}` });
          vocabNew();
          review();
          break;
        case 4: {
          const topic = REVIEW_ORDER[(week.n - 9) * 2 % REVIEW_ORDER.length]!;
          add('grammar-review', { title: 'Ôn lại một chủ điểm ngữ pháp', detail: 'Dịch lại 8 câu, mục tiêu đúng hết ngay lần đầu.', minutes: 15, href: grammarHref(topic), topic });
          p3(skill ? `Áp dụng kỹ năng "${skill.name}".` : undefined);
          vocabNew();
          review();
          break;
        }
        case 5:
          if (exam) add('writing-exam', { title: 'Writing Task 2 · viết đủ 40 phút', detail: 'Không gợi ý, hết giờ tự nộp. Đọc kỹ nhận xét AI theo 4 tiêu chí.', minutes: 45, href: `/writing/new/${exam}?exam=1` });
          else if (prompt) add('writing-guided', { title: `Writing Task 1 · ${FRAME_NAME[frame!]} thứ hai`, detail: 'Viết theo khung với đề thứ hai cùng dạng biểu đồ.', minutes: 30, href: `/writing/guided/${TASK1[frame!]![1] ?? TASK1[frame!]![0]}` });
          vocabNew();
          review();
          break;
        case 6:
          add('reading-part', { title: 'Reading · một passage của đề đầy đủ', detail: 'Chế độ luyện tập, khoảng 20 phút cho 13 câu. Xem giải thích từng câu sai.', minutes: 25, href: '/ielts/reading?format=part' });
          if (week.frames?.includes('map')) add('writing-guided', { title: 'Writing Task 1 · Maps', detail: 'Bản đồ trước – sau: was transformed into…, had been replaced by…, remained unchanged.', minutes: 30, href: `/writing/guided/${TASK1.map![0]}` });
          else add('writing-mistakes', { title: 'Sửa lại lỗi hay lặp lại', detail: 'Làm bài sửa chính câu sai cũ của bạn trong "Lỗi hay lặp lại".', minutes: 15, href: '/writing/mistakes' });
          vocabNew();
          review();
          break;
        default:
          if (week.n === 16) add('retest', { title: 'Kiểm tra lại trình độ', detail: 'Lần 2. So với 14/11 và 10/01 trước khi vào giai đoạn Thi thử.', minutes: 40, href: '/lo-trinh/kiem-tra' });
          review(20);
          add('rest', { title: 'Nghỉ', detail: 'Chủ nhật chỉ ôn thẻ từ. Nghỉ ngơi giúp nhớ lâu hơn.', minutes: 0 });
      }
    } else {
      const m = week.mock!;
      const finalWeek = week.n === 22;
      switch (weekday) {
        case 1:
          add('mock-reading', { title: `Thi thử Reading · ${m.mon.title}`, detail: finalWeek ? 'Đề cuối cùng, làm thoải mái, không cần chữa kỹ.' : '3 passage, 40 câu, đúng 60 phút, không tra từ. Chuyển đáp án sang tờ trả lời trong thời gian làm bài.', minutes: 60, href: m.mon.href ?? '/ielts/reading?format=cam' });
          review();
          break;
        case 2:
          if (finalWeek) add('writing-exam', { title: 'Writing Task 2 · 40 phút', detail: 'Bài viết tập cuối. Chỉ đọc lại phần nhận xét, không viết lại.', minutes: 45, href: `/writing/new/${m.essay}?exam=1` });
          else add('mock-review', { title: 'Chữa đề Reading', detail: 'Với từng câu sai: tìm câu chứa đáp án, ghép keyword, ghi cặp paraphrase vào Sổ paraphrase. Đếm câu sai theo dạng.', minutes: 40, href: '/ielts/reading?format=full' });
          review();
          if (!finalWeek) p3();
          break;
        case 3:
          if (finalWeek) {
            review(15);
            add('rest', { title: 'Ôn nhẹ', detail: 'Xem lại khung bài Task 1, Task 2 và Sổ paraphrase. Ngủ sớm.', minutes: 20, href: '/writing/guided' });
            break;
          }
          if (m.task1) add('writing-guided', { title: 'Thi thử Writing Task 1 · 20 phút', detail: 'Viết không nhìn khung, tự canh 20 phút, rồi nộp để chấm.', minutes: 20, href: `/writing/guided/${m.task1}` });
          add('writing-exam', { title: 'Thi thử Writing Task 2 · 40 phút', detail: 'Chế độ thi: không gợi ý, hết giờ tự nộp, chấm AI ngay.', minutes: 40, href: `/writing/new/${m.essay}?exam=1` });
          review();
          break;
        case 4:
          if (finalWeek) {
            add('rest', { title: `Ngày mục tiêu · band ${TARGET_BAND}`, detail: 'Hôm nay không học. Chúc bạn làm bài tốt!', minutes: 0 });
            break;
          }
          add('writing-mistakes', { title: 'Chữa Writing', detail: 'Đọc nhận xét theo 4 tiêu chí, sửa lại các câu sai của bài hôm qua trong "Lỗi hay lặp lại".', minutes: 30, href: '/writing/mistakes' });
          add('grammar-review', { title: 'Ôn chủ điểm ngữ pháp còn sai', detail: 'Chọn chủ điểm có lỗi lặp lại nhiều nhất trong bài viết, dịch lại 8 câu.', minutes: 15, href: '/grammar' });
          review();
          break;
        case 5:
          p3();
          add('reading-skill', { title: 'Ôn kỹ năng Reading yếu nhất', detail: 'Dựa vào số câu sai theo dạng ở bài chữa đề thứ Ba.', minutes: 20, href: '/ielts/reading?skill=distractor' });
          review();
          break;
        case 6:
          if (m.sat) add('mock-paper', { title: `Thi thử trên giấy · ${m.sat}`, detail: 'Reading 60 phút + Writing 60 phút liên tục như thi thật, chấm Reading bằng đáp án cuối sách. Ghi điểm vào đây.', minutes: 120, href: '/ielts/reading?format=cam' });
          review();
          break;
        default:
          review(15);
          add('rest', { title: 'Nghỉ', detail: 'Chủ nhật chỉ ôn thẻ từ.', minutes: 0 });
      }
    }
    days.push(day);
  }
  return days;
}

export const DAYS: Day[] = build();
export const dayByDate = (date: string) => DAYS.find((d) => d.date === date);
export const weekByNumber = (n: number) => WEEKS.find((w) => w.n === n);
export const daysOfWeek = (n: number) => DAYS.filter((d) => d.week === n);
export const phaseOf = (p: Phase) => PHASES.find((x) => x.id === p)!;
export const wordsOf = (t: Task) => (t.words ? NEW_WORDS.slice(t.words[0], t.words[1]) : []);

/** All days in the order of the grammar sequence: topic n+1 opens only when topic n is passed. */
export const GRAMMAR_SEQUENCE = REVIEW_ORDER;
export const previousTopic = (topic: string) => {
  const i = GRAMMAR_SEQUENCE.indexOf(topic);
  return i > 0 ? GRAMMAR_SEQUENCE[i - 1] : undefined;
};

export const WEEKDAY_VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
export const formatDay = (date: string) => {
  const d = toDate(date);
  return `${WEEKDAY_VI[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
};
