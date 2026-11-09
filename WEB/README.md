# Website Nike Store

Bài tập nhóm Lập trình Web: website bán hàng với **backend PHP + MySQL**, frontend React/Next.js. Có trang khách hàng và quản trị, CRUD sản phẩm, upload nhiều ảnh, editor mô tả, phân trang, tài khoản và quản lý đơn hàng.

## Chạy trên Windows

**Chạy nhanh:** trong VS Code đã cài **Live Server (Five Server)**, bấm **Go Live** hoặc mở Command Palette và chọn **Five-Server: Start**. Cấu hình dự án sẽ khởi động Nike Store và chuyển trình duyệt vào website. Nếu vừa thêm cấu hình, bấm Stop rồi Go Live lại hoặc Reload Window một lần.

Ngoài VS Code, bấm đúp **`CHAY-WEB.cmd`** trong File Explorer. PHP/MySQL và thư viện được chuẩn bị tự động nếu chưa có; cần cài Node.js trước. Nếu website đang chạy, nút này mở lại website hiện tại và không tạo server trùng cổng.

Cần Node.js và mạng cho lần cài đầu. Mở PowerShell tại thư mục này:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/setup.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start.ps1
```

Mở **http://127.0.0.1:3000**. Script setup tải PHP/MySQL bản portable từ nguồn chính thức vào `%LOCALAPPDATA%/NikeStoreRuntime`, tạo database `nike_store`, tài khoản ứng dụng riêng và mật khẩu ngẫu nhiên trong file local được bỏ qua khi đóng gói. Không cài dịch vụ Windows hoặc thay đổi MySQL khác trên máy. API dùng localhost:8000, MySQL localhost:3307.

Chạy bản production để demo:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start.ps1 -Production
```

Khởi tạo lại schema không xóa dữ liệu. Cài mới sử dụng dữ liệu mẫu sạch; gói nộp bài không chứa dữ liệu cá nhân cũ.

## Tài khoản dữ liệu mẫu

| Vai trò | Email | Mật khẩu demo |
| --- | --- | --- |
| Admin | admin@premium.com | Admin123! |
| Khách hàng | user@premium.com | User123! |

Đây là tài khoản dùng để chấm/demo local. Mật khẩu ở database đã được băm. Với triển khai thực tế, đổi hoặc xóa các tài khoản mẫu trước khi mở cho người dùng.

## Chạy bằng PHP/MySQL có sẵn hoặc Linux

1. Cài PHP >=8.2 với `pdo_mysql`, `mbstring`, `fileinfo`, `openssl`; MySQL 8; Node.js >=22.
2. Tạo database utf8mb4 và tài khoản ứng dụng chỉ có quyền trên database đó. Sao chép `backend/.env.example` thành `backend/.env`, điền kết nối.
3. `php backend/database/init.php` để tạo schema và dữ liệu mẫu.
4. `php -S 127.0.0.1:8000 -t backend/public backend/public/router.php`.
5. Ở terminal khác: `npm ci`, `npm run build`, `npm run start`.

Cũng có thể import `backend/database/demo.sql` vào **database trống** bằng MySQL client/phpMyAdmin thay bước khởi tạo dữ liệu. File này chỉ chứa 14 sản phẩm và 2 tài khoản demo, không chứa đơn hoặc thông tin khách cũ.

Frontend proxy `/api` và `/uploads` sang PHP. Khi đổi origin API, cấu hình `PHP_API_ORIGIN` **trước khi build**, mặc định `http://127.0.0.1:8000`. `APP_ORIGINS` trong backend phải chứa đúng origin trình duyệt. Máy Windows dùng `backend/php.ini` và `-d extension_dir=<thư mục PHP/ext>` như trong script.

## Docker (tùy chọn)

Có `compose.yaml` cho MySQL + PHP + frontend. Cấu hình biến môi trường `MYSQL_ROOT_PASSWORD` và `NIKE_DB_PASSWORD` bằng mật khẩu riêng, rồi `docker compose up --build`. Truy cập localhost:3000. Volume giữ database và ảnh khi khởi động lại. Cấu hình này phục vụ demo local; kiểm thử thực chạy trong báo cáo dùng runtime Windows, không phải container.

## Chức năng

- Khách: tìm/lọc/sắp xếp, phân trang 9 sản phẩm/trang, xem nhiều ảnh, chọn size/màu, giỏ hàng lưu trên thiết bị, đăng ký/đăng nhập/đăng xuất, khôi phục mật khẩu bằng mã một lần, đặt COD và xem/hủy đơn hợp lệ.
- Admin: thêm/xem/sửa/xóa sản phẩm, giá/size/màu/tồn kho, editor định dạng, upload nhiều JPG/PNG/WebP, ẩn/hiện/xóa hàng loạt, quản lý trạng thái đơn, xác nhận đã thu tiền, doanh thu chỉ cộng đơn Paid chưa hủy.
- Đơn được tính giá tại PHP, khóa tồn kho trong transaction, không cho sửa userId/tổng tiền để vượt kiểm tra. Phiên server, cookie HttpOnly/SameSite, CSRF, kiểm tra Origin và phân quyền ở server.
- Thanh toán QR mặc định dùng **Nike Demo Bank**, số tài khoản `DEMO-000123456`: QR chứa thông tin đơn mô phỏng, **không chuyển tiền thật**. QR hiện sau đặt hàng và trong lịch sử đơn BANK chưa trả tiền/chưa hủy. Khi có ngân hàng thật, Admin cấu hình BIN/tài khoản để tạo VietQR; thông tin ngân hàng được chụp lại theo từng đơn. Chỉ Admin xác nhận đã thu sau khi kiểm tra giao dịch.

## Email và khôi phục mật khẩu

Mặc định local dùng `MAIL_TRANSPORT=file`: thư nằm trong `backend/storage/outbox/*.json`, chỉ người quản lý máy đọc được; không phục vụ qua web. Mã xác nhận ngẫu nhiên, hạn 10 phút, chỉ dùng một lần và khóa sau 5 lần sai.

Admin vào **Cấu hình QR & Email** để nhập email gửi, tài khoản SMTP và **mật khẩu ứng dụng mới của Gmail**. Chọn gửi thật qua SMTP, lưu rồi gửi email thử; Gmail dùng `smtp.gmail.com`, cổng `587`, TLS. Không nhập mật khẩu email vào chat hoặc source. Mật khẩu được mã hóa trong database; API không trả lại mật khẩu. Sao lưu riêng `backend/storage/mail.key` cùng database nếu cần chuyển cấu hình sang máy khác, không đưa khóa vào Git. Mật khẩu ứng dụng cũ từng xuất hiện trong tài liệu cần chủ tài khoản thu hồi tại Google.

Email tự tạo khi đặt hàng/cập nhật đơn. Trong danh sách đơn, Admin bấm **Xem / gửi email** để xem trước mẫu, thêm lời nhắn, gửi lại và xem lịch sử. Giao diện phân biệt gửi qua SMTP thành công, thư mô phỏng và gửi thất bại; lỗi SMTP không làm mất đơn đã đặt. SMTP chấp nhận thư không bảo đảm thư đã vào hộp thư đến; cần kiểm tra cả thư rác của người nhận.

Setup Windows tự cài PHPMailer theo Composer lock. Với máy đã setup trước đây, chạy `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/install-mail.ps1` nếu thiếu thư viện. Linux: chạy `composer install --working-dir=backend --no-dev`.

## Kiểm tra và kiểm thử

```powershell
npm run lint -- --max-warnings=0
npm run build
npm run typecheck
```

Bộ tự động dùng **database riêng `nike_store_test`**, không chỉnh dữ liệu demo chính. Terminal 1:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-servers.ps1
```

Sau khi frontend test ở cổng 3107 sẵn sàng, terminal 2:

```powershell
npm test
```

Có hai PHP process test (8001/8002) để kiểm tra mua đồng thời trên cùng MySQL. Browser dùng Chrome đã cài trên Windows; có thể đặt `PLAYWRIGHT_CHROMIUM_EXECUTABLE` hoặc cài Chromium bằng `npx playwright install chromium` trên máy khác. Không chạy nhiều bộ test đồng thời vì bộ kiểm thử reset database test. Kết quả JSON/ảnh ở `review-results/`, báo cáo HTML ở `playwright-report/`.

## Tài liệu và nộp bài

- `docs/SYSTEM-DESIGN.md`: yêu cầu, kiến trúc, ca sử dụng, phân quyền, trạng thái.
- `docs/DATABASE.md` và `backend/database/schema.sql`: ERD và schema.
- `docs/API.md`: hợp đồng API.
- `docs/TEAM.md`: thông tin thành viên/MSSV và đánh giá đóng góp **cần nhóm điền thực tế**.
- `docs/DEMO.md`: kịch bản demo và chuẩn bị nộp.
- `docs/Nike-Store-Slides.pptx`, `docs/Nike-Store-Slides.pdf`: slide; tạo lại bằng `npm run docs`.
- `REVIEW.md`: kết quả review và kiểm thử của bản hoàn thiện.

Frontend chỉ render và proxy; nghiệp vụ ở `backend/src/`. Dữ liệu runtime, credential, phiên đăng nhập và thư nằm ngoài source nộp bài. Source không bao gồm node_modules/runtime binary; README cung cấp cách cài và chạy.
