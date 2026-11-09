'use client';
import { useState } from 'react';
import Link from 'next/link';
import { apiJson, jsonBody } from '@/lib/api';
export default function Footer() {
  const [email, setEmail] = useState(''),
    [message, setMessage] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function subscribe(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const data = await apiJson<{ message: string }>(
        '/api/newsletter',
        jsonBody('POST', { email }),
      );
      setMessage(data.message);
      setEmail('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể đăng ký.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <footer className="bg-foreground text-background border-t mt-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10">
          <div>
            <Link href="/" className="font-black text-2xl">
              NIKE<span className="text-brand-red">.</span>
            </Link>
            <p className="text-sm text-zinc-400 mt-4 max-w-sm">
              Giày và trang phục thể thao. Website Nike Store là dự án học tập; hình ảnh dùng để
              minh họa.
            </p>
          </div>
          <div>
            <h2 className="font-bold text-sm mb-4">KHÁM PHÁ</h2>
            <ul className="text-sm text-zinc-400 space-y-3">
              <li>
                <Link href="/products">Bộ sưu tập sản phẩm</Link>
              </li>
              <li>
                <Link href="/orders">Tình trạng đơn hàng</Link>
              </li>
              <li>
                <Link href="/policies#shipping">Giao hàng và đổi trả</Link>
              </li>
              <li>
                <Link href="/policies#privacy">Bảo mật và quyền riêng tư</Link>
              </li>
              <li>
                <Link href="/policies#payment">Phương thức thanh toán</Link>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="font-bold text-sm mb-4">ĐĂNG KÝ NHẬN BẢN TIN</h2>
            <form onSubmit={subscribe} className="flex gap-2">
              <input
                aria-label="Email nhận bản tin"
                type="email"
                required
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email của bạn"
                className="border border-zinc-600 bg-zinc-900 text-white p-3 min-w-0 flex-1 text-sm"
              />
              <button
                disabled={busy}
                className="bg-brand-red text-white px-4 font-bold disabled:opacity-40"
              >
                Gửi
              </button>
            </form>
            {message && (
              <p role="status" className="text-sm mt-3 text-green-300">
                {message}
              </p>
            )}
            {error && (
              <p role="alert" className="text-sm mt-3 text-red-300">
                {error}
              </p>
            )}
          </div>
        </div>
        <div className="mt-10 border-t border-zinc-800 pt-6 flex flex-wrap justify-between gap-3 text-xs text-zinc-400">
          <p>Website Nike Store · Bài tập nhóm Lập trình Web</p>
          <Link href="/policies#cookies">Cookie và dữ liệu lưu trên thiết bị</Link>
        </div>
      </div>
    </footer>
  );
}
