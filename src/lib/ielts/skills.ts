import type { P3Type } from './passage3';

/**
 * Reading Passage 3 — skills worth learning, each with a short how-to, a handful of quick drills (one passage line,
 * one question, an explanation in Vietnamese) and the question types where the skill is applied.
 * All passage lines are written for LinguaFlow.
 */

export interface Drill {
  /** passage excerpt (English) */
  passage?: string;
  /** statement / summary line / question stem from the test (English) */
  stmt?: string;
  /** what the learner is asked to do (Vietnamese) */
  ask: string;
  options: string[];
  answer: number;
  /** why, in Vietnamese */
  why: string;
}

export interface Skill {
  id: string;
  name: string;
  short: string;
  steps: string[];
  /** question types where this skill is applied */
  types: P3Type[];
  drills: Drill[];
}

const TFNG = ['TRUE', 'FALSE', 'NOT GIVEN'];
const YNNG = ['YES', 'NO', 'NOT GIVEN'];

export const SKILLS: Skill[] = [
  {
    id: 'pairing',
    name: 'Ghép cặp từ khóa',
    short: 'Ghép từng từ khóa của câu hỏi với cụm cùng nghĩa trong bài, rồi mới chọn đáp án.',
    steps: [
      'Gạch từ khóa trong câu hỏi: danh từ chính, động từ, và các từ giới hạn (only, first, all, most…).',
      'Dùng tên riêng, số, từ lặp lại để tìm đúng đoạn trong bài.',
      'Ghép từng từ khóa còn lại với cụm cùng nghĩa trong đoạn đó.',
      'Mọi cặp khớp → TRUE/YES. Có cặp trái nghĩa → FALSE/NO. Có từ khóa không tìm được cặp → NOT GIVEN.',
    ],
    types: ['tfng', 'ynng', 'mcq', 'gap'],
    drills: [
      {
        passage: 'Most of the first mills powered by the tide belonged to monasteries, which had both the labour and the capital to build them.',
        stmt: 'Early tidal mills were mainly built by religious communities.',
        ask: 'Từ khóa "religious communities" ghép với cụm nào trong bài?',
        options: ['the tide', 'monasteries', 'the labour and the capital', 'the first mills'],
        answer: 1,
        why: 'Monasteries (tu viện) là nơi sống của các cộng đồng tôn giáo, nên đây là cặp paraphrase. "the first mills" thì ghép với "Early tidal mills", không phải với từ khóa này.',
      },
      {
        passage: 'Most of the first mills powered by the tide belonged to monasteries, which had both the labour and the capital to build them.',
        stmt: 'Early tidal mills were mainly built by religious communities.',
        ask: 'Còn từ "mainly" thì ghép với cụm nào?',
        options: ['Most of', 'the first', 'powered by', 'both'],
        answer: 0,
        why: '"mainly" (chủ yếu) ⇄ "Most of" (phần lớn). Đây là kiểu từ giới hạn hay bị bỏ qua: nếu bài viết "Some of" thì câu này đã thành FALSE hoặc NOT GIVEN.',
      },
      {
        passage: 'Once the manufacturer cut the cost by a third, demand for the gadget climbed steeply.',
        stmt: 'Sales of the device rose sharply after the price was reduced.',
        ask: '"rose sharply" ghép với cụm nào?',
        options: ['cut the cost', 'climbed steeply', 'by a third', 'the manufacturer'],
        answer: 1,
        why: 'rose ⇄ climbed, sharply ⇄ steeply: cùng nghĩa "tăng mạnh". Đáp án TRUE vì "the price was reduced" cũng ghép được với "cut the cost".',
      },
      {
        passage: 'Because funding ran out, the team was forced to stop recruiting after just forty participants.',
        stmt: 'The researchers deliberately limited the size of the sample.',
        ask: 'Cặp của "deliberately" cho biết đáp án là gì?',
        options: ['TRUE — "deliberately" khớp với "stop recruiting"', 'FALSE — "was forced to" trái nghĩa với "deliberately"', 'NOT GIVEN — không có cặp nào'],
        answer: 1,
        why: '"deliberately" là cố ý, còn "was forced to" là bị buộc phải làm. Có cặp nhưng mang nghĩa ngược nên đáp án là FALSE, không phải NOT GIVEN.',
      },
      {
        passage: 'The building, completed in 1932, attracted wide attention from critics in the national press.',
        stmt: "The architect's design was praised by local residents.",
        ask: 'Từ khóa "local residents" có cặp trong bài không?',
        options: ['Có: critics', 'Có: the national press', 'Không có cặp nào → nghiêng về NOT GIVEN'],
        answer: 2,
        why: 'Critics và báo chí toàn quốc không phải cư dân địa phương. Bài không nói người dân nghĩ gì, nên không tìm được cặp, đáp án là NOT GIVEN. Cũng để ý "attention" chưa chắc đã là "praised".',
      },
      {
        passage: 'Few historians now accept that the canal was abandoned because of a single flood.',
        stmt: 'Most historians believe one flood led to the abandonment of the canal.',
        ask: '"Most historians believe" ghép với cụm nào, và cặp đó cùng nghĩa hay ngược nghĩa?',
        options: ['"Few historians now accept" — ngược nghĩa', '"Few historians now accept" — cùng nghĩa', '"a single flood" — cùng nghĩa', 'Không có cặp'],
        answer: 0,
        why: 'Most ⇄ Few, believe ⇄ accept: cụm này ghép được nhưng ngược nghĩa (rất ít người tin). Câu hỏi nói phần lớn đều tin nên đáp án là FALSE. "a single flood" ⇄ "one flood" là cặp cùng nghĩa, nhưng không quyết định đáp án.',
      },
    ],
  },
  {
    id: 'paraphrase',
    name: 'Nhận ra paraphrase',
    short: 'Đề hiếm khi chép lại chữ của bài: nhận ra cùng một ý được viết theo cách khác.',
    steps: [
      'Từ đồng nghĩa: decline ⇄ fall, abandon ⇄ drop.',
      'Đổi từ loại: a reduction in cost ⇄ costs were reduced.',
      'Đổi chủ động/bị động, hoặc đảo vế câu.',
      'Phủ định của từ trái nghĩa: not uncommon ⇄ fairly frequent, scarcely any ⇄ almost no.',
    ],
    types: ['gap', 'mcq'],
    drills: [
      {
        stmt: 'Such cases are not uncommon.',
        ask: 'Cụm "not uncommon" có nghĩa gần nhất với:',
        options: ['rare', 'fairly frequent', 'impossible', 'unknown'],
        answer: 1,
        why: 'Phủ định hai lần: "không hiếm" nghĩa là khá thường gặp. Bẫy hay gặp là chọn "rare" vì chỉ thấy chữ "not".',
      },
      {
        stmt: 'The policy was abandoned in 1998.',
        ask: 'Câu nào nói cùng ý?',
        options: ['The policy was introduced in 1998.', 'Officials dropped the policy in 1998.', 'The policy was criticised in 1998.', 'The policy was delayed until 1998.'],
        answer: 1,
        why: 'abandoned ⇄ dropped, câu bị động được đổi sang chủ động (thêm chủ ngữ Officials). Ý chính vẫn là bỏ chính sách.',
      },
      {
        stmt: 'a decline in the birth rate',
        ask: 'Cụm nào nói cùng ý?',
        options: ['fewer babies being born', 'a rise in population', 'a stable number of births', 'more marriages'],
        answer: 0,
        why: 'decline ⇄ fewer, birth rate ⇄ babies being born. Cụm danh từ được viết lại thành mệnh đề.',
      },
      {
        stmt: 'There is scarcely any evidence for this claim.',
        ask: '"scarcely any evidence" có nghĩa là:',
        options: ['plenty of evidence', 'almost no evidence', 'new evidence', 'indirect evidence'],
        answer: 1,
        why: '"scarcely" (hầu như không) mang nghĩa phủ định, nên "scarcely any" = "almost no".',
      },
      {
        stmt: 'The findings cast doubt on the theory.',
        ask: 'Câu nào nói cùng ý?',
        options: ['The findings confirmed the theory.', 'The findings made the theory seem less certain.', 'The findings were based on the theory.', 'The findings ignored the theory.'],
        answer: 1,
        why: '"cast doubt on" là làm người ta nghi ngờ, tức làm lý thuyết kém chắc chắn hơn. Nó chưa đến mức bác bỏ hẳn lý thuyết.',
      },
      {
        stmt: 'It was not until the 1980s that the drug became widely available.',
        ask: 'Câu nào nói cùng ý?',
        options: ['The drug was common before the 1980s.', 'The drug only became easy to obtain from the 1980s.', 'The drug was banned in the 1980s.', 'The drug was invented in the 1980s.'],
        answer: 1,
        why: '"not until X" nghĩa là chỉ từ X trở đi. "widely available" ⇄ "easy to obtain". Bài không nói thuốc được phát minh khi nào, nên phương án D là bẫy.',
      },
    ],
  },
  {
    id: 'false-ng',
    name: 'FALSE hay NOT GIVEN',
    short: 'FALSE là bài nói ngược lại; NOT GIVEN là bài không nói tới.',
    steps: [
      'Tìm đúng câu trong bài nói về cùng chủ đề.',
      'Hỏi: bài có nói điều ngược với câu hỏi không? Có → FALSE.',
      'Bài chỉ không nhắc tới, hoặc nhắc tới mà không đủ để kết luận → NOT GIVEN.',
      'Đừng dùng hiểu biết bên ngoài để điền chỗ bài bỏ trống.',
    ],
    types: ['tfng'],
    drills: [
      {
        passage: 'The bridge was designed by two engineers, although only one of them lived to see it opened.',
        stmt: 'Both engineers attended the opening of the bridge.',
        ask: 'Chọn đáp án:',
        options: TFNG,
        answer: 1,
        why: '"only one of them lived to see it opened" nói ngược với "Both … attended", nên đáp án là FALSE.',
      },
      {
        passage: 'The bridge was designed by two engineers, although only one of them lived to see it opened.',
        stmt: 'The two engineers had worked together on earlier projects.',
        ask: 'Chọn đáp án:',
        options: TFNG,
        answer: 2,
        why: 'Bài không nói gì về các dự án trước đó, nên "earlier projects" không có cặp. Đáp án là NOT GIVEN.',
      },
      {
        passage: 'Honeybees can recognise human faces, a study at a British university found.',
        stmt: 'Research has shown that bees are able to identify human faces.',
        ask: 'Chọn đáp án:',
        options: TFNG,
        answer: 0,
        why: 'study ⇄ research, recognise ⇄ identify, can ⇄ are able to. Mọi cặp đều cùng nghĩa nên đáp án là TRUE.',
      },
      {
        passage: 'The festival attracts around 20,000 visitors each summer, most of them from neighbouring regions.',
        stmt: 'The festival is the largest in the country.',
        ask: 'Chọn đáp án:',
        options: TFNG,
        answer: 2,
        why: 'Con số 20,000 không cho phép so sánh với các lễ hội khác. "the largest" không có cặp nên đáp án là NOT GIVEN.',
      },
      {
        passage: 'Contrary to popular belief, the Great Fire destroyed relatively few homes of the poor.',
        stmt: 'The Great Fire mainly affected poorer residents.',
        ask: 'Chọn đáp án:',
        options: TFNG,
        answer: 1,
        why: '"relatively few homes of the poor" ngược với "mainly affected poorer residents". Chữ "Contrary to popular belief" báo hiệu bài sắp nói ngược với điều nhiều người nghĩ.',
      },
      {
        passage: 'The scheme was initially funded by the government, but private donors later took over.',
        stmt: 'The scheme has always relied on private money.',
        ask: 'Chọn đáp án:',
        options: TFNG,
        answer: 1,
        why: '"always" ngược với "initially funded by the government", vì lúc đầu chương trình dùng tiền nhà nước. Từ tuyệt đối như always, never, only rất hay dẫn tới FALSE.',
      },
    ],
  },
  {
    id: 'writer-view',
    name: 'Tìm quan điểm của tác giả',
    short: 'YES/NO/NOT GIVEN hỏi tác giả nghĩ gì, không hỏi người khác nói gì.',
    steps: [
      'Tách ý của người khác (Some claim…, Critics argue…) khỏi ý của tác giả.',
      'Tìm dấu hiệu tác giả lên tiếng: however, it seems to me, mistakenly, rightly, there is little evidence…',
      'Tác giả đồng ý → YES; tác giả bác bỏ → NO; tác giả không bày tỏ ý kiến → NOT GIVEN.',
    ],
    types: ['ynng'],
    drills: [
      {
        passage: 'Some economists claim that automation will create more jobs than it destroys. This optimism, however, rests on very little evidence.',
        stmt: 'The belief that automation will create jobs is poorly supported.',
        ask: 'Câu này có khớp với quan điểm của tác giả không?',
        options: YNNG,
        answer: 0,
        why: 'Ý về tự động hóa là của "Some economists", nhưng câu "rests on very little evidence" là nhận xét của tác giả. Ý "poorly supported" khớp với nhận xét đó nên đáp án là YES.',
      },
      {
        passage: 'It would be a mistake to see the decline of local newspapers as purely the fault of the internet.',
        stmt: 'The internet is the only cause of the decline of local newspapers.',
        ask: 'Câu này có khớp với quan điểm của tác giả không?',
        options: YNNG,
        answer: 1,
        why: '"It would be a mistake" là tác giả bác bỏ ý "purely the fault of the internet" (only cause). Đáp án là NO.',
      },
      {
        passage: 'It would be a mistake to see the decline of local newspapers as purely the fault of the internet.',
        stmt: 'Local newspapers will disappear within a decade.',
        ask: 'Câu này có khớp với quan điểm của tác giả không?',
        options: YNNG,
        answer: 2,
        why: 'Tác giả không dự đoán gì về tương lai của báo địa phương, nên "within a decade" không có cặp. Đáp án là NOT GIVEN.',
      },
      {
        passage: 'Critics have described the new museum as a waste of public money. Such criticism seems to me entirely misplaced.',
        stmt: 'The new museum was a poor use of public funds.',
        ask: 'Câu này có khớp với quan điểm của tác giả không?',
        options: YNNG,
        answer: 1,
        why: 'Câu hỏi nhắc lại ý của Critics. Tác giả lại cho rằng lời phê bình đó "entirely misplaced" (hoàn toàn sai chỗ), nên đáp án là NO.',
      },
      {
        passage: 'Many teachers believe homework improves results. The data, it seems to me, suggest otherwise.',
        ask: 'Cụm nào cho thấy đây là ý kiến riêng của tác giả?',
        options: ['Many teachers believe', 'improves results', 'it seems to me', 'The data'],
        answer: 2,
        why: '"it seems to me" là tác giả tự nói. Còn "Many teachers believe" là ý của người khác, cần tách ra.',
      },
    ],
  },
  {
    id: 'distractor',
    name: 'Loại phương án nhiễu (MCQ)',
    short: 'Phương án sai thường dùng đúng chữ trong bài nhưng sai ý, hoặc là ý được nhắc tới rồi bị bác bỏ.',
    steps: [
      'Đọc câu hỏi, gạch từ khóa, tìm đoạn liên quan trước khi đọc các phương án.',
      'Cảnh giác với phương án chép nguyên chữ trong bài: thường là bẫy.',
      'Loại các ý bị bác bỏ (initially thought…, rather than…) và ý bài không nhắc tới.',
      'Phương án đúng thường là paraphrase của bài.',
    ],
    types: ['mcq'],
    drills: [
      {
        passage: 'Initially, the team assumed the decline in frog numbers was caused by pollution. Only after testing the water repeatedly did they identify a fungal infection as the real cause.',
        stmt: 'What did the team conclude caused the decline?',
        ask: 'Chọn đáp án:',
        options: ['pollution', 'a fungal infection', 'a shortage of water', 'repeated testing'],
        answer: 1,
        why: '"pollution" chỉ là giả định ban đầu ("Initially… assumed"), là bẫy. "repeated testing" có chữ trong bài nhưng đó là cách tìm ra nguyên nhân, không phải nguyên nhân.',
      },
      {
        passage: 'Although the novel sold poorly when it first appeared, it was later adopted by schools and is now considered a classic.',
        stmt: 'The writer suggests that the novel…',
        ask: 'Chọn đáp án:',
        options: ['was a commercial success when it was published.', 'was written for use in schools.', 'gained recognition over time.', 'is rarely read today.'],
        answer: 2,
        why: '"later adopted… now considered a classic" ⇄ "gained recognition over time". B dùng chữ "schools" nhưng sai ý: sách được trường học dùng sau này, không phải viết để cho trường học.',
      },
      {
        passage: 'The new vaccine is cheaper to produce than its predecessor, but it must be stored at very low temperatures, which limits its use in remote areas.',
        stmt: 'What is the main drawback of the new vaccine?',
        ask: 'Chọn đáp án:',
        options: ['its production cost', 'its storage requirements', 'its effectiveness', 'its side effects'],
        answer: 1,
        why: 'Chữ "but" mở ra nhược điểm: phải bảo quản ở nhiệt độ rất thấp. Chi phí lại là ưu điểm, còn hiệu quả và tác dụng phụ thì bài không nhắc.',
      },
      {
        passage: 'Most visitors come for the beaches; relatively few realise that the island also has a rich archaeological record.',
        stmt: "According to the writer, the island's archaeological sites are…",
        ask: 'Chọn đáp án:',
        options: ['the main reason people visit.', 'overlooked by many visitors.', 'poorly preserved.', 'closed to the public.'],
        answer: 1,
        why: '"relatively few realise" nghĩa là nhiều người không biết, tức "overlooked". A nhầm với bãi biển. C và D bài không nói.',
      },
      {
        passage: 'Rather than banning cars outright, the city made driving gradually more expensive, through parking charges and road tolls.',
        stmt: 'How did the city reduce car use?',
        ask: 'Chọn đáp án:',
        options: ['by prohibiting cars', 'by raising the cost of driving', 'by improving public transport', 'by narrowing roads'],
        answer: 1,
        why: '"Rather than banning" loại A. Phí đỗ xe và phí đường nghĩa là tăng chi phí lái xe. C nghe hợp lý nhưng bài không nhắc tới, đó là bẫy kiến thức nền.',
      },
    ],
  },
  {
    id: 'gap',
    name: 'Đoán từ loại trước khi điền',
    short: 'Trước khi tìm trong bài, đoán chỗ trống cần danh từ, động từ hay tính từ, và nhớ giới hạn số từ.',
    steps: [
      'Nhìn từ đứng trước và sau chỗ trống: a/the + __ → danh từ; very/more + __ → tính từ; to + __ → động từ.',
      'Đoán số ít hay số nhiều: a number of + danh từ số nhiều.',
      'Đọc giới hạn: NO MORE THAN TWO WORDS, và không chép lại từ đã có trong câu.',
      'Ghép phần còn lại của câu tóm tắt với bài để tìm đúng đoạn.',
    ],
    types: ['gap'],
    drills: [
      {
        stmt: 'The researchers found that the plants grew faster in ______ soil.',
        ask: 'Chỗ trống cần loại từ gì?',
        options: ['Danh từ', 'Tính từ', 'Động từ', 'Trạng từ'],
        answer: 1,
        why: 'Đứng trước danh từ "soil" để bổ nghĩa thì cần tính từ, ví dụ "sandy soil", "acidic soil".',
      },
      {
        stmt: 'Farmers were initially reluctant to ______ the new method.',
        ask: 'Chỗ trống cần loại từ gì?',
        options: ['Danh từ', 'Tính từ', 'Động từ', 'Trạng từ'],
        answer: 2,
        why: '"reluctant to + động từ nguyên mẫu", và phía sau còn tân ngữ "the new method". Ví dụ "adopt".',
      },
      {
        stmt: 'There was a sharp ______ in the number of applicants.',
        ask: 'Chỗ trống cần loại từ gì?',
        options: ['Danh từ số ít', 'Danh từ số nhiều', 'Động từ', 'Tính từ'],
        answer: 0,
        why: '"a sharp ___" có mạo từ "a" và tính từ "sharp", nên cần danh từ số ít, ví dụ "rise", "fall".',
      },
      {
        passage: 'Participants who slept less than six hours made significantly more errors.',
        stmt: 'Lack of sleep led to a greater number of ______.',
        ask: 'Chọn từ trong hộp:',
        options: ['errors', 'participants', 'hours', 'mistake'],
        answer: 0,
        why: '"a greater number of" cần danh từ số nhiều, và ý là ngủ ít thì mắc lỗi nhiều hơn. "mistake" đúng nghĩa nhưng là số ít.',
      },
      {
        passage: 'The material proved remarkably durable, lasting for decades without repair.',
        stmt: 'The material was found to be very ______.',
        ask: 'Chọn từ trong hộp:',
        options: ['durability', 'durable', 'decades', 'repaired'],
        answer: 1,
        why: '"to be very ___" cần tính từ. "durability" đúng nghĩa nhưng là danh từ.',
      },
      {
        passage: 'Workers were sometimes paid in salt, which was then regarded as a valuable commodity.',
        stmt: 'Salt was once seen as a ______ and was used to pay workers. (NO MORE THAN TWO WORDS)',
        ask: 'Đáp án đúng là:',
        options: ['valuable commodity', 'a valuable commodity', 'commodity valuable', 'salt'],
        answer: 0,
        why: 'Câu tóm tắt đã có sẵn "a", nên chép thêm "a" là thừa và vượt quá hai từ. Đáp án đúng là "valuable commodity".',
      },
    ],
  },
];

export const skillById = (id: string | null | undefined) => SKILLS.find((s) => s.id === id);

// ----- progress (best score per skill, on this device) -----

const KEY = 'lf.p3skills.v1';
export type SkillProgress = Record<string, { best: number; total: number }>;

export function skillProgress(): SkillProgress {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as SkillProgress;
  } catch {
    return {};
  }
}

export function saveSkillScore(id: string, score: number, total: number) {
  const p = skillProgress();
  if (score >= (p[id]?.best ?? -1)) p[id] = { best: score, total };
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* private mode */
  }
}
