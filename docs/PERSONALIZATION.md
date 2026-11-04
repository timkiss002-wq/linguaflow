# LinguaFlow — Cá nhân hoá lộ trình & Writing (thiết kế)

> Trạng thái: **P1, P2, P3 đã xong** (xem mục 10–12). P4–P6 là đề xuất. Bổ sung cho [ARCHITECTURE.md](ARCHITECTURE.md).

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
