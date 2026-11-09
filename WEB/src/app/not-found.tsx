import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="text-center py-20 px-4">
      <h1 className="font-black text-3xl mb-4">Không tìm thấy trang</h1>
      <p className="mb-5">Trang hoặc sản phẩm này không còn tồn tại.</p>
      <Link className="underline font-bold" href="/products">
        Xem bộ sưu tập
      </Link>
    </div>
  );
}
