# Review sau hoàn thiện — Website Nike Store

Ngày kiểm tra: 09/11/2026. Đối chiếu `Bai tap nhom (2).pdf`. Thư mục dự án chỉ giữ báo cáo và kết quả của bản hoàn thiện.

**Phần kỹ thuật đã được hoàn thiện theo phạm vi website bán hàng trong đề và vượt qua toàn bộ 82 ca kiểm thử đã chạy.** Đây là kết luận dựa trên môi trường và ca kiểm tra bên dưới; không phải bảo đảm điểm chấm tuyệt đối hoặc khẳng định phần thông tin nhóm chưa cung cấp đã hoàn tất.

## Đối chiếu yêu cầu

| Yêu cầu | Bản hiện tại | Minh chứng |
| --- | --- | --- |
| Website bán hàng cơ bản | Nike Store: danh mục, chi tiết, size/màu, giỏ, đơn | Luồng UI đặt COD và lịch sử đơn |
| Backend PHP + MySQL | Toàn bộ auth, CRUD, upload, đơn hàng, tính giá và persistence ở PHP/PDO/MySQL | `backend/src/`, `/api/health`, schema SQL |
| Frontend tùy ý | React/Next.js chỉ render và proxy sang PHP | `next.config.ts`, `src/lib/db.ts` không còn ghi JSON |
| Trang người dùng và Admin | Có hai nhóm màn hình, quyền xác thực tại server | Test giả role/cookie và truy cập trái phép đều bị từ chối |
| CRUD nội dung | Thêm/xem/sửa/xóa sản phẩm đầy đủ; ẩn/hiện và thao tác hàng loạt | API và browser test CRUD, giữ snapshot đơn khi xóa |
| Giao diện hiện đại/responsive | Giữ phong cách Nike; menu/filter mobile; form Admin trên mobile | Test 390px, 768px, 1440px; ảnh trong `review-results/after/` |
| Đăng nhập/đăng xuất/phân quyền | Phiên ngẫu nhiên lưu hash MySQL; logout server; không tin localStorage | Cookie cũ bị thu hồi; hash mật khẩu; CSRF/Origin |
| Tính năng nâng cao | Phân trang khách/Admin/đơn; upload nhiều ảnh; editor mô tả | Multipart 2 ảnh và thao tác editor thật trên browser |
| Thiết kế hệ thống và database | Đã có tài liệu, sơ đồ kiến trúc, ERD, luồng trạng thái, mô tả bảng/API | `docs/SYSTEM-DESIGN.md`, `docs/DATABASE.md`, `docs/API.md` |
| Slide báo cáo | 14 slide PPTX + PDF + HTML, có notes thuyết trình | `docs/Nike-Store-Slides.*` |
| Đánh giá đóng góp thành viên | Đã có mẫu bảng, chưa có tên/MSSV và đóng góp thực tế | Nhóm cần điền `docs/TEAM.md` và slide tương ứng |
| Source và dữ liệu mẫu | Source, schema, clean demo SQL, hướng dẫn chạy và test | `README.md`, `backend/database/demo.sql`, gói ZIP |
| Link deploy nếu có | Bản production local; có cấu hình Docker để tự triển khai | Localhost không được ghi là deploy công khai |

## Kết quả kiểm tra cuối

| Kiểm tra | Kết quả |
| --- | --- |
| Production build | Thành công |
| TypeScript `tsc --noEmit` | Thành công |
| ESLint `--max-warnings=0` | 0 lỗi, 0 cảnh báo |
| PHP syntax | Toàn bộ file PHP backend và test helper hợp lệ |
| HTTP/API | **67/67 đạt** |
| Browser Chrome/Playwright | **15/15 đạt** |
| Tổng test tự động | **82 đạt, 0 lỗi, 0 bỏ qua, 0 flaky**, khoảng 56,3 giây |
| Import SQL mẫu độc lập | Thành công: 14 sản phẩm, 2 tài khoản demo, 0 đơn cá nhân |

Log máy đọc được: `review-results/playwright-after.json`; log kiểm tra trong các file `build-after.txt`, `types-after.txt`, `lint-after.txt`, `php-lint.txt`. Có thể chạy lại qua hướng dẫn README. Ảnh giao diện và ảnh bìa slide nằm trong `review-results/after/`.

Runtime thực chạy: Windows, PHP 8.4.27, MySQL 8.4.13, Node.js 26.13.0, Next.js 16.2.6. Frontend test cổng 3107, hai PHP process 8001/8002 cùng kết nối `nike_store_test` để kiểm tra mua hàng đồng thời. Production local cổng 3000, API 8000, MySQL 3307.

## Các lỗi ban đầu đã xử lý

- Đổi backend Next.js/JSON sang PHP + MySQL. Source JSON sản phẩm chỉ dùng để seed; không còn database JSON runtime.
- Bổ sung Create/Update đầy đủ cho sản phẩm, upload và editor. Xóa hết sản phẩm không tự tái tạo seed.
- Bỏ cookie `mock-token-*`; dùng token ngẫu nhiên, băm token trong DB, xoay phiên sau đăng nhập.
- Logout thu hồi phiên và xóa cookie HttpOnly; cookie bị phát lại không truy cập được đơn.
- Bỏ quyền từ `userId` URL/body và role localStorage. Khách chỉ đọc/cập nhật đơn được phép của mình.
- Tính giá/phí/tổng đơn ở server; kiểm tra sản phẩm, size, màu, số lượng nguyên, tồn kho và phương thức thanh toán.
- Transaction/khóa hàng chống mua vượt tồn; hủy hoàn đúng một lần và giữ trạng thái ẩn do Admin đặt.
- Kiểm soát từng trường trạng thái/thanh toán; không cho khách tự trả Paid, nhảy Delivered hay hủy đơn đã thanh toán.
- Mật khẩu được băm; mã reset ngẫu nhiên, hash, có hạn/giới hạn thử/một lần dùng; thu hồi phiên sau reset.
- Bổ sung CSRF, Origin, throttle, kiểm tra ảnh thật, sanitize editor, optimistic version và audit logs.
- Doanh thu chỉ cộng đơn đã thu tiền và chưa hủy; sửa thời gian MySQL về UTC.
- Giá bộ lọc lấy từ dữ liệu hiện hành; sửa liên kết chiến dịch hỏng; ảnh chính lưu local và ghi rõ minh họa.
- Sửa lỗi HTML mô tả gây hydration; kiểm thử JavaScript runtime không còn lỗi trong các luồng đã chạy.
- Bỏ credential SMTP khỏi README và `.env` frontend. Không đưa secret, import cũ hoặc outbox vào gói source.

## Dữ liệu và phạm vi bàn giao

Đã sao lưu source và dữ liệu ban đầu ra `%LOCALAPPDATA%/NikeStoreBackup-20261109-120632` trước khi sửa. Bản MySQL chính giữ **14 sản phẩm, 2 tài khoản, 7 đơn cũ**; mật khẩu đã chuyển sang hash. Tài khoản demo được chuẩn hóa thành `admin@premium.com / Admin123!` và `user@premium.com / User123!`. Kiểm thử chỉ tạo/xóa dữ liệu ở database test.

Có file `backend/database/demo.sql` chỉ chứa seed sản phẩm và tài khoản demo tổng hợp, không chứa đơn/khách cũ. Gói source không kèm `.env`, runtime binary, dữ liệu import, sessions, OTP, outbox, uploads cá nhân hoặc node_modules.

## Những việc cần thông tin hoặc dịch vụ bên ngoài

1. Nhóm điền tên/MSSV, lớp, giảng viên và đánh giá đóng góp thực tế; phần thuyết trình phải do nhóm chuẩn bị và thực hiện. Chỉ tên đề tài Website Nike Store đã được người dùng xác nhận.
2. Chủ tài khoản cần **thu hồi mật khẩu ứng dụng email cũ đã từng lộ** tại nhà cung cấp. Việc xóa khỏi source không thu hồi credential đó. Chưa thực hiện thao tác tài khoản ngoài.
3. SMTP gửi thư thật và tài khoản ngân hàng cần cấu hình riêng nếu muốn sử dụng. Mặc định local dùng thư file và COD, không giả lập đã trả tiền.
4. Chưa kiểm thử SMTP/cổng thanh toán/giao vận thật hoặc một triển khai public. Docker được cung cấp nhưng chưa chạy kiểm thử container vì Docker daemon trên máy không hoạt động. Các yêu cầu kỹ thuật được kiểm thử bằng runtime PHP/MySQL thật trên Windows.

Các mục trên được ghi rõ thay vì gán trạng thái “100% toàn bộ bài” khi chưa có đủ bằng chứng. Phần chức năng trong phạm vi đã xác định và toàn bộ ca kiểm thử hiện tại đã đạt.
