'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import { apiJson, jsonBody } from '@/lib/api';
import type { Order } from '@/lib/types';
import Pagination from '@/components/ui/Pagination';
import PaymentQr from '@/components/orders/PaymentQr';
import MailStatus from '@/components/orders/MailStatus';
const labels: Record<Order['status'], string> = {
  Pending: 'Chờ xác nhận',
  Processing: 'Đang xử lý',
  Shipped: 'Đang giao hàng',
  Delivered: 'Đã giao hàng',
  Cancelled: 'Đã hủy',
};
export default function OrdersPage() {
  const { user, userReady } = useApp();
  const [orders, setOrders] = useState<Order[]>([]),
    [error, setError] = useState(''),
    [busy, setBusy] = useState('');
  const [loadedFor, setLoadedFor] = useState(''),
    [page, setPage] = useState(1),
    [filter, setFilter] = useState('All');
  useEffect(() => {
    let active = true;
    if (user)
      apiJson<Order[]>('/api/orders')
        .then((data) => {
          if (active) {
            setOrders(data);
            setLoadedFor(user.id);
          }
        })
        .catch((e) => {
          if (active) {
            setError(e.message);
            setLoadedFor(user.id);
          }
        });
    return () => {
      active = false;
    };
  }, [user]);
  async function update(order: Order, fields: Record<string, string | boolean>, question: string) {
    if (!window.confirm(question)) return;
    setBusy(order.id);
    setError('');
    try {
      const data = await apiJson<{ order: Order }>(
        '/api/orders',
        jsonBody('PUT', { orderId: order.id, version: order.version, ...fields }),
      );
      setOrders((prev) => prev.map((o) => (o.id === order.id ? data.order : o)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cập nhật thất bại.');
    } finally {
      setBusy('');
    }
  }
  const filtered = orders.filter((o) => filter === 'All' || o.status === filter),
    pages = Math.max(1, Math.ceil(filtered.length / 5)),
    current = Math.min(page, pages);
  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-black uppercase mb-6">Đơn hàng của tôi</h1>
      {!userReady ? (
        <p>Đang kiểm tra tài khoản…</p>
      ) : !user ? (
        <p>
          Vui lòng{' '}
          <Link className="underline font-bold" href="/login">
            đăng nhập
          </Link>{' '}
          để xem đơn hàng.
        </p>
      ) : (
        <>
          {error && (
            <p role="alert" className="p-3 bg-red-50 text-red-700 mb-4 text-sm">
              {error}
            </p>
          )}
          <label className="block text-sm mb-6">
            Lọc trạng thái{' '}
            <select
              aria-label="Lọc trạng thái"
              className="border p-2 max-w-full"
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="All">Tất cả</option>
              {Object.entries(labels).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          {loadedFor !== user.id ? (
            <p>Đang tải đơn hàng…</p>
          ) : !filtered.length ? (
            <p className="p-10 border text-center">
              Chưa có đơn hàng trong mục này.{' '}
              <Link href="/products" className="underline">
                Mua sắm ngay
              </Link>
            </p>
          ) : (
            filtered.slice((current - 1) * 5, current * 5).map((order) => (
              <article key={order.id} className="border mb-5 p-4 sm:p-6">
                <div className="flex flex-wrap justify-between gap-2 mb-4">
                  <div>
                    <h2 className="font-mono font-bold text-sm break-all">{order.id}</h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(order.createdAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-bold px-3 py-2 rounded ${order.status === 'Cancelled' ? 'bg-red-50 text-red-700' : 'bg-muted'}`}
                  >
                    {labels[order.status]}
                  </span>
                </div>
                {order.items.map((item, i) => (
                  <div className="flex gap-3 border-t py-3" key={i}>
                    <Image
                      src={item.image}
                      alt={item.name}
                      width={60}
                      height={70}
                      className="w-14 h-16 object-cover bg-muted"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Size {item.size} · {item.color} · x{item.quantity}
                      </p>
                      <p className="text-sm mt-1">
                        {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                      </p>
                    </div>
                  </div>
                ))}
                <div className="border-t pt-4 text-sm space-y-2">
                  <p>
                    Giao đến: {order.customerDetails.name} · {order.customerDetails.phone}
                  </p>
                  <p className="break-words">{order.customerDetails.address}</p>
                  <p>
                    Thanh toán: {order.paymentMethod === 'COD' ? 'COD' : 'Chuyển khoản'} ·{' '}
                    <strong>
                      {order.paymentStatus === 'Paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                    </strong>
                  </p>
                  <p className="font-black text-lg">
                    Tổng cộng: {order.total.toLocaleString('vi-VN')}đ
                  </p>
                  {order.reportedNotReceived && (
                    <p role="status" className="text-red-700">
                      Cửa hàng đã ghi nhận báo cáo chưa nhận hàng.
                    </p>
                  )}
                  {order.userConfirmedReceived && (
                    <p className="text-green-700">Bạn đã xác nhận nhận hàng.</p>
                  )}
                </div>
                <MailStatus notification={order.lastNotification} />
                {order.paymentMethod === 'BANK' &&
                  order.paymentStatus === 'Unpaid' &&
                  order.status !== 'Cancelled' && <PaymentQr orderId={order.id} />}
                <div className="flex flex-wrap gap-3 mt-4">
                  {order.status === 'Pending' && order.paymentStatus === 'Unpaid' && (
                    <button
                      disabled={busy === order.id}
                      className="border px-4 py-2 text-sm font-bold disabled:opacity-40"
                      onClick={() =>
                        update(order, { status: 'Cancelled' }, 'Bạn muốn hủy đơn hàng này?')
                      }
                    >
                      Hủy đơn hàng
                    </button>
                  )}
                  {['Shipped', 'Delivered'].includes(order.status) &&
                    !order.userConfirmedReceived && (
                      <button
                        disabled={busy === order.id}
                        className="border px-4 py-2 text-sm font-bold disabled:opacity-40"
                        onClick={() =>
                          update(
                            order,
                            { userConfirmedReceived: true },
                            'Bạn xác nhận đã nhận được hàng?',
                          )
                        }
                      >
                        Đã nhận được hàng
                      </button>
                    )}
                  {order.status === 'Delivered' &&
                    !order.reportedNotReceived &&
                    !order.userConfirmedReceived && (
                      <button
                        disabled={busy === order.id}
                        className="border border-red-200 text-red-700 px-4 py-2 text-sm font-bold disabled:opacity-40"
                        onClick={() =>
                          update(
                            order,
                            { reportedNotReceived: true },
                            'Bạn xác nhận chưa nhận được hàng?',
                          )
                        }
                      >
                        Chưa nhận được hàng
                      </button>
                    )}
                </div>
              </article>
            ))
          )}
          <Pagination page={current} pages={pages} onPage={setPage} />
        </>
      )}
    </div>
  );
}
