# Kịch bản demo và chuẩn bị nộp

## Demo khoảng 6–8 phút

1. Nêu đề tài Website Nike Store; chỉ ra backend PHP + MySQL và frontend React/Next.js. Mở sơ đồ kiến trúc và ERD.
2. Trang sản phẩm: tìm Pegasus, lọc danh mục/size/giá, đổi thứ tự giá và chuyển trang.
3. Đăng ký tài khoản; chọn size/màu, thêm giỏ, đổi số lượng, tải lại để chứng minh giỏ được giữ.
4. Đặt COD với thông tin mẫu; mở đơn hàng và trạng thái. Có thể demo hủy một đơn Pending để chứng minh hoàn tồn.
5. Đăng xuất; đăng nhập Admin. Thêm sản phẩm, soạn mô tả có định dạng, upload 2 ảnh, sửa giá, ẩn/hiện và xóa sản phẩm vừa thêm.
6. Admin cập nhật đơn Pending → Processing → Shipped → Delivered; xác nhận đã thu tiền; doanh thu đã thu cập nhật.
7. Khách chỉ xem được đơn mình. Trình bày kết quả kiểm thử và một ví dụ API từ chối quyền sai/giá bị sửa.
8. Trình bày đóng góp thực tế của thành viên và hạn chế/định hướng.

## Trước khi nộp

- Điền lớp, giảng viên, nhóm, thành viên/MSSV và đóng góp thực tế vào TEAM.md và slide.
- Mở thử slide PPTX/PDF và chạy một lượt kịch bản trên máy trình bày.
- Chuẩn bị source và schema SQL; README có lệnh cài/chạy; không đưa `.env`, dữ liệu khách, import cũ, session, OTP, mail outbox, uploads cá nhân hoặc mật khẩu SMTP vào source nộp bài.
- Dùng dữ liệu mẫu, tài khoản demo. Các tài khoản demo cần thay đổi/vô hiệu hóa nếu đưa lên môi trường phục vụ người dùng thật.
- Đề yêu cầu link deploy **nếu có**. Bản hoàn thiện này có thể demo local; không tự coi localhost là link deploy công khai.
- Đọc trực tiếp code PHP xử lý session, transaction và validate; giải thích được thay vì chỉ chạy giao diện.
