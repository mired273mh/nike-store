# Kết quả kiểm tra cuối — Website Nike Store

- Ngày: 09/11/2026.
- Production build: đạt.
- TypeScript: đạt.
- ESLint: 0 lỗi, 0 cảnh báo.
- PHP syntax: đạt.
- API: 80/80 ca đạt.
- Browser: 19/19 ca đạt.
- Tổng Playwright: **99/99**, không bỏ qua, không flaky; khoảng 185,2 giây.
- Launcher: **4/4** ca đạt, tách riêng khỏi Playwright.
- QR demo: đúng tổng tiền server, phân quyền, snapshot ngân hàng và hiển thị lại trong lịch sử.
- Email: xem trước, lời nhắn Admin, lịch sử gửi, mật khẩu mã hóa; PHPMailer gửi qua SMTP thử nghiệm local và ghi nhận lỗi không làm mất đơn.
- Chưa gửi thư Gmail thật; cần mật khẩu ứng dụng mới nhập riêng ở Admin.
- Kiểm thử ở database riêng `nike_store_test`; không thay dữ liệu chính.
- Import demo SQL được kiểm tra thực: 14 sản phẩm, 2 tài khoản demo, không đơn cá nhân.
- File `playwright-after.json` chứa kết quả từng ca.
- Ảnh minh chứng nằm trong `after/`.
- Lệnh tái chạy và giới hạn kiểm tra: README.md và REVIEW.md.
