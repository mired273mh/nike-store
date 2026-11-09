# API PHP

Mọi phản hồi JSON UTF-8. Lỗi dạng `{ "message": "..." }`. Token chỉ ở cookie HttpOnly. Các thao tác ghi cần header `X-CSRF-Token` lấy từ `GET /api/auth/session` và cùng origin được cấu hình. Đăng nhập/đăng ký/reset thành công có thể xoay token CSRF trong header trả về.

| Method | Đường dẫn | Quyền / hành vi |
| --- | --- | --- |
| GET | /api/health | Trạng thái PHP/MySQL |
| GET | /api/settings | Cấu hình ngân hàng công khai, không có secret |
| GET | /api/auth/session | User hiện tại hoặc null; tạo phiên biểu mẫu; csrfToken |
| POST | /api/auth/register | name, email, password (8–72 byte) |
| POST | /api/auth/login | email, password |
| POST | /api/auth/logout | Thu hồi phiên và xóa cookie |
| POST | /api/auth/reset-password | email + checkEmailOnly=true để gửi mã; email + otp + newPassword để đổi |
| GET | /api/products | Danh sách đang bán; category, search, sort |
| GET | /api/products?page=1&perPage=9 | Trả products, total, page, perPage, totalPages; perPage tối đa 48 |
| GET | /api/products?includeHidden=1 | Admin xem cả hàng ẩn |
| GET | /api/products/:id | Chi tiết; hàng ẩn/hết kho không hiển thị cho khách |
| POST | /api/products | Admin thêm sản phẩm |
| PUT | /api/products/:id | Admin sửa một phần/toàn bộ nội dung; version tùy chọn để chống ghi đè |
| DELETE | /api/products/:id | Admin xóa sản phẩm, giữ snapshot đơn cũ |
| PUT | /api/products | Admin cập nhật productIds và inStock hàng loạt |
| DELETE | /api/products | Admin xóa productIds hàng loạt |
| POST | /api/uploads | Admin multipart `images[]`, tối đa 10 ảnh |
| GET | /uploads/:filename | Phục vụ ảnh hợp lệ; không thực thi file |
| GET | /api/orders | User xem đơn mình; Admin xem tất cả; bỏ qua userId URL |
| POST | /api/orders | User tạo đơn; customerDetails, items (productId/quantity/size/color), paymentMethod COD/BANK; total tùy chọn phải khớp tính toán server |
| PUT | /api/orders | orderId, version; status/paymentStatus/receipt/report theo quyền và điều kiện |
| GET | /api/orders/:id/payment | Chủ đơn/Admin xem QR theo snapshot; chỉ BANK chưa Paid/chưa hủy; tiền do server tính |
| GET | /api/orders/:id/email-preview | Admin xem HTML/text, người nhận; message tùy chọn được escape |
| GET | /api/orders/:id/notifications | Chủ đơn/Admin xem lịch sử sent/preview/failed |
| POST | /api/orders/:id/notifications | Admin gửi lại cho email khách trong đơn; message tùy chọn, CSRF/rate limit |
| GET/PUT | /api/admin/settings | Admin xem/lưu ngân hàng và SMTP; chỉ trả passwordConfigured, không trả mật khẩu |
| POST | /api/admin/mail-test | Admin gửi thư thử theo chế độ đã lưu; CSRF/rate limit |
| POST | /api/newsletter | email; đăng ký lặp không tạo bản ghi trùng |

Mã lỗi: 400 dữ liệu sai, 401 chưa đăng nhập, 403 không đủ quyền/CSRF/Origin, 404 không tồn tại, 405 method sai, 409 trùng email/xung đột phiên bản/tồn kho/trạng thái, 413 dữ liệu quá lớn, 415 content type sai, 429 quá số lần, 500 lỗi nội bộ không lộ stack ra client, 502 gửi SMTP thất bại.

Đặt/cập nhật đơn trả `lastNotification`; lỗi gửi thư không hủy transaction đơn. `sent` nghĩa SMTP đã chấp nhận, `preview` chỉ lưu mô phỏng local, `failed` là gửi lỗi. QR demo không chứa lệnh chuyển tiền ngân hàng.
