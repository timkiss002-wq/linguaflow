# LinguaFlow — Cá nhân hoá lộ trình & Writing (thiết kế)

> Trạng thái: **P1–P6 đã xong** (xem mục 10–15). Bổ sung cho [ARCHITECTURE.md](ARCHITECTURE.md).

## 1. Yêu cầu

1. **Đánh giá năng lực**: bài test về từ vựng, ngữ pháp, kỹ năng (nghe, đọc, chữ Hán, viết).
2. **Phân tích điểm mạnh / điểm yếu**: cụ thể, có bằng chứng, không chỉ là một con số.
3. **Lộ trình cá nhân**: mỗi ngày biết nên học gì, học bao lâu, và **vì sao**.
4. **Tối ưu Writing**: đề viết hợp sở thích, chấm và góp ý, theo dõi tiến bộ.
5. **Dựa trên sở thích & thói quen**: chủ đề yêu thích, giờ học, độ dài buổi học.

## 2. Nguyên tắc thiết kế

| Nguyên tắc | Ý nghĩa |
|---|---|
| **Dữ liệu trước, AI sau** | Phần lớn phân tích làm bằng thuật toán xác định, giải thích được, miễn phí. AI chỉ dùng nơi bắt buộc (chấm bài viết, gợi ý câu hỏi). |
| **Mọi kết luận có bằng chứng** | "Bạn yếu thanh điệu" phải kèm: *14/40 lỗi nghe gần đây chỉ sai thanh, ví dụ 买/卖*. |
| **Có độ tin cậy** | Ít dữ liệu → hiện "chưa đủ dữ liệu" hoặc khoảng ước lượng, không đoán bừa. |
| **Người dùng kiểm soát** | Xem/sửa hồ sơ sở thích, tắt phân tích thói quen, xoá dữ liệu. |
| **Không bịa nội dung** | Câu hỏi test do admin soạn hoặc AI soạn nháp **rồi admin duyệt** mới dùng. |

## 3. Nguồn dữ liệu để phân tích

Rất nhiều tín hiệu **đã có sẵn** từ MVP. Đó là lý do nên làm xong MVP trước.

| Nguồn | Có từ | Cho biết gì |
|---|---|---|
| Dictation attempts + phân loại lỗi | M4 | Nghe: độ chính xác theo HSK level; nghe nhầm vs viết sai chữ; từ hay bỏ sót. |
| **Phân tích pinyin của lỗi nghe** (mới) | M4 + P2 | Với chữ nghe nhầm, so pinyin đáp án và pinyin người dùng gõ: **chỉ sai thanh** (mǎi/mài), **nhầm phụ âm đầu** (zh/z, q/x), **nhầm vần** (an/ang). Đây là điểm yếu nghe rất cụ thể với người Việt học tiếng Trung. |
| Cặp chữ viết nhầm | M4 | Danh sách nhầm lẫn cá nhân: 的/得, 在/再, 做/作 → bài luyện riêng. |
| SRS reviews | M6 | Từ vựng: tỉ lệ quên (lapses), độ phủ từ vựng theo danh sách HSK. |
| Bài test (mới) | P3 | Ngữ pháp, từ vựng, đọc: trình độ ước lượng cho từng kỹ năng. |
| Bài viết (mới) | P5–P6 | Writing: độ dài câu, độ phong phú từ vựng, lỗi ngữ pháp lặp lại. |
| Study sessions, favorites, video đã xem | M1–M7 | Thói quen: giờ học, độ dài buổi, độ đều đặn; sở thích: chủ đề hay xem/hoàn thành. |
| Onboarding (mới) | P1 | Mục tiêu (thi HSK mấy, ngày thi), sở thích khai báo, thời gian/ngày. |

## 4. Mô hình năng lực

### 4.1. Kỹ năng theo dõi

`listening` · `vocabulary` · `grammar` · `characters` (nhận diện/viết đúng chữ Hán) · `reading` · `writing`.

### 4.2. Thuật toán: Elo rating (đơn giản, giải thích được)

Mỗi **người dùng × kỹ năng** có một điểm `rating`. Mỗi **câu hỏi** cũng có `rating` (độ khó).
Sau mỗi câu trả lời (score ∈ [0,1]):

```
expected     = 1 / (1 + 10^((item_rating − user_rating) / 400))
user_rating += K × (score − expected)       K = max(16, 64 / √(n + 1)),  n = số câu đã làm
item_rating −= K_item × (score − expected)  (chỉ khi câu hỏi đã có ≥ 30 lượt trả lời)
```

- Rating khởi điểm của câu hỏi theo HSK: HSK1 = 800, mỗi cấp +150 → HSK6 = 1550.
- **Trình độ ước lượng** = cấp HSK cao nhất mà xác suất làm đúng ≥ 70%.
- **Độ tin cậy** từ `n`: < 10 câu → "chưa đủ dữ liệu"; 10–30 → "tạm tính"; > 30 → "ổn định".
- Không chỉ bài test: **mọi hoạt động** (dictation, review, bài viết) đều cập nhật rating của kỹ năng tương ứng, nên hồ sơ năng lực luôn mới.

Lý do chọn Elo thay vì IRT đầy đủ: hoạt động tốt khi ít dữ liệu, cập nhật từng câu, dễ giải thích.
Khi có nhiều người dùng có thể nâng lên IRT 2PL mà không đổi giao diện.

### 4.3. Điểm mạnh / điểm yếu cụ thể (knowledge points)

Ngoài rating tổng, theo dõi **mức thành thạo từng điểm kiến thức**:
- **Từ vựng**: từng từ trong danh sách HSK (biết / đang học / chưa gặp).
- **Ngữ pháp**: từng điểm ngữ pháp HSK (vd. 把字句, 被字句, 是…的, bổ ngữ kết quả, 虽然…但是).
- **Âm**: nhóm lỗi phát âm/nghe (thanh 3 vs 2, zh/z…).
- **Chữ**: cặp chữ hay nhầm.

Báo cáo điểm mạnh/yếu = top điểm có mastery cao/thấp **và đủ bằng chứng**, kèm ví dụ thật từ bài làm.

## 5. Bài test

| Loại | Khi nào | Độ dài | Mục đích |
|---|---|---|---|
| **Placement** (thích ứng) | Lần đầu | ~20–25 câu, ~12 phút | Xếp trình độ ban đầu cho từng kỹ năng |
| **Check-in** | Mỗi 2 tuần (gợi ý) | ~10 câu | Cập nhật rating, đo tiến bộ |
| **Skill drill** | Theo lộ trình | 5–10 câu | Luyện đúng điểm yếu |

**Thích ứng**: câu tiếp theo được chọn có rating gần rating hiện tại của người dùng ở kỹ năng
đang đo, luân phiên giữa các kỹ năng, không lặp câu đã làm.

**Dạng câu hỏi** (đều chấm tự động):
- Trắc nghiệm nghĩa/từ (vocab), chọn từ điền chỗ trống (grammar, vd. 了/过/着),
- Sắp xếp từ thành câu (grammar, giống đề HSK 4–5),
- Đọc hiểu đoạn ngắn (reading),
- Nghe 1 câu rồi chép (listening; dùng segment video đã có hoặc audio TTS),
- Chọn chữ đúng giữa các chữ đồng âm (characters).

**Nguồn câu hỏi**: danh sách từ & ngữ pháp HSK (công khai) làm khung. Câu hỏi do admin viết hoặc
AI soạn nháp → admin duyệt (`status = draft → approved`). Chỉ câu `approved` được dùng.

## 6. Lộ trình cá nhân (plan generator)

Rule-based, chạy mỗi ngày (hoặc khi mở Dashboard). Gói gọn trong `daily_goal_minutes`:

1. **Ôn từ đến hạn** (SRS) — luôn ưu tiên, giới hạn ~40% thời gian.
2. **1 bài luyện điểm yếu** — điểm kiến thức có mastery thấp nhất & đủ bằng chứng.
3. **Video mới** — cấp *i+1* (trên trình độ nghe ước lượng một chút), ưu tiên chủ đề yêu thích.
4. **Writing** — 2–3 lần/tuần, đề theo sở thích + từ đang học.
5. **Check-in test** — khi đến lịch.

Mỗi mục có **lý do hiển thị**: *"Vì 6/10 lỗi gần nhất của bạn là nhầm thanh 2 và thanh 3."*
Người dùng có thể đổi/bỏ mục; hành vi đó cũng được dùng để điều chỉnh lần sau.

**Thói quen** → điều chỉnh: giờ học hay nhất (để gợi ý nhắc), độ dài buổi thực tế (nếu thường
học 10 phút mà mục tiêu 30 phút → đề xuất hạ mục tiêu), ngày hay bỏ học.

## 7. Writing

### 7.1. Đề bài cá nhân hoá
- Theo **sở thích** (chủ đề khai báo + chủ đề video hay xem),
- Theo **trình độ** (rating writing/grammar) và **dạng đề HSK**: HSK 3–4 đặt câu với từ cho sẵn;
  HSK 5 viết đoạn ~80 chữ với 5 từ cho sẵn; HSK 6 tóm tắt (缩写) ~400 chữ,
- Kèm **từ mục tiêu** lấy từ sổ từ vựng đang học → viết là ôn từ.

### 7.2. Phân tích không cần AI (làm trước)
Số chữ/từ, độ dài câu, **phân bố cấp HSK của từ đã dùng** (độ phong phú), có dùng đủ từ mục tiêu
không, liên từ đã dùng (因为…所以, 虽然…但是…), tốc độ viết, so sánh với các bài trước.

### 7.3. Góp ý bằng AI (cần API trả phí)
Qua **Supabase Edge Function** gọi Claude API (key nằm ở server, không lộ ra trình duyệt):
- Sửa lỗi từng câu, kèm giải thích tiếng Việt và **gắn nhãn điểm ngữ pháp** → cập nhật mastery,
- Chấm theo rubric (hoàn thành đề, từ vựng, ngữ pháp, mạch lạc), viết lại mẫu cùng trình độ.

Ràng buộc: hiển thị rõ "AI góp ý, có thể sai"; giới hạn số lần/ngày mỗi người; lưu kết quả để
không gọi lại; người dùng có thể tắt.

## 8. Database bổ sung (dự kiến)

| Bảng | Nội dung |
|---|---|
| `learner_profiles` | mục tiêu, HSK mục tiêu, ngày thi, chủ đề quan tâm, phút/ngày, cho phép phân tích thói quen |
| `hsk_words` | danh sách từ HSK: từ, pinyin, cấp, nghĩa tiếng Việt (dùng chung với popup từ điển) |
| `grammar_points` | điểm ngữ pháp HSK: mã, cấp, tên, giải thích, ví dụ |
| `assessment_items` | câu hỏi: kỹ năng, dạng, cấp HSK, nội dung/đáp án (jsonb), rating, nguồn (manual/ai), trạng thái duyệt |
| `item_knowledge_points` | câu hỏi ↔ từ / điểm ngữ pháp mà nó kiểm tra |
| `assessments`, `assessment_responses` | phiên test và từng câu trả lời (đáp án, đúng/sai, thời gian) |
| `user_skill_ratings` (+ `_history`) | rating Elo theo user × ngôn ngữ × kỹ năng, số câu, theo thời gian |
| `user_knowledge_mastery` | mastery theo user × điểm kiến thức (từ, ngữ pháp, âm, cặp chữ) + ví dụ bằng chứng |
| `learning_plans`, `plan_items` | kế hoạch ngày: mục, lý do, trạng thái (done/skipped) |
| `writing_tasks`, `writing_submissions` | đề viết; bài nộp, chỉ số tự tính, góp ý AI (jsonb), điểm rubric |

Tất cả bảng của người dùng có RLS `user_id = auth.uid()`; ngân hàng câu hỏi chỉ admin ghi, và
**đáp án không gửi về trình duyệt trước khi trả lời** (chấm qua RPC).

## 9. Milestones đề xuất

Personalization dùng dữ liệu từ Dictation và SRS, nên đặt **sau vòng học cốt lõi**:

| # | Milestone | AI? |
|---|---|---|
| M3–M7 | MVP như kế hoạch (M3 = player + công cụ cắt câu cho admin) | Không |
| **P1** | Onboarding & hồ sơ học tập (mục tiêu, sở thích, thời gian); import danh sách từ HSK | Không |
| **P2** | Mô hình năng lực + trang **Điểm mạnh / Điểm yếu** từ dữ liệu sẵn có (phân tích lỗi nghe theo pinyin, cặp chữ nhầm, SRS) | Không |
| **P3** | Ngân hàng câu hỏi + editor admin, điểm ngữ pháp HSK, **Placement test thích ứng** (Elo), check-in | Tuỳ chọn (soạn nháp câu hỏi) |
| **P4** | **Lộ trình hằng ngày** trên Dashboard, có lý do, phân tích thói quen | Không |
| **P5** | Writing: đề theo sở thích & từ đang học, phân tích tự động, lịch sử tiến bộ | Không |
| **P6** | Góp ý Writing bằng AI + gắn nhãn lỗi ngữ pháp vào mô hình năng lực | Có |

P1, P2, P4, P5 chạy hoàn toàn không cần AI. Chỉ P6 (và tuỳ chọn ở P3) cần Claude API key.

## 10. P1 — đã triển khai

- **Hồ sơ học tập** (`learner_profiles`): sở thích, giờ học hay học, ngày học trong tuần, đồng ý/không
  cho phân tích thói quen (tắt được bất cứ lúc nào). **Mục tiêu** (`learning_goals`): mỗi ngôn ngữ một mục
  tiêu — tiếng Anh: IELTS (band 3.0–9.0) hoặc CEFR; tiếng Trung: HSK 2.0 (1–6), HSK 3.0 (1–9) hoặc CEFR —
  trình độ hiện tại → mục tiêu, ngày thi (tuỳ chọn), kỹ năng muốn tập trung.
- **Wizard 4 bước** ngay sau khi đăng ký (bỏ qua được), sửa lại từ Settings → Learning profile.
- **Danh sách từ HSK chính thức** (`hsk_words`, 11.470 từ, cả HSK 2.0 và 3.0, nguồn
  *complete-hsk-vocabulary*, MIT) — `content/hsk-words.json`, nạp qua `supabase/seed-hsk.sql`.
- **Dashboard → Your goals**: đếm ngược đến ngày thi; với HSK: số từ của cấp mục tiêu bạn đã biết
  (từ trong sổ ở trạng thái Reviewing/Mastered) và **số từ mới cần học mỗi ngày** (kèm nhận xét
  comfortable / challenging / very ambitious); với IELTS/CEFR: số giờ học có được với thời lượng mỗi ngày.
- **Gợi ý bài học** (rule-based, có lý do): bài ở đúng trình độ hoặc cao hơn một bậc (i+1), ưu tiên chủ đề
  yêu thích, bỏ bài đã xong, không bao giờ gợi ý bài khó hơn quá một bậc. Hiện ở Dashboard và hàng
  "For you" trên trang Lessons.
- **Popup từ tiếng Trung** hiện cấp HSK 2.0/3.0 và nghĩa tiếng Anh của từ.
- Quy đổi dùng để chọn bài: IELTS 4.0–5.0 ≈ B1, 5.5–6.5 ≈ B2, ≥ 7.0 ≈ C1; HSK 3.0 → thang 6 cấp của bài học
  là gần đúng.

## 11. P2 — đã triển khai

Trang **Strengths & Weaknesses** (`/insights`) — chỉ dùng dữ liệu bạn đã tạo ra, không cần AI, không có bài test riêng.

- **Nguồn dữ liệu**: RPC `get_insight_data(p_days)` (30 / 60 / 90 ngày) gom câu đã *Check* trong Dictation
  (không tính câu bấm Show answer / Skip), cặp chữ/từ nhầm, từ bị bỏ sót (mỗi lần Check giờ lưu thêm
  `missed`), lượt ôn flashcard, luyện gõ, bài word form, từ hay quên (`lapses ≥ 2`) và giờ học.
  Phân tích nằm trong `src/lib/personal/insights.ts` (thuần TypeScript, có unit test).
- **Tiếng Trung — phân tích theo pinyin** từng cặp chữ nhầm: **sai thanh** (买/卖, báo "thanh 3 → 4"),
  **nhầm phụ âm đầu** (zh/z…), **nhầm vần** (an/ang…), **chữ đồng âm** (气/汽 — nghe đúng, viết sai chữ),
  **bỏ sót trợ từ** (了, 的, 吗…), và độ chính xác chung.
- **Tiếng Anh**: rơi/thừa đuôi **-s / -ed / -ing**, bỏ sót **từ chức năng** (a, the, of…), **word form**
  (dùng 104 họ từ), lỗi chính tả, độ chính xác chung.
- **Từ vựng**: tỉ lệ nhớ flashcard, **từ hay quên** (nút mở luyện gõ đúng các từ đó), độ chính xác luyện gõ EN / 汉字.
- **Thói quen** (chỉ khi bật *Learn from my study habits*): phút học theo buổi, **buổi bạn làm đúng nhiều nhất**,
  số ngày học so với số ngày đã lên kế hoạch trong 2 tuần.
- **Bài luyện chữ đồng âm**: lấy đúng câu bạn đã nghe sai, đục lỗ chữ đó, chọn giữa chữ đúng và chữ bạn đã gõ.
- **Không kết luận khi thiếu bằng chứng**: tối thiểu 10 câu / ngôn ngữ, 3 lần cho một mẫu lỗi, 20 lượt ôn,
  10 lần gõ; mỗi kết luận ghi rõ "Based on: …". Chưa đủ dữ liệu → trang nói cần thêm bao nhiêu.

## 12. P3 — đã triển khai

Trang **Level Test** (`/level-test`): bài test xếp trình độ thích ứng cho từng kỹ năng, check-in mỗi 2 tuần.

- **Ngân hàng câu hỏi** `content/assessment.json` → bảng `assessment_items` (110 câu: 中文 vocabulary · grammar ·
  listening · characters · reading, English vocabulary · grammar · listening · reading; mỗi kỹ năng 2 câu × 6 cấp
  HSK 1–6 / A1–C2, kèm giải thích tiếng Việt). Dạng: trắc nghiệm (gồm điền chỗ trống, chọn chữ đồng âm, đọc đoạn văn,
  nghe câu TTS) và **sắp xếp từ thành câu** (chấp nhận nhiều đáp án đúng). Câu hỏi do LinguaFlow soạn (demo), nên được
  giáo viên/người bản ngữ duyệt trước khi dùng thật. `npm run seed:build` kiểm tra từng câu (đủ phương án, không trùng,
  câu nghe có audio, câu đọc có đoạn văn, điểm ngữ pháp tồn tại) và trộn phương án cố định theo id.
- **27 điểm ngữ pháp** (`grammar_points`: 把, 被, 了, 过, 比, 是…的, 连…都, 与其…不如…; present perfect, passive,
  conditionals, inversion…). Câu sai gắn điểm ngữ pháp → mục *Grammar to review* trong kết quả.
- **Đáp án không bao giờ gửi về trình duyệt trước khi trả lời**: người học không đọc được `assessment_items` (RLS chỉ
  cho admin); câu hỏi đến từ `next_assessment_item()` (không kèm đáp án), chấm bằng `answer_assessment_item()`.
  Ngoại lệ không tránh được: câu nghe phải có chữ trong trình duyệt để TTS đọc.
- **Thích ứng**: luân phiên kỹ năng (kỹ năng ít câu nhất đi trước); trong kỹ năng chọn câu **chưa làm bao giờ**, có
  rating gần rating hiện tại nhất. Chọn câu xác định (không ngẫu nhiên) nên tải lại trang vẫn đúng câu đó; bỏ dở thì
  quay lại làm tiếp. Placement 20 câu (4/kỹ năng), check-in 10 câu.
- **Elo** như mục 4.2, với hai điều chỉnh sau khi chạy thử:
  - `K = max(24, 160/√(n+1))` thay vì 64 — với chỉ 4 câu mỗi kỹ năng, K = 64 chỉ dịch được khoảng nửa cấp.
  - **Trình độ = cấp khó nhất mà xác suất làm đúng ≥ 50%** (định nghĩa chuẩn của Elo/IRT) thay vì 70%; với 70%,
    làm đúng cả câu HSK 5 vẫn chỉ ra HSK 3.
  - Độ tin cậy: < 4 câu "rough", 4–11 "provisional", ≥ 12 "stable".
  - Rating câu hỏi chỉ bắt đầu thay đổi khi có ≥ 30 lượt trả lời.
- **Bắt đầu** ở trình độ người học khai báo trong hồ sơ (P1), mặc định HSK 3 / B1.
- **Kết quả**: trình độ từng kỹ năng, thay đổi so với lần test trước (▲▼ theo phần lẻ cấp), điểm ngữ pháp cần ôn,
  xem lại từng câu với đáp án và giải thích. Lịch sử rating lưu ở `user_skill_ratings_history`.
- **Dashboard** nhắc: chưa test ngôn ngữ đang học / có bài làm dở / đã 14 ngày → check-in.
- **Chưa làm (để sau)**: trình soạn câu hỏi cho admin và AI soạn nháp (hiện sửa trong JSON như bài học); cập nhật
  rating từ Dictation/ôn từ (dự kiến cùng P4).

## 13. P4 — đã triển khai

Thẻ **Today's plan** ở đầu Dashboard. Logic trong `src/lib/personal/plan.ts` (thuần, có unit test).

- **Một kế hoạch mỗi ngày** (bảng `daily_plans`, theo múi giờ của người học): tạo lần đầu mở Dashboard trong ngày rồi
  giữ nguyên cả ngày. Nút **Rebuild** tạo lại từ dữ liệu mới nhất (ví dụ sau khi đổi mục tiêu).
- **Thứ tự, gói trong `daily_goal_minutes`:**
  1. **Ôn thẻ đến hạn**, tối đa 40% thời gian (~4 thẻ/phút). Link mở đúng ngôn ngữ có nhiều thẻ nhất.
  2. **Level test**: làm tiếp bài dở, làm bài xếp lớp đầu tiên, hoặc check-in sau 14 ngày (tối đa 1 bài/ngày).
  3. **Một điểm yếu**, đổi theo ngày: điểm ngữ pháp sai trong bài test gần nhất (hiện giải thích ngay trong thẻ), hoặc
     bài luyện cho điểm yếu từ P2 (từ hay quên → luyện gõ đúng những từ đó, word form, chính tả, chữ đồng âm).
  4. **Bài Dictation** với thời gian còn lại: làm tiếp bài đang dở, nếu không thì bài i+1. Cấp độ lấy từ **trình độ
     nghe trong level test** (nếu có), không thì từ hồ sơ. Lỗi nghe lặp lại (thanh điệu, đuôi -s/-ed…) thành
     *Today's focus* của bài.
  - 2 ngôn ngữ: kỳ thi trong 60 ngày tới được ưu tiên, không thì luân phiên theo ngày.
- **Mỗi mục có lý do** ("10 cards are due today…", "One step above your level — your listening level is HSK 3…").
- **Tự đánh dấu xong** từ việc đã làm hôm nay (`get_plan_progress`): số lượt ôn, số câu đã làm của đúng bài đó, lượt
  luyện gõ, word form, bài test đã nộp. Mục không đo được (đọc điểm ngữ pháp, bài luyện chữ đồng âm) có nút *Mark done*.
- **Bỏ qua (Skip / Undo)** được lưu lại. Loại mục bị bỏ ≥ 3 lần trong 14 ngày sẽ ngắn hơn và có ghi chú giải thích.
- **Thói quen**:
  - Ngày không nằm trong lịch học → *Rest day*, chỉ ôn nhẹ (tối đa 10 phút).
  - Buổi học thực tế < 60% mục tiêu → gợi ý hạ mục tiêu (chỉ khi bật phân tích thói quen).
- **Dictation cập nhật trình độ nghe** (phần còn nợ từ P3): mỗi câu đã *Check* nhích rating nghe một bước Elo nhỏ
  (K = 8, so với cấp của bài; đúng ≥ 95% = 1, ≥ 80% = 0,5). Câu bấm Show answer / Skip không tính. Chỉ áp dụng khi
  đã có rating (đã làm level test).
- **Chưa có**: nhắc giờ học bằng thông báo. (Mục Writing được thêm ở P5.)

## 14. P5 — đã triển khai

Trang **Writing** (`/writing`), tiếng Anh và tiếng Trung, **không dùng AI**.

- **Chọn ngôn ngữ trước** (English / 中文), rồi mới thấy đề của ngôn ngữ đó.
- **28 đề** (`content/writing-tasks.json` → `writing_tasks`, 14 mỗi ngôn ngữ, cấp 1–6). Các dạng:
  - HSK: đặt câu với từ cho sẵn (HSK 3–4), đoạn ~80 chữ với 5 từ (HSK 5), bài luận (HSK 6);
  - IELTS: Task 2 essay, General Task 1 letter;
  - đoạn văn / email theo chủ đề.
- **Chọn đề cho bạn** (`src/lib/writing/tasks.ts`): đúng trình độ (lấy từ ngữ pháp trong level test → hồ sơ → mặc
  định), chủ đề bạn thích, dạng đề kỳ thi bạn nhắm tới; đề viết trong 14 ngày gần đây bị đẩy xuống. Mỗi đề ghi lý do.
- **Từ mục tiêu**: 2 từ trong sổ từ vựng (trạng thái New/Learning) + từ của đề, tổng 5 từ — viết cũng là ôn từ. Đề
  dạng HSK giữ đúng 5 từ của đề như bài thi thật.
- **Trình soạn**: đếm chữ/từ trực tiếp, từ mục tiêu sáng lên khi đã dùng, gợi ý bố cục theo dạng bài, đề tiếng Việt
  khi cần. Bản nháp tự lưu trên thiết bị đến khi nộp. Thời gian viết chỉ tính khi trang đang mở và đã bắt đầu gõ.
- **Phân tích** (`src/lib/writing/analyze.ts`, thuần, có unit test), lưu cùng bài viết:
  - **Số liệu**: số chữ/từ so với yêu cầu, số câu, độ dài câu trung bình / dài nhất, số đoạn, độ đa dạng từ vựng
    (từ khác nhau ÷ từ nội dung), từ lặp nhiều, tốc độ viết.
  - **Từ nối** theo nhóm (thêm ý, đối lập, nguyên nhân, kết quả, điều kiện, ví dụ, trình tự, quan điểm, kết luận).
    Tiếng Trung nhận cả cặp 因为…所以, 虽然…但是… và không đếm trùng.
  - **Kiểm tra tiếng Anh**: viết hoa đầu câu, chữ “I”, dấu cách quanh dấu câu, câu quá dài.
    Riêng essay/letter: viết tắt (don't), mở câu bằng And/But/So, “very” lặp nhiều, thiếu đoạn hoặc kết luận.
  - **Kiểm tra tiếng Trung**: dấu câu nửa độ rộng, pinyin/chữ Latin, dấu cách giữa chữ, câu dài không có dấu phẩy,
    quá nhiều câu mở đầu bằng 我, chưa có từ nối.
  - **Tiếng Trung — cấp HSK của các từ đã dùng** (tách từ bằng `Intl.Segmenter`, tra `hsk_words`) và danh sách
    **từ cao hơn trình độ của bạn**.
  - **So với các bài trước** cùng ngôn ngữ (trung bình 5 bài gần nhất): độ đa dạng, độ dài câu, số loại từ nối, số
    điểm cần sửa, số từ trên trình độ.
  - Trang kết quả tô màu từ mục tiêu và từ nối, và nói rõ: kiểm tra tự động chỉ xem hình thức, **không chấm ngữ
    pháp hay ý** — phần đó để P6 (AI).
- **Lịch sử** bài viết theo ngôn ngữ, xoá được.
- **Kế hoạch hằng ngày**: mục *Write a short text* cách ngày, đến khi đủ 3 bài/tuần, khi còn ≥ 15 phút; tự đánh dấu
  xong khi nộp bài trong ngày.

## 15. P6 — đã triển khai

Nút **Get AI feedback** trên trang kết quả bài viết. Dùng **Gemini** (gói miễn phí của Google AI Studio) qua
Supabase Edge Function `writing-feedback`; cách cài đặt key xem [DEPLOY.md §4](DEPLOY.md#4-góp-ý-bài-viết-bằng-ai-tuỳ-chọn).

- **Key chỉ ở server** (secret `GEMINI_API_KEY`). Function không phụ thuộc thư viện ngoài, chỉ dùng `fetch`:
  - kiểm tra người dùng qua Auth;
  - đọc bài viết **bằng token của người học**, nên RLS đảm bảo chỉ đọc được bài của chính họ;
  - gọi Gemini;
  - lưu kết quả bằng service role.
- **Người học không tự ghi được góp ý** (bảng `writing_feedback` không có policy insert); xoá bài thì xoá luôn góp ý.
- **Nội dung góp ý** (`supabase/functions/_shared/writing-feedback.ts`, dùng chung cho function và app, có unit test):
  - Điểm theo 4 tiêu chí:
    - tiếng Anh theo thang IELTS 0–9: Task response, Coherence & cohesion, Lexical resource, Grammar;
    - tiếng Trung thang 1–5: 内容, 词汇, 语法, 结构, kèm cấp HSK ước lượng.
  - Điểm tổng **do app tự tính** từ 4 tiêu chí, không lấy theo AI.
  - Tối đa 12 câu sửa: câu gốc → câu sửa, loại lỗi (chia động từ, mạo từ, 了/过/着, 的/得/地, 量词…), giải thích
    tiếng Việt.
  - Nhận xét chung, điểm tốt, việc cần tập trung, và bản viết lại cùng ý ở trình độ cao hơn tối đa một bậc.
- **Không tin AI mù quáng**:
  - JSON phải đúng schema; điểm được kẹp vào thang.
  - **Câu sửa nào không trích đúng nguyên văn bài viết thì bị bỏ**; câu "sửa" mà không đổi gì cũng bị bỏ.
  - Câu trả lời hỏng → báo lỗi, không lưu.
  - Bài viết được đặt trong thẻ `<learner_text>` và AI được dặn bỏ qua mọi "lệnh" nằm trong bài (chống prompt injection).
- **Chi phí và giới hạn**:
  - Mỗi bài chỉ gọi AI một lần (kết quả được lưu).
  - Mỗi người tối đa 5 lượt / 24 giờ (`WRITING_FEEDBACK_DAILY_LIMIT`).
  - Gemini quá tải (429) → báo "busy, thử lại sau một phút".
- **Quyền riêng tư**:
  - Lần đầu bấm nút sẽ hiện hộp thoại: bài viết được gửi cho Google Gemini, và ở gói miễn phí Google có thể dùng
    dữ liệu này → đừng ghi thông tin cá nhân.
  - Đồng ý thì mới bật `settings.aiFeedback`; tắt lại được trong Settings → AI feedback.
- **Nối với phân tích điểm yếu (P2)**: loại lỗi AI sửa ≥ 3 lần trong ≥ 2 bài viết xuất hiện ở Strengths & Weaknesses
  ("Writing: Subject–verb agreement — 4 corrections in 2 texts").
- **Kiểm thử**: bộ e2e 13 chạy function thật bằng Deno, nối với Supabase local và một **Gemini giả** (không cần key,
  không tốn quota). Bộ này kiểm tra:
  - xin đồng ý trước lần đầu;
  - server chưa có key thì báo rõ;
  - nội dung gửi sang Gemini đúng (key trong header, bài viết nằm trong thẻ, JSON mode);
  - lọc câu sửa bịa;
  - lưu kết quả và không gọi lại AI;
  - câu trả lời hỏng thì báo lỗi rồi thử lại được;
  - giới hạn mỗi ngày;
  - không giả mạo được góp ý;
  - lỗi lặp lại hiện ở trang điểm yếu;
  - tắt được trong Settings.
- **Chưa làm**: cập nhật trình độ Elo từ điểm AI (điểm AI chưa đủ ổn định để đưa vào level test).

## 16. W1 — viết theo khung (IELTS Task 2)

Trang **Writing → IELTS frames** (`/writing/guided`), cho người chưa biết viết: học **một khung cố định cho mỗi dạng
đề**, dùng lại cho mọi đề cùng dạng, rồi dịch bài mẫu từng câu từ tiếng Việt cho đến khi tự viết được trọn bài.

- **Nội dung** (`content/ielts-guided/*.json`, không cần database — nằm trong một chunk tải khi mở trang):
  - `frames.json`: 5 dạng (Agree/Disagree, Discuss both views, Advantages/Disadvantages, Problem–Solution,
    Two-part). Mỗi khung 13–15 câu; mỗi câu có chức năng (VI/EN), mẫu câu có chỗ trống `___` và các **cụm cố định**
    phải có (mỗi cụm có thể có vài cách viết thay thế, ví dụ agree/disagree).
  - 2 đề mỗi dạng (10 đề). Mỗi câu: bản tiếng Việt + 3 bản tiếng Anh band **5.5 / 6.5 / 7.5** — cùng ý, khác độ
    phức tạp. Mỗi bài mẫu ≥ 245 từ ở mọi band.
  - Mỗi đề trỏ tới một `writing_tasks` (essay, IELTS) cùng nội dung, nên bài lưu được phân tích và AI chấm như bài
    IELTS. 5 đề mới được thêm vào `content/writing-tasks.json`; nếu database chưa chạy lại seed, bài vẫn lưu được
    (không gắn đề).
  - `src/lib/writing/guided.test.ts` kiểm tra: câu mẫu đúng thứ tự khung, **mọi câu mẫu ở mọi band chứa đủ cụm cố
    định**, viết hoa đầu câu, có dấu chấm, đủ độ dài, đề khớp với writing task.
- **Các mức** (một đề → chọn band → chọn mức):
  - 0 — *Học khung*: chỉ có chức năng câu + mẫu câu đã che cụm cố định; gõ lại cụm cố định (sai chính tả không qua).
  - 1 — câu tiếng Việt + mẫu câu (cụm cố định in đậm) + 4 từ gợi ý + dàn khung bên cạnh.
  - 2 — câu tiếng Việt + chức năng câu.
  - 3 — chỉ câu tiếng Việt.
  - 4 — tự viết cả bài trong trình soạn thường (`/writing/new/:taskId`).
- **Kiểm tra từng câu** (`checkSentence`, thuần, không AI):
  - cụm cố định: so từng từ, bỏ qua hoa/thường và dấu câu, cho phép lỗi chính tả nhỏ nhưng báo ra;
  - so với cả 3 câu mẫu, lấy câu gần nhất (độ giống %, so sánh từng từ như bài chính tả);
  - "từ quan trọng chưa dùng" = từ nội dung có mặt ở **cả ba** câu mẫu (ý cốt lõi), nên từ đồng nghĩa chỉ có ở một
    band không bị coi là thiếu;
  - lưu ý hình thức: viết hoa đầu câu, dấu chấm, chữ "I", không viết tắt trong essay, câu quá ngắn;
  - kết luận: *Rất tốt* (≥ 85%), *Gần đúng* (≥ 55%), *Khác câu mẫu* (vẫn có thể đúng — tự so sánh), *Thiếu khung*.
- Làm dở được lưu trên thiết bị (localStorage) theo đề + band + mức. Hết bài: số liệu, bài của bạn (sửa được) cạnh
  bài mẫu 3 band; **Save & analyse** lưu vào `writing_submissions` với `metrics.guided` (đề, band, mức, độ giống
  trung bình) → trang kết quả có phân tích và nút AI chấm band. Danh sách đề hiện kết quả tốt nhất mỗi mức.

## 17. W2 — luyện đề IELTS Reading & Listening

Trang **Lessons → IELTS tests** (`/ielts`). Đề do LinguaFlow tự soạn đúng format IELTS (không chép đề Cambridge).

- **Nội dung** (`content/ielts-tests/*.json`, nằm trong app, không cần seed):
  - `reading-1`: Academic Reading, 3 bài đọc, 40 câu — True/False/Not Given, Yes/No/Not Given, matching headings,
    multiple choice, matching information, điền từ (note / sentence / summary).
  - `listening-1`: 4 phần, 40 câu — form completion, multiple choice, matching, note completion. Âm thanh là giọng
    đọc của trình duyệt: mỗi người nói một giọng (`assignVoices`: đúng giới tính nếu máy có, nếu thiếu giọng thì đổi
    cao độ), đọc từng câu một để trình duyệt không cắt câu dài.
  - Mỗi câu hỏi có đáp án (điền từ: mọi cách viết được chấp nhận), giải thích tiếng Việt (bẫy thường gặp) và một
    **đoạn trích nguyên văn** chứa đáp án. `src/lib/ielts/tests.test.ts` kiểm tra đủ 40 câu, đánh số liên tục, đáp án
    nằm trong các lựa chọn, mọi đáp án điền từ đều được chấm đúng, và mọi đoạn trích có thật trong bài / transcript.
- **Hai chế độ**: *Thi thử* cả bài (đếm ngược 60 / 30 phút, hết giờ tự nộp; Listening mỗi phần nghe một lần) và
  *Luyện tập* cả bài hoặc từng phần (không giới hạn giờ, nghe lại, tạm dừng, chỉnh tốc độ). Bài làm dở lưu trên
  thiết bị.
- **Chấm** (`markQuestion`, thuần): lựa chọn so khớp chính xác; điền từ bỏ qua hoa/thường, dấu, gạch nối, mạo từ
  đầu câu, dấu cách trong số — nhưng **quá số từ là sai** như thi thật (số không tính khi đề cho "AND/OR A NUMBER"),
  và sai chính tả cũng sai (app nói rõ "sai chính tả" để người học biết mình nghe/đọc đúng).
- **Kết quả**: số câu đúng, band ước lượng (bảng quy đổi thông dụng, chỉ khi làm đủ 40 câu), còn thiếu bao nhiêu câu
  để đạt 6.5, thống kê theo dạng câu hỏi; mỗi câu có đáp án, giải thích, nút *Xem chỗ có đáp án* tô màu đoạn trích
  trong bài đọc / transcript (transcript chỉ hiện sau khi nộp).
- **Lưu trữ**: bảng `ielts_attempts` (migration `20261115000000_ielts_tests.sql`, RLS: mỗi người chỉ đọc / thêm /
  xoá bài của mình) — câu trả lời và kết quả từng câu. Trang `/ielts` hiện lịch sử, band tốt nhất và dạng câu yếu
  nhất. Nếu database chưa có bảng, đề vẫn làm được, chỉ không lưu lịch sử.
- **Strengths & Weaknesses**: dạng câu hỏi đúng < 60% (từ 5 câu) là điểm yếu, ≥ 85% (từ 8 câu) là điểm mạnh; mất
  điểm vì chính tả / quá số từ (từ 3 câu) có mục riêng.
- Thêm đề: tạo `content/ielts-tests/<id>.json` theo cùng cấu trúc và thêm vào `TESTS` trong `src/lib/ielts/tests.ts`.

## 18. W3 — thi thử Writing và lỗi hay lặp lại

- **Thi thử Task 2** (`/writing/new/:taskId?exam=1`, chỉ cho đề essay IELTS; vào từ thẻ đề, từ *IELTS frames* —
  nút *Thi thử 40′* và Level 4 — và từ khung IELTS trên trang Writing):
  - màn hình bắt đầu nêu luật; đồng hồ đếm ngược **40 phút tính theo giờ thật** (lưu thời điểm bắt đầu, nên tải lại
    trang không dừng được đồng hồ); không có bản dịch, từ gợi ý, khung bài; tắt kiểm tra chính tả của trình duyệt;
    nhắc khi còn 10 / 5 / 1 phút;
  - hết giờ: khóa ô viết và **tự nộp** (bài trống thì không lưu); nộp sớm dưới 250 từ thì hỏi lại;
  - bài lưu như bài viết thường, có thêm `metrics.exam = { minutes, timeUp }`; trang kết quả của bài thi đưa phần AI
    lên đầu và **tự gọi AI chấm** (chỉ khi người học đã đồng ý dùng AI feedback trước đó; mỗi bài một lần).
- **Lỗi hay lặp lại** (`/writing/mistakes`, `src/lib/writing/mistakes.ts`, thuần, có test) — từ phản hồi AI đã lưu
  của các bài tiếng Anh:
  - band từng bài theo 4 tiêu chí (TR / CC / LR / GRA), trung bình 3 bài gần nhất và thay đổi so với 3 bài trước,
    tiêu chí yếu nhất;
  - nhóm lỗi xếp theo **số bài có lỗi đó** (rồi số lỗi), mỗi nhóm có tên tiếng Việt và 3 ví dụ mới nhất của chính
    người học (câu gốc → câu sửa + giải thích); bỏ các "lỗi" mà câu gốc trùng câu sửa;
  - **luyện sửa**: câu gốc của bạn được đặt lại vào ô, bạn tự sửa; đúng khi giống bản sửa của AI ≥ 95% (bỏ qua dấu
    câu), sai thì so sánh từng từ. Mỗi lượt tối đa 15 câu, câu chưa sửa đúng lần nào được hỏi trước (nhớ trên thiết
    bị).
- Không cần thay đổi database.

## 19. W4 — Writing Task 1 (mô tả biểu đồ)

Task 1 Academic dùng đúng cách học của W1 (khung cố định → dịch từng câu → bớt gợi ý → thi thử), trong mục
*IELTS frames*, phần "Task 1".

- **5 dạng** (`content/ielts-guided/frames.json`, `task: 1`): line graph, bar chart, pie charts, table, process
  diagram. Mỗi khung 9–10 câu trong 4 đoạn có tên riêng (`paras`): mở bài · **overview** (đặc điểm chính, không có số
  liệu) · chi tiết 1 · chi tiết 2. Cụm cố định: *The line graph illustrates…*, *Overall,…*, *It is also clear that…*,
  *This means that…*, *By contrast,…*; quy trình dùng câu bị động.
- **Đề** (`content/ielts-guided/task1.json`): 1 đề mỗi dạng, bài mẫu 3 band ≥ 150 từ, mỗi đề có `chart` — dữ liệu
  của hình. Hình được vẽ trong app (`TaskChart`: SVG cho đường / cột / tròn, bảng HTML, sơ đồ các bước), màu theo bảng
  màu đã kiểm tra (`--viz-1…4`, có bản cho dark mode), mọi chuỗi số liệu đều có nhãn chữ và nút xem dạng bảng. Khi
  luyện, hình nằm cạnh câu đang dịch.
- **AI chấm được Task 1**: AI không nhìn thấy hình, nên đề Task 1 trong `writing-tasks.json` có thêm dòng
  `[Chart data] …` (tạo bởi `chartDataText`, test kiểm tra khớp nội dung). App ẩn dòng này khi hiển thị
  (`visiblePrompt`), nhưng lưu kèm bài viết để AI chấm biết số liệu.
- **Thi thử Task 1**: 20 phút, tối thiểu 150 từ (`TASK_RULES`); trình soạn thường và thi thử đều hiện hình.
- 5 đề Task 1 mới nằm trong seed → chạy `npx supabase db push --include-seed`.

## 20. W5 — thêm đề và Task 1 bản đồ

- **Reading/Listening đề 2** (`content/ielts-tests/reading-2.json`, `listening-2.json`): đủ 40 câu, đủ các dạng câu
  hỏi như đề 1 (TFNG, YNNG, headings, matching, MCQ, điền từ). `tests.test.ts` kiểm tra mọi đề: đủ 40 câu, mã không
  trùng, đáp án nằm đúng trong bài/script, bài đọc đủ dài.
- **Thêm đề Writing**: mỗi dạng Task 2 có 3 đề, mỗi dạng biểu đồ Task 1 có 2 đề (tổng 10 đề mới), đều có 3 band và
  câu tiếng Việt. Biểu đồ cột không phải phần trăm (ví dụ "giờ mỗi tuần") hiện đơn vị dưới hình và trong `[Chart data]`.
- **Task 1 dạng bản đồ** (`type: "map"`): hai bản đồ trước – sau trên lưới 100 × 70 (`MapFeature`: nhà, đồng ruộng,
  cây xanh, nước, đường, bãi đỗ), mỗi khu vực ghi tên trực tiếp, có mũi tên hướng Bắc. Khung 11 câu: *The maps
  illustrate…*, *Overall, … was transformed from … into …*, *… was located in …*, *To the … of …, there was …*,
  *By …, … had been replaced by …*, *… was built …*, *Finally, … remained unchanged.* Vị trí trong `[Chart data]`
  (north-west, along the southern edge…) do `mapPosition` tính từ toạ độ, để AI chấm biết bản đồ có gì ở đâu.
- Đề mới nằm trong seed → chạy `npx supabase db push --include-seed`.
