/**
 * Free IELTS Reading practice on other websites. LinguaFlow only links to them — their tests are copyrighted, so the
 * content is never copied; a learner can paste a passage they are working on into the app (kept on their device).
 */
export interface WebSource {
  id: string;
  name: string;
  url: string;
  /** what you find there (Vietnamese) */
  desc: string;
  tags: string[];
}

export const WEB_SOURCES: WebSource[] = [
  {
    id: 'youpass',
    name: 'YouPass',
    url: 'https://youpass.vn/luyen-thi/ielts/reading',
    desc: 'Kho đề Reading miễn phí do IELTS 1984 làm, chia theo dạng câu hỏi; tra từ ngay trong bài.',
    tags: ['Tiếng Việt', 'Miễn phí', 'Theo dạng câu'],
  },
  {
    id: 'ieltsmate',
    name: 'IELTS Mate',
    url: 'https://www.ieltsmate.vn/',
    desc: 'Đề thi thử trên máy và bộ bài luyện theo dạng câu hỏi, có đáp án và giải thích.',
    tags: ['Miễn phí', 'Thi trên máy', 'Có giải thích'],
  },
  {
    id: 'british-council',
    name: 'British Council',
    url: 'https://takeielts.britishcouncil.org/take-ielts/prepare/free-ielts-english-practice-tests/reading/academic',
    desc: 'Đề mẫu chính thức từ đơn vị đồng sở hữu IELTS: từng dạng câu hỏi, kèm file đáp án.',
    tags: ['Chính thức', 'Có đáp án'],
  },
  {
    id: 'idp',
    name: 'IDP IELTS',
    url: 'https://ielts.idp.com/prepare/ielts-test-preparation-material/reading-and-ielts-practice-tests/academic',
    desc: 'Đề luyện chính thức của IDP, có bản làm trên máy giống phòng thi.',
    tags: ['Chính thức', 'Thi trên máy'],
  },
  {
    id: 'izone',
    name: 'IZONE',
    url: 'https://www.izone.edu.vn/luyen-thi-ielts/reading/',
    desc: 'Nhiều bài đọc kèm giải thích đáp án chi tiết bằng tiếng Việt, chia theo band.',
    tags: ['Tiếng Việt', 'Giải chi tiết'],
  },
  {
    id: 'ieltsonlinetests',
    name: 'IELTS Online Tests',
    url: 'https://ieltsonlinetests.com/',
    desc: 'Hàng trăm đề thi thử có bấm giờ, chấm điểm và quy ra band.',
    tags: ['Miễn phí', 'Bấm giờ', 'Có band'],
  },
];
