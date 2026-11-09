import Link from 'next/link';
export default function PoliciesPage() {
  return (
    <article className="w-full max-w-3xl mx-auto px-4 py-12 space-y-8 text-sm leading-7">
      <h1 className="text-3xl font-black">Thông tin mua sắm</h1>
      <p>
        Website Nike Store là bài tập nhóm môn Lập trình Web. Dữ liệu sản phẩm, giá và hình ảnh phục
        vụ minh họa chức năng.
      </p>
      <section id="sizes">
        <h2 className="text-xl font-bold mb-3">Chọn kích thước</h2>
        <p>
          Giày sử dụng size EU hiển thị trên từng sản phẩm; quần áo sử dụng S, M, L, XL. Đo chiều
          dài bàn chân hoặc số đo cơ thể và đối chiếu hướng dẫn của đúng mẫu trước khi chọn. Size và
          màu còn bán được liệt kê ngay trên trang sản phẩm.
        </p>
      </section>
      <section id="shipping">
        <h2 className="text-xl font-bold mb-3">Giao hàng và đổi trả</h2>
        <p>
          Phí giao hàng 40.000đ; miễn phí với tổng giá sản phẩm trên 1.000.000đ. Khách hàng có thể
          hủy đơn chưa xác nhận và chưa thanh toán trong mục Đơn hàng. Với đơn đã xử lý, hãy liên hệ
          cửa hàng để được hỗ trợ. Việc demo không phát sinh giao vận thực tế.
        </p>
      </section>
      <section id="payment">
        <h2 className="text-xl font-bold mb-3">Thanh toán</h2>
        <p>
          COD là thanh toán khi nhận hàng. QR demo dùng ngân hàng và tài khoản ảo, không chuyển tiền
          thật. Khi cửa hàng cấu hình ngân hàng thật, mã VietQR hiển thị số tiền và nội dung đơn
          hàng. Quản trị viên kiểm tra giao dịch trước khi xác nhận thanh toán.
        </p>
      </section>
      <section id="privacy">
        <h2 className="text-xl font-bold mb-3">Bảo mật và quyền riêng tư</h2>
        <p>
          Thông tin tài khoản và giao hàng được lưu để xử lý đơn. Khách hàng chỉ xem được đơn của
          mình; quản trị viên xem đơn để quản lý cửa hàng. Mật khẩu được băm một chiều.
        </p>
      </section>
      <section id="cookies">
        <h2 className="text-xl font-bold mb-3">Cookie và dữ liệu thiết bị</h2>
        <p>
          Cookie phiên dùng để duy trì đăng nhập, được đặt HttpOnly và SameSite. Giỏ hàng lưu trên
          trình duyệt để giữ sản phẩm sau khi tải lại trang. Đăng xuất thu hồi phiên máy chủ; bạn có
          thể xóa dữ liệu trang trong trình duyệt để xóa giỏ hàng.
        </p>
      </section>
      <Link href="/products" className="inline-block underline font-bold">
        Tiếp tục mua sắm
      </Link>
    </article>
  );
}
