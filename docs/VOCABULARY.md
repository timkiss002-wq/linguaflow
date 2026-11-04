# LinguaFlow — Sổ từ vựng, luyện gõ & Word Form (thiết kế M5)

> Trạng thái: **đề xuất, chưa code**. Bổ sung cho [ARCHITECTURE.md](ARCHITECTURE.md) và [PERSONALIZATION.md](PERSONALIZATION.md).

## 1. Yêu cầu

1. Gặp từ mới khi học → bấm vào từ → **Add** → từ vào một **bảng dạng spreadsheet** (giống Google Sheet người dùng đang dùng).
2. **Luyện gõ** từ trong sổ cho đến khi thành thạo.
3. Có **ngữ cảnh** dùng từ (câu gốc, ví dụ, cụm từ hay đi kèm).
4. Riêng **tiếng Anh/IELTS**: giúp phân biệt **word form** — danh / động / tính / trạng từ của cùng một gốc
   (decide · decision · decisive · decisively), lỗi rất hay gặp trong Writing và Listening IELTS.

## 2. Sổ từ vựng dạng bảng (Vocabulary Sheet)

Một trang dạng bảng tính, mỗi dòng một từ, sửa trực tiếp trong ô (giống Google Sheets):

| Cột | Nội dung | Tự điền? |
|---|---|---|
| Word | Từ / chữ Hán | từ lúc bấm Add |
| Type | n · v · adj · adv · phrase (màu khác nhau cho từng loại) | gợi ý từ từ điển, sửa được |
| IPA / Pinyin | phiên âm | EN: dictionaryapi.dev · ZH: pinyin-pro |
| Meaning (VI) | nghĩa tiếng Việt | từ điển dùng chung nếu có, không thì người dùng gõ |
| Word family | các dạng khác: *decision (n) · decisive (adj) · decisively (adv)* | từ bảng word family (mục 4) |
| Context | **câu gốc** nơi gặp từ (có nút nghe) | tự động |
| My sentence | câu **người dùng tự đặt** với từ này | người dùng |
| Collocations | cụm hay đi kèm: *make a decision, reach a decision* | gợi ý + người dùng |
| Typing | mức thành thạo luyện gõ (●●●○○) | tự động |
| Status | New · Learning · Reviewing · Mastered | tự động (SRS) |

Chức năng: tìm kiếm, lọc theo ngôn ngữ / loại từ / trạng thái / bài học, sắp xếp, thêm dòng thủ công,
xoá, chọn nhiều dòng để luyện, **xuất CSV / Excel** (mở được bằng Google Sheets), **nhập CSV** (chuyển sổ
cũ của người dùng vào app). Trên điện thoại hiển thị dạng thẻ thay vì bảng.

Đồng bộ hai chiều trực tiếp với Google Sheets cần đăng nhập Google (OAuth) và quyền truy cập Drive —
để sau; xuất/nhập CSV giải quyết 90% nhu cầu ngay.

## 3. Luyện gõ (Typing practice)

Mỗi từ đi qua các mức khó dần; gõ đúng liên tiếp thì lên mức, sai thì xuống một mức:

| Mức | Bài | Luyện gì |
|---|---|---|
| 1 | **Chép**: thấy từ + nghĩa, gõ lại 3 lần | chính tả |
| 2 | **Nghe → gõ**: máy đọc từ, gõ lại | nghe + chính tả |
| 3 | **Nghĩa → từ**: thấy nghĩa tiếng Việt (+ chữ cái đầu), gõ từ | nhớ chủ động |
| 4 | **Điền vào ngữ cảnh**: câu gốc bị che từ, gõ từ vào | dùng đúng trong câu |
| 5 | **Đổi dạng** (EN): *decide → (n)?* gõ *decision* | word form |

- Chấm lại bằng engine đã có ở M4 (`src/lib/compare`): chỉ ra **lỗi chính tả** cụ thể (recieve → receive),
  với tiếng Trung chỉ ra **sai chữ đồng âm / sai thanh**.
- Buổi luyện ngắn (10–20 từ), ưu tiên từ mới thêm và từ hay gõ sai; có phím tắt, không cần chuột.
- "Thành thạo" = vượt mức 4 (EN thêm mức 5) ở hai buổi khác ngày → mới chuyển sang ôn SRS giãn cách (M6).

## 4. Word Form cho IELTS

### 4.1. Thẻ word family
Khi lưu một từ tiếng Anh, app hiện **cả họ từ** dạng lưới:

| Noun | Verb | Adjective | Adverb | Trái nghĩa / lưu ý |
|---|---|---|---|---|
| decision | decide | decisive | decisively | indecisive |
| economy, economist | economise | economic / economical | economically | ⚠ economic ≠ economical |

Mỗi ô có ví dụ ngắn. Người dùng có thể thêm các dạng khác vào sổ bằng một lần bấm.

### 4.2. Dạy quy tắc nhận diện (giải thích được, dùng lại trong gợi ý)
- **Hậu tố**: -tion/-sion/-ment/-ness/-ity/-ance → *n*; -ive/-ous/-al/-able/-ful/-ic → *adj*; -ly → *adv*;
  -ize/-ify/-en/-ate → *v*.
- **Vị trí trong câu** (quan trọng nhất cho IELTS): sau *a/the/tính từ* → **danh từ**; trước danh từ hoặc sau
  *be/seem/become* → **tính từ**; bổ nghĩa cho động từ/tính từ → **trạng từ**; sau *to*/động từ khuyết thiếu → **động từ**.
- Khi người dùng sai, gợi ý nói **vì sao**: *"Sau 'a' và trước '.', bạn cần một danh từ → decision."*

### 4.3. Danh sách "bẫy" (luyện riêng)
-ly nhưng là tính từ (*friendly, costly, likely*) · -al nhưng là danh từ (*arrival, approval, proposal*) ·
-ed/-ing (*bored/boring*) · cùng gốc khác nghĩa (*economic/economical, sensible/sensitive, historic/historical*) ·
một chữ nhiều loại (*increase, change, fast, hard*) · bất quy tắc (*die/death/dead, choose/choice, high/height*).

### 4.4. Bài tập
1. **Gap-fill có từ gốc trong ngoặc** (dạng đề IELTS/TOEIC): *"The government made a ___ (decide)."*
   Câu lấy từ bài học + ví dụ trong bảng word family.
2. **Hoàn thành lưới word family** (điền ô trống).
3. **Tìm lỗi**: *"She spoke confident."* → sửa thành *confidently*.
4. **Phân loại nhanh** n/v/adj/adv (có giờ).

### 4.5. Phát hiện lỗi word form ở Dictation
Thêm loại lỗi **`word_form`** vào engine chấm: khi người dùng gõ một **dạng khác của cùng họ từ**
(*economy* thay vì *economic*), báo "sai dạng từ" thay vì "sai từ" — rồi đưa vào phân tích điểm yếu (P2):
*"Bạn hay dùng danh từ ở chỗ cần tính từ (7 lần tuần này)."*

### 4.6. Nguồn dữ liệu
- Bảng dùng chung `word_families` + `word_family_members`: tôi soạn sẵn **~200 họ từ hay gặp trong IELTS**
  (đánh dấu cần người soát), admin thêm được.
- Từ chưa có trong bảng: hiện loại từ từ dictionaryapi.dev; về sau (P6) Gemini gợi ý họ từ → người dùng xác nhận.

## 5. Database (dự kiến)

| Bảng / cột | Nội dung |
|---|---|
| `vocabulary` + cột mới | `context_sentence` (câu gốc, giữ cả khi từ thêm tay), `my_sentence`, `collocations text[]`, `family_id`, `typing_level` (0–5), `typing_streak` |
| `word_families`, `word_family_members` | họ từ: thành viên, loại từ, IPA, nghĩa, ví dụ, ghi chú bẫy |
| `practice_attempts` | mỗi lần gõ/bài tập: từ, dạng bài, đáp án gõ, đúng/sai, loại lỗi — dùng lại cho phân tích (P2) |

## 6. Kế hoạch triển khai

| # | Nội dung |
|---|---|
| **M5** | Popup tra từ khi bấm vào từ trong bài & Dictation · nút Add · **Vocabulary Sheet** (bảng sửa trực tiếp, lọc, tìm, xuất/nhập CSV) · ngữ cảnh (câu gốc + nghe, câu tự đặt, collocations) · **Luyện gõ mức 1–4** |
| **M5b** | **Word Form**: bảng ~200 họ từ, thẻ family trong popup & sheet, luyện gõ mức 5, gap-fill / lưới / tìm lỗi / phân loại, danh sách bẫy, lỗi `word_form` trong Dictation |
| **M6** | Ôn SRS (flashcard) dùng chung dữ liệu và các dạng thẻ ở trên |
