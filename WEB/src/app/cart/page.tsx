'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Trash2, Plus, Minus, ShoppingBag, CheckCircle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { apiJson, jsonBody } from '@/lib/api';
import type { Order, Product } from '@/lib/types';
type Bank = { name: string; account: string; holder: string };
export default function CartPage() {
  const { cart, user, userReady, updateCartQuantity, removeFromCart, clearCart, replaceCart } =
    useApp();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [success, setSuccess] = useState<Order | null>(null);
  const [bank, setBank] = useState<Bank | null>(null),
    [method, setMethod] = useState<'COD' | 'BANK'>('COD');
  const [checked, setChecked] = useState('');
  const cartKey = JSON.stringify(cart.map((i) => [i.product.id, i.quantity, i.size, i.color.hex]));
  useEffect(() => {
    apiJson<{ bank: Bank | null }>('/api/settings')
      .then((data) => setBank(data.bank))
      .catch(() => {});
  }, []);
  useEffect(() => {
    let active = true;
    Promise.all(
      cart.map(async (item) => ({
        ...item,
        product: await apiJson<Product>(`/api/products/${encodeURIComponent(item.product.id)}`),
      })),
    )
      .then((next) => {
        if (!active) return;
        const invalid = next.find(
          (i) =>
            !i.product.inStock ||
            i.quantity > i.product.stockQuantity ||
            !i.product.sizes.includes(i.size) ||
            !i.product.colors.some((c) => c.hex === i.color.hex),
        );
        setError(
          invalid
            ? `Sản phẩm ${invalid.product.name} đã thay đổi hoặc không đủ hàng. Vui lòng xóa và chọn lại.`
            : '',
        );
        if (JSON.stringify(next) !== JSON.stringify(cart)) replaceCart(next);
        setChecked(invalid ? '' : cartKey);
      })
      .catch(() => {
        if (active) {
          setError('Một sản phẩm không còn bán. Vui lòng xóa sản phẩm đó khỏi giỏ.');
          setChecked('');
        }
      });
    return () => {
      active = false;
    };
  }, [cart, cartKey, replaceCart]);
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    shipping = subtotal > 1000000 || subtotal === 0 ? 0 : 40000;
  async function checkout(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user || busy || checked !== cartKey) return;
    const fields = new FormData(e.currentTarget);
    setBusy(true);
    setError('');
    try {
      const data = await apiJson<{ order: Order }>(
        '/api/orders',
        jsonBody('POST', {
          customerDetails: Object.fromEntries(
            ['name', 'email', 'phone', 'address'].map((key) => [
              key,
              String(fields.get(key) || '').trim(),
            ]),
          ),
          items: cart.map((i) => ({
            productId: i.product.id,
            quantity: i.quantity,
            size: i.size,
            color: i.color.name,
          })),
          total: subtotal + shipping,
          paymentMethod: method,
        }),
      );
      setSuccess(data.order);
      clearCart();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Đặt hàng thất bại.');
    } finally {
      setBusy(false);
    }
  }
  if (success)
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-20 text-center">
        <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-5" />
        <h1 className="text-3xl font-black mb-4">ĐẶT HÀNG THÀNH CÔNG!</h1>
        <p className="break-all font-mono">{success.id}</p>
        <p className="my-4 font-bold">{success.total.toLocaleString('vi-VN')}đ</p>
        <p className="text-sm mb-6">
          {success.paymentMethod === 'COD'
            ? 'Thanh toán khi nhận hàng.'
            : 'Đơn đang chờ cửa hàng xác nhận chuyển khoản.'}
        </p>
        {success.paymentMethod === 'BANK' && bank && (
          <div className="p-4 bg-muted text-left space-y-2 text-sm mb-6">
            <p>
              {bank.name} · {bank.holder}
            </p>
            <p className="font-bold">Số tài khoản: {bank.account}</p>
            <p className="break-all">Nội dung: {success.id}</p>
            <p>
              Chỉ chuyển đúng tổng tiền trên đơn. Trạng thái thanh toán được cập nhật sau khi cửa
              hàng kiểm tra.
            </p>
          </div>
        )}
        <Link
          href="/orders"
          className="inline-block bg-foreground text-background px-6 py-3 font-bold"
        >
          Xem đơn hàng
        </Link>
      </div>
    );
  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-3xl font-black uppercase mb-8">Giỏ hàng</h1>
      {!cart.length ? (
        <div className="text-center py-16">
          <ShoppingBag className="w-14 h-14 mx-auto mb-4 text-muted-foreground" />
          <p className="mb-5">Giỏ hàng của bạn đang trống.</p>
          <Link href="/products" className="underline font-bold">
            Mua sắm ngay
          </Link>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-10">
          <div>
            {cart.map((item) => (
              <div
                key={`${item.product.id}-${item.size}-${item.color.hex}`}
                className="flex gap-4 border-b py-5"
              >
                <Image
                  width={90}
                  height={110}
                  src={item.product.images[0]}
                  alt={item.product.name}
                  className="w-20 h-28 object-cover shrink-0 bg-muted"
                />
                <div className="min-w-0 flex-1">
                  <Link href={`/products/${item.product.id}`} className="font-bold text-sm">
                    {item.product.name}
                  </Link>
                  <p className="text-xs text-muted-foreground mt-2">
                    Size {item.size} · {item.color.name}
                  </p>
                  <p className="font-bold my-3">{item.product.price.toLocaleString('vi-VN')}đ</p>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center border">
                      <button
                        type="button"
                        aria-label={`Giảm số lượng ${item.product.name}`}
                        className="p-2"
                        onClick={() =>
                          updateCartQuantity(
                            item.product.id,
                            item.size,
                            item.color.hex,
                            item.quantity - 1,
                          )
                        }
                      >
                        <Minus size={14} />
                      </button>
                      <span className="min-w-7 text-center text-sm" aria-label="Số lượng">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label={`Tăng số lượng ${item.product.name}`}
                        className="p-2 disabled:opacity-40"
                        disabled={item.quantity >= Math.min(99, item.product.stockQuantity)}
                        onClick={() =>
                          updateCartQuantity(
                            item.product.id,
                            item.size,
                            item.color.hex,
                            item.quantity + 1,
                          )
                        }
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <button
                      type="button"
                      aria-label={`Xóa ${item.product.name}`}
                      onClick={() => removeFromCart(item.product.id, item.size, item.color.hex)}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <section className="border p-5 sm:p-7">
            <h2 className="text-xl font-black mb-5">THÔNG TIN GIAO HÀNG</h2>
            {error && (
              <p role="alert" className="bg-red-50 text-red-700 p-3 text-sm mb-4">
                {error}
              </p>
            )}
            {!userReady ? (
              <p>Đang kiểm tra tài khoản…</p>
            ) : !user ? (
              <p className="bg-muted p-4 text-sm">
                Vui lòng{' '}
                <Link href="/login" className="font-bold underline">
                  đăng nhập hoặc đăng ký
                </Link>{' '}
                để đặt hàng và theo dõi đơn.
              </p>
            ) : (
              <form key={user.id} onSubmit={checkout} className="space-y-4">
                <label className="block text-sm font-semibold">
                  Họ và tên
                  <input
                    name="name"
                    defaultValue={user.name}
                    required
                    maxLength={120}
                    autoComplete="name"
                    placeholder="Nhập họ và tên người nhận..."
                    className="block border p-3 w-full mt-1"
                  />
                </label>
                <label className="block text-sm font-semibold">
                  Số điện thoại
                  <input
                    name="phone"
                    type="tel"
                    required
                    pattern="\+?[0-9][0-9 .\-]{8,18}"
                    maxLength={20}
                    autoComplete="tel"
                    placeholder="Số điện thoại nhận hàng..."
                    className="block border p-3 w-full mt-1"
                  />
                </label>
                <label className="block text-sm font-semibold">
                  Email
                  <input
                    name="email"
                    type="email"
                    defaultValue={user.email}
                    required
                    maxLength={254}
                    autoComplete="email"
                    placeholder="Email nhận hóa đơn..."
                    className="block border p-3 w-full mt-1"
                  />
                </label>
                <label className="block text-sm font-semibold">
                  Địa chỉ
                  <textarea
                    name="address"
                    required
                    minLength={5}
                    maxLength={500}
                    autoComplete="street-address"
                    placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành..."
                    className="block border p-3 w-full mt-1"
                  />
                </label>
                <fieldset>
                  <legend className="text-sm font-bold mb-2">Phương thức thanh toán</legend>
                  <label className="flex gap-2 text-sm border p-3">
                    <input
                      type="radio"
                      name="payment"
                      checked={method === 'COD'}
                      onChange={() => setMethod('COD')}
                    />
                    COD · Thanh toán khi nhận hàng
                  </label>
                  {bank && (
                    <label className="flex gap-2 text-sm border p-3 mt-2">
                      <input
                        type="radio"
                        name="payment"
                        checked={method === 'BANK'}
                        onChange={() => setMethod('BANK')}
                      />
                      Chuyển khoản ngân hàng
                    </label>
                  )}
                </fieldset>
                <div className="border-t pt-4 space-y-2 text-sm">
                  <p className="flex justify-between">
                    <span>Tạm tính</span>
                    <span>{subtotal.toLocaleString('vi-VN')}đ</span>
                  </p>
                  <p className="flex justify-between">
                    <span>Phí giao hàng</span>
                    <span>{shipping ? `${shipping.toLocaleString('vi-VN')}đ` : 'Miễn phí'}</span>
                  </p>
                  <p className="flex justify-between font-black text-lg">
                    <span>Tổng cộng</span>
                    <span>{(subtotal + shipping).toLocaleString('vi-VN')}đ</span>
                  </p>
                </div>
                <button
                  disabled={busy || checked !== cartKey}
                  className="w-full bg-foreground text-background py-4 font-black uppercase disabled:opacity-40"
                >
                  {busy
                    ? 'Đang đặt hàng…'
                    : method === 'COD'
                      ? 'Đặt hàng (COD)'
                      : 'Đặt hàng chuyển khoản'}
                </button>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
