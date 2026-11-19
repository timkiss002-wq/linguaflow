import type { DiffToken } from '@/lib/compare';

/**
 * Explains what is wrong in a translated sentence, word by word, from the difference with the closest answer:
 * a missing -s after he/she/it, a present verb where the past is needed, a missing article, a wrong preposition…
 * Each finding names the grammar point it belongs to (the same ids as lib/translate-daily TAGS), so the weak-point
 * log counts what was actually wrong instead of every point the sentence happens to train.
 * A finding without a grammar point is a word choice (vocabulary / wording), shown but not counted.
 */

export interface Finding {
  /** grammar point id (TAGS), or null for a word choice */
  tag: string | null;
  /** what went wrong, in Vietnamese, quoting the words */
  text: string;
}

const ARTICLES = new Set(['a', 'an', 'the']);
const BE = new Set(['am', 'is', 'are', 'was', 'were', 'be', 'been', 'being']);
const DO = new Set(['do', 'does', 'did']);
const HAVE = new Set(['have', 'has', 'had']);
const MODALS = new Set(['can', 'could', 'should', 'must', 'may', 'might', 'will', 'would', 'shall']);
const PREPS = new Set(['in', 'on', 'at', 'to', 'for', 'from', 'with', 'of', 'by', 'about', 'into', 'onto', 'over', 'under', 'between', 'during', 'since', 'until', 'till', 'after', 'before', 'near', 'next', 'behind', 'through', 'across', 'around', 'without', 'towards', 'toward', 'up', 'off', 'out']);
const PRONOUNS = new Set(['i', 'me', 'my', 'mine', 'myself', 'you', 'your', 'yours', 'yourself', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'we', 'us', 'our', 'ours', 'ourselves', 'they', 'them', 'their', 'theirs', 'themselves', 'this', 'that', 'these', 'those', 'one']);
const RELATIVE = new Set(['who', 'whom', 'which', 'whose', 'where']);
const CONJ = new Set(['because', 'so', 'but', 'and', 'or', 'although', 'though', 'while', 'when', 'whenever', 'until', 'unless', 'if', 'as', 'however', 'therefore', 'whereas', 'despite', 'since', 'then', 'also', 'instead', 'moreover', 'additionally', 'furthermore', 'besides', 'nevertheless', 'consequently', 'otherwise']);
const QUANT = new Set(['much', 'many', 'few', 'little', 'some', 'any', 'lot', 'lots', 'plenty', 'several', 'enough']);
const COMPARE = new Set(['more', 'most', 'than', 'less', 'least', 'as']);
const DETERMINERS = new Set(['a', 'an', 'the', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'many', 'some', 'these', 'those', 'my', 'your', 'his', 'her', 'our', 'their', 'its', 'few', 'several', 'all', 'both', 'of', 'any', 'no', 'other', 'different', 'more', 'most']);
const SINGULAR_SUBJECTS = new Set(['he', 'she', 'it', 'everyone', 'everybody', 'someone', 'somebody', 'nobody', 'no-one', 'who', 'which', 'that', 'this']);

/** Irregular verbs: base → [past, past participle]. */
const IRREGULAR: Record<string, [string, string]> = {
  be: ['was', 'been'], go: ['went', 'gone'], have: ['had', 'had'], do: ['did', 'done'], make: ['made', 'made'], get: ['got', 'got'],
  take: ['took', 'taken'], see: ['saw', 'seen'], come: ['came', 'come'], give: ['gave', 'given'], buy: ['bought', 'bought'],
  bring: ['brought', 'brought'], think: ['thought', 'thought'], teach: ['taught', 'taught'], catch: ['caught', 'caught'],
  eat: ['ate', 'eaten'], drink: ['drank', 'drunk'], write: ['wrote', 'written'], read: ['read', 'read'], say: ['said', 'said'],
  tell: ['told', 'told'], find: ['found', 'found'], feel: ['felt', 'felt'], leave: ['left', 'left'], meet: ['met', 'met'],
  sleep: ['slept', 'slept'], keep: ['kept', 'kept'], spend: ['spent', 'spent'], send: ['sent', 'sent'], lose: ['lost', 'lost'],
  sit: ['sat', 'sat'], stand: ['stood', 'stood'], run: ['ran', 'run'], swim: ['swam', 'swum'], begin: ['began', 'begun'],
  break: ['broke', 'broken'], choose: ['chose', 'chosen'], speak: ['spoke', 'spoken'], wake: ['woke', 'woken'],
  know: ['knew', 'known'], grow: ['grew', 'grown'], throw: ['threw', 'thrown'], fall: ['fell', 'fallen'], forget: ['forgot', 'forgotten'],
  ride: ['rode', 'ridden'], drive: ['drove', 'driven'], win: ['won', 'won'], pay: ['paid', 'paid'], put: ['put', 'put'],
  cut: ['cut', 'cut'], set: ['set', 'set'], hurt: ['hurt', 'hurt'], let: ['let', 'let'], hear: ['heard', 'heard'],
  learn: ['learnt', 'learnt'], build: ['built', 'built'], hold: ['held', 'held'], understand: ['understood', 'understood'],
  become: ['became', 'become'], bite: ['bit', 'bitten'], hide: ['hid', 'hidden'], shake: ['shook', 'shaken'], sell: ['sold', 'sold'],
  fly: ['flew', 'flown'], wear: ['wore', 'worn'], steal: ['stole', 'stolen'], ring: ['rang', 'rung'], sing: ['sang', 'sung'],
};
const PAST_OF = new Map<string, string>();
const PP_OF = new Map<string, string>();
for (const [base, [past, pp]] of Object.entries(IRREGULAR)) {
  PAST_OF.set(past, base);
  PP_OF.set(pp, base);
}
const baseOf = (w: string) => PAST_OF.get(w) ?? PP_OF.get(w) ?? (['is', 'am', 'are', 'was', 'were', 'been'].includes(w) ? 'be' : w);

const low = (s?: string) => (s ?? '').toLowerCase();
const q = (s?: string) => `“${s ?? ''}”`;

/** The ending that separates two forms of the same word, as [shorter, longer, ending], or null. */
function ending(a: string, b: string): [string, string, string] | null {
  const [s, l] = a.length <= b.length ? [a, b] : [b, a];
  if (s === l) return null;
  for (const e of ['ies', 'ied', 'es', 's', 'ed', 'd', 'ing', 'er', 'est', 'n']) {
    if (l === s + e) return [s, l, e];
    if ((e === 'ies' || e === 'ied') && s.endsWith('y') && l === s.slice(0, -1) + e) return [s, l, e];
  }
  if (s.endsWith('e') && l === `${s.slice(0, -1)}ing`) return [s, l, 'ing'];
  if (l.length === s.length + 3 && l.startsWith(s) && l[s.length] === s.at(-1)) {
    if (l.endsWith('ed')) return [s, l, 'ed'];
    if (l.endsWith('ing')) return [s, l, 'ing'];
  }
  return null;
}

interface Ctx {
  /** the word before this one in the expected answer */
  prev: string;
  /** the word after this one in the expected answer */
  next: string;
  tags: string[];
}

/** A word typed in another form than the answer (work / works, go / went, a / an, is / are…). */
function formFinding(exp: string, act: string, c: Ctx): Finding | null {
  const e = low(exp);
  const a = low(act);
  const end = ending(e, a);
  if (end) {
    const [, longer, suf] = end;
    const expectedLonger = longer === e;
    if (suf === 'n') return { tag: 'article', text: `${q(act)} → ${q(exp)}: “an” đứng trước nguyên âm (an engineer, an hour), “a” trước phụ âm (a doctor, a university).` };
    if (suf === 'er' || suf === 'est') return { tag: 'compare', text: `${q(act)} → ${q(exp)}: so sánh hơn dùng -er / more, so sánh nhất dùng -est / most.` };
    if (suf === 'ing') {
      if (BE.has(c.prev)) return { tag: 'cont', text: `${q(act)} → ${q(exp)}: sau am / is / are / was / were là V-ing khi diễn tả việc đang xảy ra.` };
      return { tag: 'vpat', text: expectedLonger ? `${q(act)} → ${q(exp)}: chỗ này cần V-ing (sau giới từ, sau enjoy / mind / finish / stop / try…).` : `${q(act)} → ${q(exp)}: chỗ này cần động từ nguyên mẫu, không phải V-ing.` };
    }
    if (suf === 'ed' || suf === 'd' || suf === 'ied') {
      if (HAVE.has(c.prev) || c.prev === 'been' || c.prev === 'just' || c.prev === 'already' || c.prev === 'never' || c.prev === 'ever')
        return { tag: 'pp', text: `${q(act)} → ${q(exp)}: sau have / has / had dùng phân từ hai (V3).` };
      if (BE.has(c.prev) && c.tags.includes('passive')) return { tag: 'passive', text: `${q(act)} → ${q(exp)}: câu bị động là be + V3.` };
      return expectedLonger
        ? { tag: 'past', text: `${q(act)} → ${q(exp)}: việc đã xảy ra trong quá khứ → động từ quá khứ (-ed).` }
        : { tag: 'past', text: `${q(act)} → ${q(exp)}: sau did / didn't / to / can… động từ để nguyên mẫu, không thêm -ed.` };
    }
    // -s / -es / -ies: a plural noun or a verb after he / she / it
    const isNoun = DETERMINERS.has(c.prev) || (!SINGULAR_SUBJECTS.has(c.prev) && c.tags.includes('plural') && !c.tags.includes('sva'));
    if (isNoun)
      return { tag: 'plural', text: expectedLonger ? `${q(act)} → ${q(exp)}: danh từ số nhiều (từ hai trở lên, many, some…) phải thêm -s / -es.` : `${q(act)} → ${q(exp)}: chỗ này là danh từ số ít, không thêm -s.` };
    return {
      tag: 'sva',
      text: expectedLonger
        ? `${q(act)} → ${q(exp)}: chủ ngữ số ít (he / she / it, một người / vật, everyone) thì động từ hiện tại thêm -s / -es.`
        : `${q(act)} → ${q(exp)}: không thêm -s ở đây (chủ ngữ I / you / we / they / số nhiều, hoặc sau do / does / did / can / to).`,
    };
  }
  if (ARTICLES.has(e) && ARTICLES.has(a)) return { tag: 'article', text: `${q(act)} → ${q(exp)}: a / an cho thứ nhắc lần đầu, bất kỳ; the cho thứ đã xác định hoặc duy nhất.` };
  if (BE.has(e) && BE.has(a)) {
    const past = (w: string) => w === 'was' || w === 'were';
    if (past(e) !== past(a)) return { tag: 'past', text: `${q(act)} → ${q(exp)}: ${past(e) ? 'chuyện đã qua dùng was / were' : 'chuyện hiện tại dùng am / is / are'}.` };
    return { tag: 'sva', text: `${q(act)} → ${q(exp)}: chủ ngữ số ít đi với is / was, số nhiều và you đi với are / were, I đi với am.` };
  }
  if (DO.has(e) && DO.has(a)) {
    if ((e === 'did') !== (a === 'did')) return { tag: 'past', text: `${q(act)} → ${q(exp)}: câu hỏi / phủ định ở quá khứ dùng did, hiện tại dùng do / does.` };
    return { tag: 'sva', text: `${q(act)} → ${q(exp)}: he / she / it đi với does, còn lại đi với do.` };
  }
  if (HAVE.has(e) && HAVE.has(a)) return { tag: e === 'had' || a === 'had' ? 'pp' : 'sva', text: `${q(act)} → ${q(exp)}: ${e === 'had' || a === 'had' ? 'chọn đúng thì: have / has (đến nay) hay had (trước một mốc quá khứ)' : 'he / she / it đi với has, còn lại đi với have'}.` };
  if (MODALS.has(e) && MODALS.has(a)) {
    if ((e === 'would') !== (a === 'would') && c.tags.includes('cond')) return { tag: 'cond', text: `${q(act)} → ${q(exp)}: câu điều kiện loại 2 (giả định) dùng would, loại 1 dùng will.` };
    return { tag: e === 'will' || a === 'will' ? 'future' : 'modal', text: `${q(act)} → ${q(exp)}: chọn đúng động từ khuyết thiếu cho nghĩa câu.` };
  }
  // irregular verbs: go / went / gone
  const be = baseOf(e);
  const ba = baseOf(a);
  if (be === ba && e !== a && IRREGULAR[be]) {
    if (PP_OF.has(e) && !PAST_OF.has(e)) return { tag: 'pp', text: `${q(act)} → ${q(exp)}: sau have / has / had hoặc be (bị động) dùng V3 — ${be} → ${IRREGULAR[be]![1]}.` };
    if (PAST_OF.has(e)) return { tag: 'past', text: `${q(act)} → ${q(exp)}: động từ bất quy tắc ở quá khứ — ${be} → ${IRREGULAR[be]![0]}.` };
    return { tag: 'past', text: `${q(act)} → ${q(exp)}: chỗ này dùng động từ nguyên mẫu (${be}), không chia quá khứ.` };
  }
  if (PREPS.has(e) && PREPS.has(a)) return { tag: 'prep', text: `${q(act)} → ${q(exp)}: giới từ đi theo cụm, cần học thuộc (at + giờ, on + ngày, in + tháng / thành phố, good at, afraid of…).` };
  if (PRONOUNS.has(e) && PRONOUNS.has(a)) return { tag: 'pron', text: `${q(act)} → ${q(exp)}: chọn đúng đại từ / sở hữu (I – me – my, they – them – their; vật số nhiều dùng they / them).` };
  if (RELATIVE.has(e) || (RELATIVE.has(a) && e === 'that')) return { tag: 'rel', text: `${q(act)} → ${q(exp)}: who cho người, which cho vật, where cho nơi chốn, whose = của người mà.` };
  if (CONJ.has(e) && CONJ.has(a)) return { tag: 'conj', text: `${q(act)} → ${q(exp)}: từ nối sai nghĩa — kiểm tra quan hệ giữa hai ý (thêm ý, đối lập, nguyên nhân, kết quả).` };
  if (QUANT.has(e) && QUANT.has(a)) return { tag: 'count', text: `${q(act)} → ${q(exp)}: much / little cho danh từ không đếm được, many / few cho danh từ đếm được.` };
  if (COMPARE.has(e) && COMPARE.has(a)) return { tag: 'compare', text: `${q(act)} → ${q(exp)}: kiểm tra cấu trúc so sánh (more … than, the most …, as … as).` };
  return null;
}

/** A word of the answer that is not in the sentence. */
function missingFinding(word: string, c: Ctx): Finding | null {
  const w = low(word);
  const nx = c.next ? ` (trước ${q(c.next)})` : '';
  if (ARTICLES.has(w)) return { tag: 'article', text: `Thiếu mạo từ ${q(word)}${nx}: danh từ đếm được số ít cần a / an / the.` };
  if (BE.has(w)) {
    if (c.next.endsWith('ing')) return { tag: 'cont', text: `Thiếu ${q(word)}${nx}: thì tiếp diễn là be + V-ing.` };
    if (c.tags.includes('passive') && (c.next.endsWith('ed') || PP_OF.has(c.next))) return { tag: 'passive', text: `Thiếu ${q(word)}${nx}: câu bị động là be + V3.` };
    return { tag: 'be', text: `Thiếu động từ to be ${q(word)}${nx}: trước tính từ, danh từ, nơi chốn phải có am / is / are (was / were).` };
  }
  if (DO.has(w)) return { tag: c.tags.includes('neg') && !c.tags.includes('question') ? 'neg' : 'question', text: `Thiếu trợ động từ ${q(word)}: câu hỏi / phủ định với động từ thường cần do / does / did.` };
  if (HAVE.has(w)) return { tag: 'pp', text: `Thiếu ${q(word)}${nx}: hiện tại hoàn thành là have / has + V3.` };
  if (w === 'will') return { tag: 'future', text: `Thiếu ${q(word)}: chuyện tương lai cần will / be going to.` };
  if (w === 'would') return { tag: 'cond', text: `Thiếu ${q(word)}: vế kết quả của câu giả định (điều kiện loại 2) dùng would + V.` };
  if (MODALS.has(w)) return { tag: 'modal', text: `Thiếu ${q(word)}: nghĩa “có thể / nên / phải” cần động từ khuyết thiếu.` };
  if (w === 'to' && c.next && !PREPS.has(c.next) && !ARTICLES.has(c.next)) return { tag: 'vpat', text: `Thiếu ${q('to')}${nx}: want / hope / decide / plan / forget… + to V.` };
  if (w === 'not' || w === 'never') return { tag: 'neg', text: `Thiếu ${q(word)}: câu phủ định.` };
  if (w === 'there') return { tag: 'there', text: `Thiếu ${q('there')}: “có…” (tồn tại) là There is / There are.` };
  if (PREPS.has(w)) return { tag: 'prep', text: `Thiếu giới từ ${q(word)}${nx}.` };
  if (PRONOUNS.has(w)) return { tag: 'pron', text: `Thiếu ${q(word)}: tiếng Anh luôn cần chủ ngữ / tân ngữ / sở hữu rõ ràng (Ví dụ: “my” friends, call “her”).` };
  if (RELATIVE.has(w) || (w === 'that' && c.tags.includes('rel'))) return { tag: 'rel', text: `Thiếu đại từ quan hệ ${q(word)}: nối danh từ với mệnh đề bổ nghĩa cho nó.` };
  if (CONJ.has(w)) return { tag: 'conj', text: `Thiếu từ nối ${q(word)}: hai ý cần được nối rõ quan hệ.` };
  if (COMPARE.has(w)) return { tag: 'compare', text: `Thiếu ${q(word)}: cấu trúc so sánh chưa đủ.` };
  if (QUANT.has(w)) return { tag: 'count', text: `Thiếu ${q(word)}.` };
  return { tag: null, text: `Thiếu ý ${q(word)}.` };
}

/** A word in the sentence that the answer does not have. */
function extraFinding(word: string, c: Ctx): Finding | null {
  const w = low(word);
  if (ARTICLES.has(w)) return { tag: 'article', text: `Thừa ${q(word)}: không dùng mạo từ trước danh từ số nhiều / không đếm được nói chung, trước tên riêng, môn học, bữa ăn.` };
  if (BE.has(w)) return { tag: 'be', text: `Thừa ${q(word)}: không dùng to be cùng động từ thường ở thì đơn (I go ✓, I am go ✗).` };
  if (DO.has(w)) return { tag: 'question', text: `Thừa ${q(word)}: câu khẳng định, hoặc câu đã có to be / can / will, thì không cần do / does / did.` };
  if (w === 'to') return { tag: 'vpat', text: `Thừa ${q('to')}: sau can / should / must / will / let / make là V nguyên mẫu; enjoy / mind… + V-ing.` };
  if (w === 'will' && c.tags.includes('conj')) return { tag: 'conj', text: `Thừa ${q('will')}: sau when / until / as soon as / if dùng hiện tại đơn cho chuyện tương lai.` };
  if (PREPS.has(w)) return { tag: 'prep', text: `Thừa giới từ ${q(word)}: một số động từ đi thẳng với tân ngữ (discuss sth, enter sth, call sb).` };
  return null;
}

/**
 * The findings for one translated sentence (at most 4, grammar first). `tags`: the grammar points the sentence
 * trains, used to decide between close readings (plural noun or verb -s, passive or past…).
 */
export function diagnose(tokens: DiffToken[], tags: string[] = []): Finding[] {
  const words = tokens.filter((t) => !t.punct && t.kind !== 'punctuation');
  const exp = words.filter((t) => t.expected).map((t) => low(t.expected));
  // index of each token in the expected sentence, to know its neighbours
  let i = -1;
  const pos = words.map((t) => (t.expected ? ++i : i));
  const ctx = (k: number): Ctx => {
    const p = words[k]!.expected ? pos[k]! - 1 : pos[k]!;
    const n = words[k]!.expected ? pos[k]! + 1 : pos[k]! + 1;
    return { prev: exp[p] ?? '', next: exp[n] ?? '', tags };
  };

  const out: Finding[] = [];
  // a word that is in the answer and in the sentence, but not at the same place: moved (word order)
  const wrongTokens = words.filter((t) => t.kind !== 'correct');
  const expWrong = new Set(wrongTokens.filter((t) => t.expected).map((t) => low(t.expected)));
  const actWrong = new Set(wrongTokens.filter((t) => t.actual).map((t) => low(t.actual)));
  const moved = new Set([...expWrong].filter((w) => actWrong.has(w)));

  if (moved.size) out.push({ tag: 'order', text: `Trật tự từ: ${[...moved].map((w) => q(w)).join(', ')} đặt sai chỗ. Nhớ: trạng từ tần suất trước động từ thường, tính từ trước danh từ, câu hỏi gián tiếp giữ S + V.` });

  words.forEach((t, k) => {
    if ((t.kind === 'misspelled' || t.kind === 'wrong_word' || t.kind === 'word_form') && moved.has(low(t.expected)) && moved.has(low(t.actual))) return;
    if (t.kind === 'misspelled' || t.kind === 'wrong_word' || t.kind === 'word_form') {
      const f = formFinding(t.expected!, t.actual!, ctx(k));
      if (f) out.push(f);
      else if (t.kind === 'misspelled') out.push({ tag: null, text: `Chính tả: ${q(t.actual)} → ${q(t.expected)}.` });
      else out.push({ tag: null, text: `Từ khác đáp án: ${q(t.actual)} → ${q(t.expected)} (từ vựng / cách diễn đạt).` });
    } else if (t.kind === 'missing' && !moved.has(low(t.expected))) {
      const f = missingFinding(t.expected!, ctx(k));
      if (f) out.push(f);
    } else if (t.kind === 'extra' && !moved.has(low(t.actual))) {
      const f = extraFinding(t.actual!, ctx(k));
      if (f) out.push(f);
      else out.push({ tag: null, text: `Thừa ${q(t.actual)}.` });
    }
  });

  // grammar first, one line per grammar point and per text; word choices only if there is room
  const seen = new Set<string>();
  const grammar = out.filter((f) => f.tag && !seen.has(f.text) && seen.add(f.text));
  const words2 = out.filter((f) => !f.tag && !seen.has(f.text) && seen.add(f.text));
  // merge "missing word" lines of plain content words into one
  const plain = words2.filter((f) => f.text.startsWith('Thiếu ý'));
  const other = words2.filter((f) => !f.text.startsWith('Thiếu ý'));
  const merged = plain.length > 1 ? [{ tag: null, text: `Thiếu ý: ${plain.map((f) => f.text.slice(8, -1)).join(', ')}.` }] : plain;
  return [...grammar, ...other, ...merged].slice(0, 4);
}

/** Grammar points of the findings, once each. */
export const findingTags = (fs: Finding[]) => [...new Set(fs.map((f) => f.tag).filter((t): t is string => Boolean(t)))];
