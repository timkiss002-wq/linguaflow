# Triển khai LinguaFlow (Supabase Cloud + Vercel)

Thời gian: khoảng 20–30 phút. Cả hai dịch vụ đều có gói miễn phí đủ cho dự án cá nhân.

## 1. Supabase (database + đăng nhập)

1. Vào <https://supabase.com> → **New project**. Chọn region gần người dùng (ví dụ *Southeast Asia (Singapore)*),
   đặt mật khẩu database và lưu lại.
2. Trên máy của bạn, trong thư mục dự án:

   ```bash
   npx supabase login
   ```

   ```bash
   npx supabase link --project-ref <project-ref>
   ```

   (`project-ref` là đoạn mã trong URL dashboard: `https://supabase.com/dashboard/project/<project-ref>`.)

3. Đẩy toàn bộ schema (bảng, RLS, hàm) lên:

   ```bash
   npx supabase db push
   ```

4. Nạp dữ liệu dùng chung (chủ đề, 12 bài học mẫu, 104 họ từ IELTS): mở **SQL Editor** trên dashboard,
   dán nội dung file `supabase/seed.sql` và bấm **Run**. Chạy lại nhiều lần cũng không bị trùng.

5. **Authentication → URL Configuration**
   - *Site URL*: địa chỉ web của bạn, ví dụ `https://linguaflow.vercel.app`
   - *Redirect URLs*: thêm `https://linguaflow.vercel.app/**` (và `http://localhost:5173/**` nếu vẫn chạy local)

   Link xác nhận email và link **đặt lại mật khẩu** sẽ quay về các địa chỉ này
   (trang `/reset-password` của app).

6. **Authentication → Providers → Email**: mặc định bật *Confirm email*. Giữ nguyên là an toàn nhất;
   app đã xử lý màn hình "Check your inbox". Gói miễn phí giới hạn số email gửi mỗi giờ — khi có nhiều
   người dùng, cấu hình SMTP riêng ở **Authentication → Emails → SMTP Settings**.

7. **Project Settings → API**: copy **Project URL** và **anon / publishable key** cho bước 2.

8. Tự cấp quyền admin cho tài khoản của bạn (sau khi đã đăng ký trong app) — SQL Editor:

   ```sql
   update profiles set role = 'admin'
   where id = (select id from auth.users where email = 'ban@example.com');
   ```

## 2. Vercel (giao diện web)

1. Vào <https://vercel.com> → **Add New → Project** → chọn repo GitHub `linguaflow`.
2. Framework: **Vite** (tự nhận). Build command `npm run build`, output `dist` (mặc định).
3. **Environment Variables**:

   | Tên | Giá trị |
   |---|---|
   | `VITE_SUPABASE_URL` | Project URL ở bước 1.7 |
   | `VITE_SUPABASE_ANON_KEY` | anon / publishable key ở bước 1.7 |

4. **Deploy**. Mỗi lần push lên `main`, Vercel tự build lại; mỗi pull request có link xem thử riêng.
5. Định tuyến cho app một trang đã có sẵn trong `vercel.json` (Netlify/Cloudflare Pages dùng `public/_redirects`).

> Chỉ dùng **anon key** ở frontend. Không bao giờ đưa `service_role` / secret key vào biến môi trường của Vercel
> — mọi quyền truy cập dữ liệu đã được bảo vệ bằng Row Level Security.

## 3. Kiểm tra sau khi deploy

- [ ] Đăng ký tài khoản mới, nhận email xác nhận, đăng nhập được.
- [ ] "Forgot password?" gửi email; link mở trang `/reset-password` và đổi được mật khẩu.
- [ ] Explore Lessons hiện 12 bài; mở một bài, bấm nghe được (trình duyệt có giọng đọc).
- [ ] Dictation: kiểm tra một câu, tải lại trang vẫn giữ tiến độ.
- [ ] Bấm một từ → lưu vào Vocabulary; Review hiện thẻ mới.
- [ ] Word Forms có 104 họ từ.
- [ ] Đăng nhập tài khoản thứ hai: **không** thấy từ vựng / tiến độ của tài khoản đầu.

## 4. Góp ý bài viết bằng AI (tuỳ chọn)

Writing vẫn dùng được khi chưa làm bước này (phân tích tự động không cần AI); nút **Get AI feedback** sẽ báo
"AI feedback is not set up".

1. **Lấy API key Gemini miễn phí**: vào <https://aistudio.google.com/apikey> → *Create API key*. Gói miễn phí có giới
   hạn số lượt mỗi phút/ngày; Google có thể dùng dữ liệu gửi qua gói miễn phí để cải thiện sản phẩm (app đã báo cho
   người học và xin đồng ý trước lần dùng đầu).
2. **Đặt key làm secret của Supabase** (key chỉ nằm ở server, không bao giờ vào trình duyệt):

   ```bash
   npx supabase secrets set GEMINI_API_KEY=<key của bạn>
   ```

   Tuỳ chọn: `GEMINI_MODEL` (mặc định `gemini-2.5-flash` — kiểm tra tên model miễn phí hiện tại trong AI Studio),
   `WRITING_FEEDBACK_DAILY_LIMIT` (mặc định 5 lượt/người/24 giờ).
3. **Deploy function**:

   ```bash
   npx supabase functions deploy writing-feedback
   ```

4. Thử: viết một bài → **Get AI feedback** → đồng ý → sau 10–30 giây có điểm theo tiêu chí, các câu sửa kèm giải
   thích tiếng Việt và bản viết lại.

**Chạy ở máy local**:
- Cách 1: `npx supabase functions serve --env-file supabase/functions/.env` (cần Docker), app tự gọi
  `http://127.0.0.1:54321/functions/v1/writing-feedback`.
- Cách 2 (không cần image edge-runtime): chạy bằng Deno rồi trỏ app tới nó bằng `VITE_FUNCTIONS_URL=http://127.0.0.1:8000`
  trong `.env.local`:

  ```bash
  SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_ANON_KEY=<anon> SUPABASE_SERVICE_ROLE_KEY=<service_role> GEMINI_API_KEY=<key> deno run --allow-net --allow-env supabase/functions/writing-feedback/index.ts
  ```

## 5. Cập nhật về sau

- Thay đổi database: thêm file mới trong `supabase/migrations/` (không sửa file cũ), thử local bằng
  `npm run db:reset`, rồi `npx supabase db push`.
- Thêm bài học / họ từ: sửa `content/*.json` → `npm run seed:build` → chạy lại `supabase/seed.sql` trên SQL Editor.
- GitHub Actions (`.github/workflows/ci.yml`) chạy lint, typecheck, unit test, build và áp toàn bộ migration +
  seed lên Postgres sạch cho mỗi lần push.
