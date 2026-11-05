# LinguaFlow — Phân tích & Kiến trúc (Milestone 0)

## Quyết định M3: bỏ video

Theo yêu cầu (04/11/2026), sản phẩm **không dùng video** nữa vì cắt câu và căn thời gian cho
video quá tốn công. Thay vào đó:

- **Bài học = danh sách câu** (`lessons`, `lesson_sentences`). Audio do **text-to-speech của trình
  duyệt** đọc, nên câu chữ và âm thanh luôn khớp 100%, không cần timestamp, không lưu file.
- Nội dung nằm trong `content/lessons.json` → `npm run seed:build` sinh `supabase/seed.sql`.
- Migration `20261104120000_lessons_without_video.sql` đổi tên bảng/cột (videos → lessons,
  video_segments → lesson_sentences, bỏ cột thời gian và YouTube, xoá bảng `transcripts`).
- Các phần bên dưới nói về video/YouTube/segment là **thiết kế ban đầu**, giữ lại để tham khảo;
  "segment" nay là "sentence", "Video Library" nay là "Lessons".


> *Learn languages through the videos you love.*

Tài liệu này là bước "thiết kế trước khi code". Mọi milestone sau sẽ bám theo đây; khi có thay đổi
quyết định, cập nhật file này trước.

---

## 1. Phân tích yêu cầu

### 1.1. Người dùng & vai trò

| Vai trò | Làm được gì |
|---|---|
| **Khách (anon)** | Xem Landing page, danh sách chủ đề. Không vào được phòng học. |
| **Learner** | Thư viện, Dictation Room, sổ từ vựng, ôn tập SRS, dashboard. Chỉ thấy dữ liệu của chính mình. |
| **Admin** | Như learner + thêm/sửa video, transcript, segment, từ điển dùng chung. |

Admin chỉ là một cột `role` trong `profiles`, cấp thủ công bằng SQL. Không làm UI phân quyền ở MVP.

> Cập nhật: video đã bỏ ở M3 nên phần quản lý video/segment (M9) không làm. Thay vào đó có trang **Admin → Content**
> (`/admin`): bật/tắt bài học, duyệt câu hỏi level test (kèm tỉ lệ làm đúng, cảnh báo câu quá dễ/khó), bật/tắt đề
> Writing, xem lượt dùng AI. Nội dung chữ vẫn sửa trong `content/*.json` để mọi thay đổi được review qua git.

### 1.2. Luồng giá trị cốt lõi (phải chạy tốt nhất)

```
Chọn video → Dictation Room → nghe 1 segment → gõ → Check → xem lỗi
     ↑                                   ↓ click vào từ
 Dashboard ← SRS Review ← Vocabulary Notebook ← lưu từ
```

Nếu chỉ kịp làm một thứ, đó là **Dictation Room + chấm điểm**. Mọi thứ khác xoay quanh nó.

### 1.3. Những ràng buộc thực tế (cần nói rõ trước)

| Vấn đề | Thực tế | Cách xử lý |
|---|---|---|
| Phim bản quyền ("Khi Anh Chạy Về Phía Em", "Khó Dỗ Dành") | Không được tải/cắt/lưu lại. | Chỉ **nhúng** bằng YouTube IFrame từ kênh chính thức (nếu kênh cho phép nhúng). App **không bao giờ** tải video về. Transcript do admin nhập hoặc import từ file SRT mà họ có quyền dùng. |
| Video bị chặn nhúng | YouTube trả lỗi `101`/`150` khi chủ kênh tắt embed; lỗi `100` khi video bị xoá/riêng tư. | Bắt sự kiện `onError`, hiện thông báo rõ ràng + link mở trên YouTube. Không giả vờ phát. |
| Lấy transcript tự động từ YouTube | Không có API chính thức công khai cho phụ đề của video người khác. | **Không** làm scraping. Admin nhập tay hoặc import SRT/VTT. |
| Nghĩa tiếng Việt của từ | Không có API từ điển Anh–Việt / Trung–Việt miễn phí, ổn định. | Bảng `dictionary_entries` dùng chung (admin/seed nhập). Nếu không có: popup cho phép **người dùng tự nhập nghĩa**, ghi rõ "chưa có trong từ điển". Phase 3 dùng AI để gợi ý. |
| IPA tiếng Anh | [dictionaryapi.dev](https://dictionaryapi.dev) miễn phí, có IPA + audio, nhưng nghĩa là tiếng Anh. | Dùng để điền sẵn IPA/loại từ/ví dụ. Có cache & xử lý lỗi khi API sập. |
| Pinyin | Thư viện `pinyin-pro` chạy offline trong trình duyệt, khá chính xác. | Tự sinh pinyin. Với chữ đa âm (多音字) sai, admin ghi đè bằng cột `video_segments.pinyin`. |
| Tách từ tiếng Trung | `Intl.Segmenter('zh', {granularity:'word'})` có sẵn trong Chrome/Edge/Safari/Firefox mới. | Dùng để tách từ khi click vào transcript. Không cần server. |
| Audio phát âm | Web Speech API (`speechSynthesis`) có giọng `zh-CN`, `en-US` trên hầu hết máy. | Dùng miễn phí. Nếu máy không có giọng → ẩn nút loa, không báo lỗi giả. |

### 1.4. Phân loại tính năng

**Làm ngay được, không cần API ngoài:** Auth, thư viện, YouTube player, Dictation Room, chấm điểm
EN/ZH, pinyin, sổ từ vựng, SRS, flashcard, TTS, dashboard, streak, import SRT/VTT.

**Cần dịch vụ ngoài (đã có phương án dự phòng):**
- Supabase project (bạn tạo, miễn phí) — bắt buộc.
- dictionaryapi.dev cho IPA tiếng Anh — tuỳ chọn, có fallback nhập tay.

**Cần API trả phí / để Phase 3:** AI giải thích ngữ pháp, tạo bài tập, gợi ý nghĩa tiếng Việt,
đề xuất video (Claude API qua Supabase Edge Function để không lộ key).

---

## 2. Kiến trúc

### 2.1. Lựa chọn công nghệ

| Lớp | Chọn | Lý do |
|---|---|---|
| Build | **Vite + React 18 + TypeScript** | SPA đủ dùng; Supabase lo backend nên không cần SSR của Next.js. Build ra file tĩnh, deploy ở đâu cũng được. |
| UI | **Tailwind CSS + shadcn/ui + Lucide** | Theo yêu cầu. shadcn copy component vào repo → tự sửa được. |
| Routing | **React Router v6** | Chuẩn, đơn giản. |
| Data fetching | **TanStack Query** | Cache, loading/error state, invalidate sau mutation — tránh tự viết. |
| Form & validation | **react-hook-form + Zod** | Một schema Zod dùng cho cả form và kiểm tra dữ liệu trước khi gửi. |
| Biểu đồ | **Recharts** | Nhẹ, đủ cho biểu đồ cột/đường. |
| Backend | **Supabase** (Postgres, Auth, Storage, RLS, RPC) | Không cần viết server riêng. |
| Test | **Vitest** | Test các phần logic thuần: chấm điểm, SRS, parse SRT/VTT. |

### 2.2. Sơ đồ tổng thể

```
┌────────────────────────── Browser (React SPA) ──────────────────────────┐
│  pages/  ──►  features/*  ──►  lib/ (logic thuần, có unit test)          │
│                  │              ├─ compare/   chấm điểm EN/ZH            │
│                  │              ├─ srs/       SM-2                        │
│                  │              ├─ subtitles/ parse SRT/VTT              │
│                  │              └─ player/    adapter YouTube | HTML5    │
│                  ▼                                                       │
│        features/*/api.ts  (gọi Supabase qua TanStack Query)              │
└──────────────────┬──────────────────────────────────────────────────────┘
                   │ supabase-js (JWT của user)
┌──────────────────▼──────────── Supabase ────────────────────────────────┐
│ Auth │ Postgres + RLS │ RPC: record_review, get_dashboard_stats, streak │
│      │ Views: video_catalog, user_video_progress, daily_activity       │
│ Storage: bucket "videos" (chỉ video được phép dùng, chỉ admin upload)   │
└─────────────────────────────────────────────────────────────────────────┘
        YouTube IFrame API ◄── nhúng trực tiếp, không qua server
        dictionaryapi.dev  ◄── IPA tiếng Anh (tuỳ chọn)
```

### 2.3. Các quyết định quan trọng

**a) Player adapter.** Dictation Room không biết video đến từ đâu. Nó dùng một interface chung:

```ts
interface MediaPlayer {
  play(): void; pause(): void;
  seekTo(seconds: number): void;
  getCurrentTime(): number;
  setPlaybackRate(rate: 0.5 | 0.75 | 1 | 1.25): void;
  setVolume(0..100): void;
  onStateChange(cb): Unsubscribe;
  onError(cb: (e: PlayerError) => void): Unsubscribe; // embed_blocked | not_found | network
}
```
Có 2 cài đặt: `YouTubePlayer` (IFrame API) và `Html5Player` (`<video>` cho file upload).

**b) Phát đúng segment.** YouTube không có sự kiện "đến giây X". Hook `useSegmentPlayback` sẽ
`seekTo(start)` → play → kiểm tra `getCurrentTime()` mỗi ~50ms bằng `requestAnimationFrame`; khi
`>= end - 0.05` thì pause (hoặc seek về `start` nếu bật Loop). Kiểm tra theo `≥ end` thay vì
`== end` nên không bị lỡ khi đổi tốc độ phát.

**c) Chấm điểm (phần quan trọng nhất).** Logic thuần trong `lib/compare`, có unit test.

*Tiếng Anh* — so sánh theo **từ**:
1. Chuẩn hoá: lowercase, gộp khoảng trắng, đổi nháy cong `’` → `'`, tách dấu câu thành token riêng.
2. Căn hai dãy token bằng thuật toán edit distance (Levenshtein trên token) có truy vết.
3. Phân loại từng vị trí:
   - `correct` — khớp.
   - `missing` — có trong đáp án, người dùng bỏ sót.
   - `extra` — người dùng gõ thừa.
   - `misspelled` — thay thế, nhưng giống ≥ 70% theo ký tự (vd. *recieve* / *receive*) → **lỗi chính tả**.
   - `wrong_word` — thay thế, khác hẳn (vd. *walk* / *work*) → **nghe nhầm từ**.
   - `punctuation` — chỉ khác dấu câu (bỏ qua nếu người dùng tắt chấm dấu câu).
4. Accuracy = số từ đúng / số từ trong đáp án. Câu được tính **đúng** khi không còn lỗi nào (trừ dấu câu nếu đang bỏ qua).

*Tiếng Trung* — so sánh theo **chữ Hán** (vì người học gõ bằng IME, không có khoảng trắng):
1. Chuẩn hoá: bỏ khoảng trắng, đổi dấu câu full-width ↔ half-width (`，` ↔ `,`), có thể bỏ qua dấu câu.
2. Căn theo ký tự bằng Levenshtein.
3. Với mỗi chữ bị **thay thế**, so pinyin (bỏ thanh điệu) bằng `pinyin-pro`:
   - Cùng pinyin, khác chữ (的/得, 在/再, 他/她) → `wrong_character` = **lỗi viết chữ Hán** (nghe đúng, chọn sai chữ).
   - Khác pinyin → `misheard` = **lỗi nhận diện nội dung** (nghe sai).
4. Hiển thị đáp án kèm pinyin phía trên mỗi chữ (`<ruby>`), bật/tắt được.

Kết quả trả về dạng `DiffToken[]` để UI tô màu và tổng hợp thống kê lỗi lưu vào `dictation_attempts.error_summary`.

**d) Hint.** Mỗi lần nhấn Hint lộ thêm **một từ (EN) / một chữ (ZH)** tiếp theo mà người dùng
chưa gõ đúng. Số lần hint được lưu lại và trừ vào điểm "hoàn hảo" (không trừ accuracy).

**e) SRS — biến thể SM-2 (giống Anki, dễ giải thích):**

| Nút | Thẻ mới / đang học (`repetitions = 0`) | Thẻ đang ôn |
|---|---|---|
| Again | due sau 10 phút, `lapses+1`, `repetitions=0`, `ease −0.20` | như bên trái |
| Hard | 1 ngày | `interval × 1.2`, `ease −0.15` |
| Good | 1 ngày → lần sau 3 ngày | `interval × ease` |
| Easy | 4 ngày, `ease +0.15` | `interval × ease × 1.3`, `ease +0.15` |

`ease` tối thiểu 1.30, khởi tạo 2.50. Trạng thái tự suy ra:
`new` (chưa ôn lần nào) → `learning` (interval < 1 ngày hoặc vừa Again) → `reviewing` → `mastered`
(interval ≥ 21 ngày). Thuật toán viết **bằng TypeScript** (thuần, có test, còn dùng để hiện
"10m / 1d / 3d / 8d" trên mỗi nút). Việc ghi dữ liệu đi qua RPC `record_review` để cập nhật thẻ +
ghi log trong **một transaction**. Tất cả hằng số nằm trong `src/lib/srs/config.ts`. Ngoài SM-2 còn có chế độ **khoảng cách cố định** (mặc định 1/3/7/30 ngày như sheet của người dùng), chọn trong Settings (thêm ở M6).

**f) Thời gian học & streak.** Bảng `study_sessions` ghi thời gian **thực sự học** (đếm khi tab
đang hiển thị và có tương tác trong 60s gần nhất, gửi heartbeat mỗi 30s). Streak tính theo
múi giờ của người dùng (mặc định `Asia/Ho_Chi_Minh`) trong hàm SQL `get_learning_streak()`.

---

## 3. Database

File đầy đủ, đã chạy thử: [`supabase/migrations/20261103000000_init.sql`](../supabase/migrations/20261103000000_init.sql).

### 3.1. Sơ đồ quan hệ

```
auth.users 1─1 profiles
                 │
topics 1─n videos 1─n transcripts 1─n video_segments
             │  │                          │
             │  └──────────── 1─n ─────────┘ (video_segments.video_id)
             │
  profiles ──┼── n─n favorites
             ├── 1─1 learning_progress   (theo cặp user × video)
             ├── 1─n study_sessions
             │
video_segments 1─n dictation_attempts n─1 profiles
video_segments 1─n vocabulary (nguồn, có thể null) n─1 profiles
vocabulary 1─n vocabulary_reviews
dictionary_entries (dùng chung, chỉ admin ghi)
```

### 3.2. Bảng và lý do

| Bảng (yêu cầu) | Tên thực tế | Ghi chú |
|---|---|---|
| users | `profiles` | `auth.users` do Supabase quản lý; `profiles` lưu tên, role, múi giờ, cài đặt học (`settings` jsonb: tốc độ mặc định, bỏ qua dấu câu, hiện pinyin, auto-next). Tự tạo bằng trigger khi đăng ký. Người dùng **không** tự sửa được cột `role` (phân quyền theo cột). |
| videos | `videos` | `hsk_level` (1–6, chỉ cho video tiếng Trung, thêm ở M2). Nguồn: `youtube` / `upload` / `external_url`, có CHECK đảm bảo đủ trường theo nguồn. `license_note` ghi rõ nguồn được phép. `is_sample` đánh dấu dữ liệu demo. |
| transcripts | `transcripts` | Một **phiên bản** transcript của video (manual/srt/vtt, file gốc). Chỉ 1 bản `is_active` mỗi video (unique partial index). |
| video_segments | `video_segments` | `start_time`, `end_time` (giây, 3 chữ số thập phân), `text`, `pinyin` ghi đè, `translation_vi`, `difficulty`. Ràng buộc `end > start`, `unique(video_id, position)`. |
| dictation_attempts | `dictation_attempts` | Mỗi lần Check. Lưu input, accuracy, đúng/sai, tóm tắt lỗi (jsonb), hint, reveal, skip, thời gian. |
| vocabulary | `vocabulary` | Từ của user + **trạng thái SRS** (ease, interval, due_at…) trên cùng một dòng (1 từ = 1 thẻ). Unique theo `(user, ngôn ngữ, từ đã chuẩn hoá)` → không lưu trùng. |
| vocabulary_reviews | `vocabulary_reviews` | Log mỗi lần ôn (rating, interval trước/sau). Dùng cho thống kê và cải tiến thuật toán sau này. |
| learning_progress | `learning_progress` | Trạng thái học từng video + vị trí segment đang dở. |
| favorites | `favorites` | Khoá chính `(user_id, video_id)`. |
| *(thêm)* topics | `topics` | 7 chủ đề, dùng bảng thay vì enum để thêm chủ đề không cần migration. |
| *(thêm)* study_sessions | `study_sessions` | Cần cho tổng thời gian học, biểu đồ theo ngày, streak. |
| *(thêm)* dictionary_entries | `dictionary_entries` | Từ điển dùng chung để popup có nghĩa tiếng Việt. |

### 3.3. Tránh trùng lặp dữ liệu

- **Ngôn ngữ** chỉ lưu ở `videos`. Segment lấy ngôn ngữ qua join (view `video_catalog`).
- **Số câu, số từ** của video **không lưu** — tính trong view `video_catalog`.
- **Số segment đã hoàn thành** không lưu — tính từ `dictation_attempts` trong view `user_video_progress`.
- **Câu gốc chứa từ** không copy — `vocabulary.source_segment_id` trỏ tới segment.
- Ngoại lệ có chủ đích: `vocabulary_reviews.user_id` — cần cho RLS nhanh; nhất quán được đảm bảo
  bằng foreign key ghép `(vocabulary_id, user_id) → vocabulary(id, user_id)`.

### 3.4. Row Level Security

| Bảng | SELECT | INSERT/UPDATE/DELETE |
|---|---|---|
| topics | mọi người | admin |
| videos, transcripts, video_segments | video đã `is_published` hoặc admin | admin |
| dictionary_entries | đã đăng nhập | admin |
| profiles | chính mình | UPDATE chính mình (trừ `role`) |
| favorites, learning_progress, study_sessions, dictation_attempts, vocabulary, vocabulary_reviews | `user_id = auth.uid()` | `user_id = auth.uid()` |

Các view đều `security_invoker = true` nên RLS của bảng gốc vẫn áp dụng.

---

## 4. Cấu trúc thư mục

```
linguaflow/
├── docs/ARCHITECTURE.md
├── supabase/
│   ├── migrations/            # SQL schema, đánh số theo thời gian
│   └── seed.sql               # dữ liệu demo (is_sample = true)
├── src/
│   ├── app/                   # router.tsx, providers.tsx, AppLayout (sidebar)
│   ├── pages/                 # 1 file / route, mỏng, chỉ ghép feature
│   │   ├── LandingPage.tsx  LoginPage.tsx  RegisterPage.tsx
│   │   ├── DashboardPage.tsx  LibraryPage.tsx  VideoDetailPage.tsx
│   │   ├── DictationPage.tsx  VocabularyPage.tsx  ReviewPage.tsx
│   │   └── StatisticsPage.tsx  SettingsPage.tsx
│   ├── features/
│   │   ├── auth/              # AuthProvider, RequireAuth, form
│   │   ├── library/           # VideoCard, Filters, api.ts (useVideos, useToggleFavorite)
│   │   ├── player/            # VideoPlayer, PlayerControls, useSegmentPlayback
│   │   ├── dictation/         # DictationPanel, DiffView, SessionSummary, useDictationSession
│   │   ├── vocabulary/        # WordPopover, VocabTable, VocabForm, api.ts
│   │   ├── review/            # Flashcard, RatingButtons, useReviewQueue
│   │   ├── dashboard/         # StatCard, StudyTimeChart
│   │   └── admin/             # (Phase 2) VideoForm, SegmentEditor, SubtitleImport
│   ├── lib/                   # Logic thuần, KHÔNG import React/Supabase → dễ test
│   │   ├── compare/           # english.ts, chinese.ts, align.ts, *.test.ts
│   │   ├── srs/               # sm2.ts, config.ts, sm2.test.ts
│   │   ├── subtitles/         # srt.ts, vtt.ts, *.test.ts
│   │   ├── player/            # MediaPlayer interface, youtube.ts, html5.ts
│   │   ├── chinese/           # pinyin.ts, segment.ts (Intl.Segmenter)
│   │   └── supabase.ts        # client + type sinh tự động
│   ├── components/ui/         # shadcn/ui
│   ├── types/database.ts      # `supabase gen types typescript`
│   └── main.tsx
├── .env.example               # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
└── README.md
```

Quy tắc: `pages` → `features` → `lib`. `lib` không phụ thuộc ngược lên. Mỗi file < ~250 dòng.

---

## 5. Milestones

Mỗi milestone kết thúc bằng: chạy được, có test cho phần logic, tôi giải thích kết quả, bạn xác nhận rồi mới sang bước sau.

### Phase 1 — MVP

| # | Milestone | Hoàn thành khi |
|---|---|---|
| **M0** | Phân tích, kiến trúc, schema DB *(tài liệu này)* | Schema chạy được trên Postgres 16, RLS đã kiểm tra. |
| **M1** | Khởi tạo dự án + Auth + Layout | Vite/TS/Tailwind/shadcn chạy; đăng ký/đăng nhập/đăng xuất thật với Supabase; route được bảo vệ; sidebar responsive; seed demo. |
| **M2** | Video Library + Video Detail | Tìm kiếm, lọc theo ngôn ngữ/chủ đề/trình độ, yêu thích, hiển thị tiến độ; trang chi tiết liệt kê segment. |
| **M3** | Player engine | Adapter YouTube + HTML5; phát đúng segment, lặp, tua lại 3s, tốc độ, âm lượng, prev/next, auto-next; báo lỗi khi video bị chặn nhúng. |
| **M4** | Dictation Room + chấm điểm | Bố cục 2 cột; Check/Hint/Skip/Show Answer/Next; diff EN & ZH có unit test; lưu attempt; thanh tiến độ; màn hình tổng kết; phím tắt. |
| **M5** | Vocabulary Notebook | Click từ trong transcript → popup (IPA/pinyin, nghĩa, loại từ, câu gốc) → lưu; trang quản lý: tìm, lọc theo 4 trạng thái, sửa, xoá. |
| **M6** | SRS + Flashcard Review | SM-2 có test; Due Today, Upcoming; flashcard Reveal → 4 nút; TTS; cập nhật lịch qua RPC. |
| **M7** | Dashboard + Landing + hoàn thiện | Số liệu thật từ DB, streak, biểu đồ tuần, chuyển EN/ZH; Landing page; README cài đặt & deploy. |

### Phase 2
- **M8** Learning Statistics chi tiết (lỗi hay gặp, accuracy theo thời gian, heatmap).
- **M9** Admin: quản lý video/segment, bắt thời gian segment ngay trên player, import SRT/VTT.
- **M10** Upload video vào Supabase Storage (chỉ nội dung được phép), cải thiện pinyin/audio, tuỳ chỉnh SRS (có thể thêm FSRS).

### Cá nhân hoá & Writing (đề xuất)
Xem [PERSONALIZATION.md](PERSONALIZATION.md): milestones P1–P6 (hồ sơ học tập, mô hình năng lực,
placement test, lộ trình hằng ngày, Writing, góp ý AI).

### Phase 3
- **M11** AI Assistant qua Supabase Edge Function + Claude API: giải thích ngữ pháp/từ trong ngữ cảnh, phân tích lỗi nghe hay gặp, tạo ví dụ & bài kiểm tra, đề xuất video theo trình độ.

---

## 6. Dữ liệu mẫu — nguyên tắc

- Mọi video demo có `is_sample = true`, hiển thị nhãn **"Demo"** trên UI.
- Tôi **không bịa** YouTube ID hay timestamp cho phim Trung Quốc. Seed demo sẽ dùng video YouTube mà
  bạn xác nhận (hoặc bạn gửi link từ kênh chính thức + transcript), sau đó kiểm tra lại timestamp
  bằng công cụ admin ở M9 (trước đó bằng SQL).
- Dữ liệu người dùng (từ vựng, tiến độ, attempt) **không bao giờ** seed sẵn — luôn là dữ liệu thật
  phát sinh khi dùng.
