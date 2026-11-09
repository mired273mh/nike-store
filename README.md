# Website Nike Store

Bài tập nhóm Lập trình Web: website bán hàng với **backend PHP + MySQL** và giao diện React/Next.js.

Mã nguồn ứng dụng nằm trong thư mục [`WEB/`](WEB/).

## Chạy trên Windows

**Nhanh nhất:** bấm **Go Live** với extension **Live Server (Five Server)** trong VS Code. Hoặc bấm đúp **`CHAY-WEB.cmd`** trong File Explorer. Bộ khởi động tự chuẩn bị/chạy ứng dụng và mở trình duyệt; nếu website đã chạy thì mở lại ngay.

```powershell
cd WEB
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/setup.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start.ps1
```

Truy cập `http://127.0.0.1:3000`. Xem [hướng dẫn đầy đủ](WEB/README.md) để cấu hình, chạy production và kiểm thử.

## Chức năng

- Danh mục sản phẩm, tìm kiếm, bộ lọc, phân trang, giỏ hàng và đặt COD.
- Đăng ký, đăng nhập, đăng xuất, khôi phục mật khẩu và phân quyền tại PHP.
- Admin CRUD sản phẩm, upload nhiều ảnh, editor mô tả, quản lý tồn kho và đơn hàng.
- Transaction MySQL, kiểm tra giá/tồn kho tại server, CSRF và cookie phiên HttpOnly.

## Tài liệu

- [Thiết kế hệ thống](WEB/docs/SYSTEM-DESIGN.md) · [Database](WEB/docs/DATABASE.md) · [Schema SQL](WEB/backend/database/schema.sql)
- [SQL dữ liệu mẫu sạch](WEB/backend/database/demo.sql)
- [Slide PDF](WEB/docs/Nike-Store-Slides.pdf) · [Slide PowerPoint](WEB/docs/Nike-Store-Slides.pptx)
- [Review và kết quả 82 ca kiểm thử](WEB/REVIEW.md)
- [Thông tin nhóm cần bổ sung](WEB/docs/TEAM.md)

Các tài khoản trong README ứng dụng chỉ phục vụ demo. Repository không chứa cấu hình `.env`, dữ liệu khách cũ, runtime database hay thư chứa mã khôi phục mật khẩu.
