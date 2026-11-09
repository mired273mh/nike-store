'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { apiJson, jsonBody } from '@/lib/api';
import type { Product, Order } from '@/lib/types';
import Pagination from '@/components/ui/Pagination';
import RichEditor from '@/components/admin/RichEditor';
const statusLabels: Record<Order['status'], string> = {
  Pending: 'Chờ xác nhận',
  Processing: 'Đang xử lý',
  Shipped: 'Đang giao',
  Delivered: 'Đã giao',
  Cancelled: 'Đã hủy',
};
const transitions: Record<Order['status'], Order['status'][]> = {
  Pending: ['Processing', 'Cancelled'],
  Processing: ['Shipped', 'Cancelled'],
  Shipped: ['Delivered'],
  Delivered: [],
  Cancelled: [],
};
type Draft = Omit<Product, 'id' | 'rating' | 'reviewsCount' | 'version'>;
const blank: Draft = {
  name: '',
  description: '',
  descriptionHtml: '',
  price: 100000,
  originalPrice: null,
  category: 'Sneaker',
  subcategory: '',
  images: [],
  sizes: ['40', '41', '42'],
  colors: [{ name: 'Đen', hex: '#111111' }],
  featured: false,
  trending: false,
  inStock: true,
  stockQuantity: 100,
};
const field = 'w-full border rounded p-2.5 mt-1 bg-background text-sm';
export default function AdminPage() {
  const { user, userReady } = useApp();
  const [products, setProducts] = useState<Product[]>([]),
    [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState<'products' | 'orders'>('orders'),
    [query, setQuery] = useState(''),
    [filter, setFilter] = useState('All'),
    [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const [editing, setEditing] = useState<Product | null | undefined>(undefined),
    [draft, setDraft] = useState<Draft>(blank),
    [selected, setSelected] = useState<string[]>([]);
  const [sizesText, setSizesText] = useState(''),
    [colorsText, setColorsText] = useState(''),
    [imagesText, setImagesText] = useState('');
  useEffect(() => {
    let active = true;
    if (user?.role === 'admin')
      Promise.all([
        apiJson<Product[]>('/api/products?includeHidden=1'),
        apiJson<Order[]>('/api/orders'),
      ])
        .then(([p, o]) => {
          if (active) {
            setProducts(p);
            setOrders(o);
            setLoaded(true);
          }
        })
        .catch((e) => {
          if (active) {
            setError(e.message);
            setLoaded(true);
          }
        });
    return () => {
      active = false;
    };
  }, [user]);
  function openEditor(product: Product | null) {
    const next = product || blank;
    setEditing(product);
    setDraft({ ...next });
    setSizesText(next.sizes.join(', '));
    setColorsText(next.colors.map((c) => `${c.name}: ${c.hex}`).join('\n'));
    setImagesText(next.images.join('\n'));
    setError('');
    setMessage('');
  }
  async function reload() {
    const [p, o] = await Promise.all([
      apiJson<Product[]>('/api/products?includeHidden=1'),
      apiJson<Order[]>('/api/orders'),
    ]);
    setProducts(p);
    setOrders(o);
  }
  async function action(fn: () => Promise<void>, success: string) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await fn();
      setMessage(success);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Thao tác thất bại.');
    } finally {
      setBusy(false);
    }
  }
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await action(async () => {
      const colors = colorsText
        .split('\n')
        .filter((v) => v.trim())
        .map((line) => {
          const colon = line.lastIndexOf(':');
          return { name: line.slice(0, colon).trim(), hex: line.slice(colon + 1).trim() };
        });
      await apiJson(
        `/api/products${editing ? `/${editing.id}` : ''}`,
        jsonBody(editing ? 'PUT' : 'POST', {
          ...draft,
          sizes: sizesText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          colors,
          images: imagesText
            .split('\n')
            .map((v) => v.trim())
            .filter(Boolean),
          ...(editing ? { version: editing.version } : {}),
        }),
      );
      await reload();
      setEditing(undefined);
    }, 'Đã lưu sản phẩm.');
  }
  async function upload(files: FileList | null) {
    if (!files?.length) return;
    await action(async () => {
      const form = new FormData();
      for (const f of Array.from(files)) form.append('images[]', f);
      const data = await apiJson<{ images: string[] }>('/api/uploads', {
        method: 'POST',
        body: form,
      });
      setImagesText((prev) => [prev.trim(), ...data.images].filter(Boolean).join('\n'));
    }, 'Đã upload ảnh. Bấm Lưu sản phẩm để hoàn tất.');
  }
  async function batch(method: 'PUT' | 'DELETE', inStock?: boolean) {
    if (
      !selected.length ||
      !window.confirm(
        method === 'DELETE'
          ? `Xóa ${selected.length} sản phẩm?`
          : 'Cập nhật trạng thái các sản phẩm đã chọn?',
      )
    )
      return;
    await action(async () => {
      await apiJson(
        '/api/products',
        jsonBody(method, { productIds: selected, ...(method === 'PUT' ? { inStock } : {}) }),
      );
      setSelected([]);
      await reload();
    }, 'Đã cập nhật sản phẩm.');
  }
  async function updateOrder(order: Order, fields: Record<string, string>) {
    if (!window.confirm('Xác nhận cập nhật đơn hàng?')) return;
    await action(async () => {
      const data = await apiJson<{ order: Order }>(
        '/api/orders',
        jsonBody('PUT', { orderId: order.id, version: order.version, ...fields }),
      );
      setOrders((prev) => prev.map((o) => (o.id === order.id ? data.order : o)));
    }, 'Đã cập nhật đơn hàng.');
  }
  const filteredProducts = products.filter((p) =>
    `${p.name} ${p.category} ${p.id}`.toLowerCase().includes(query.toLowerCase()),
  );
  const filteredOrders = orders.filter(
    (o) =>
      `${o.id} ${o.customerDetails.name} ${o.customerDetails.email}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === 'All' || o.status === filter),
  );
  const total = tab === 'products' ? filteredProducts.length : filteredOrders.length,
    pages = Math.max(1, Math.ceil(total / 6)),
    current = Math.min(page, pages);
  const revenue = orders
    .filter((o) => o.status !== 'Cancelled' && o.paymentStatus === 'Paid')
    .reduce((sum, o) => sum + o.total, 0);
  if (!userReady) return <p className="p-10">Đang kiểm tra quyền…</p>;
  if (user?.role !== 'admin')
    return (
      <div className="p-12 text-center">
        <h1 className="text-2xl font-black mb-4">KHU VỰC QUẢN TRỊ</h1>
        <p>Bạn cần đăng nhập bằng tài khoản quản trị.</p>
        <Link href="/login" className="inline-block mt-5 underline">
          Đăng nhập
        </Link>
      </div>
    );
  return (
    <div className="max-w-7xl w-full mx-auto p-4 sm:p-8">
      <div className="flex flex-wrap gap-3 justify-between items-center mb-6">
        <div>
          <p className="text-xs text-brand-red font-bold tracking-widest mb-2">
            NIKE STORE / ADMIN
          </p>
          <h1 className="text-3xl font-black">QUẢN TRỊ CỬA HÀNG</h1>
        </div>
        <button
          disabled={busy}
          className="border p-2 text-sm disabled:opacity-40"
          onClick={() => action(reload, 'Đã tải dữ liệu mới nhất.')}
        >
          Tải lại dữ liệu
        </button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
        {[
          ['Doanh thu đã thu', `${revenue.toLocaleString('vi-VN')}đ`],
          ['Đơn chờ xác nhận', orders.filter((o) => o.status === 'Pending').length],
          ['Sản phẩm', products.length],
          ['Khiếu nại', orders.filter((o) => o.reportedNotReceived).length],
        ].map(([label, value]) => (
          <div className="border p-4" key={label}>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-black text-lg sm:text-xl mt-2 break-words">{value}</p>
          </div>
        ))}
      </div>
      <div className="flex border-b mb-5">
        <button
          onClick={() => {
            setTab('orders');
            setQuery('');
            setPage(1);
            setSelected([]);
          }}
          className={`px-5 py-3 font-bold text-sm ${tab === 'orders' ? 'border-b-2 border-brand-red text-brand-red' : ''}`}
        >
          Đơn hàng
        </button>
        <button
          onClick={() => {
            setTab('products');
            setQuery('');
            setPage(1);
            setSelected([]);
          }}
          className={`px-5 py-3 font-bold text-sm ${tab === 'products' ? 'border-b-2 border-brand-red text-brand-red' : ''}`}
        >
          Sản phẩm
        </button>
      </div>
      {error && (
        <p role="alert" className="bg-red-50 text-red-700 p-3 mb-4 text-sm">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="bg-green-50 text-green-800 p-3 mb-4 text-sm">
          {message}
        </p>
      )}
      <div className="flex flex-wrap gap-3 mb-5">
        <input
          aria-label="Tìm trong trang quản trị"
          placeholder="Tìm tên, email hoặc mã…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          className="border p-2 min-w-0 flex-1 text-sm"
        />
        {tab === 'products' ? (
          <button
            className="bg-foreground text-background px-4 py-2 text-sm font-bold"
            onClick={() => openEditor(null)}
          >
            Thêm sản phẩm
          </button>
        ) : (
          <select
            aria-label="Lọc đơn quản trị"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
            className="border p-2 text-sm"
          >
            <option value="All">Tất cả trạng thái</option>
            {Object.entries(statusLabels).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        )}
      </div>
      {!loaded ? (
        <p>Đang tải dữ liệu…</p>
      ) : tab === 'products' ? (
        <>
          <div className="flex flex-wrap gap-2 items-center p-3 bg-muted mb-4 text-xs">
            <span>Đã chọn {selected.length}</span>
            <button
              disabled={busy || !selected.length}
              className="border bg-background p-2 disabled:opacity-40"
              onClick={() => batch('PUT', true)}
            >
              Hiện sản phẩm
            </button>
            <button
              disabled={busy || !selected.length}
              className="border bg-background p-2 disabled:opacity-40"
              onClick={() => batch('PUT', false)}
            >
              Ẩn sản phẩm
            </button>
            <button
              disabled={busy || !selected.length}
              className="border bg-background p-2 text-red-700 disabled:opacity-40"
              onClick={() => batch('DELETE')}
            >
              Xóa đã chọn
            </button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.slice((current - 1) * 6, current * 6).map((p) => (
              <article key={p.id} className="border p-4 min-w-0">
                <div className="flex justify-between gap-3">
                  <Image
                    src={p.images[0]}
                    alt={p.name}
                    width={80}
                    height={90}
                    className="w-20 h-24 object-cover bg-muted"
                  />
                  <label className="text-xs flex gap-2 items-start">
                    <input
                      aria-label={`Chọn ${p.name}`}
                      type="checkbox"
                      checked={selected.includes(p.id)}
                      onChange={(e) =>
                        setSelected((prev) =>
                          e.target.checked ? [...prev, p.id] : prev.filter((v) => v !== p.id),
                        )
                      }
                    />
                    Chọn
                  </label>
                </div>
                <h2 className="font-bold mt-3 text-sm">{p.name}</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {p.category} · {p.stockQuantity} sản phẩm · {p.inStock ? 'Đang bán' : 'Đang ẩn'}
                </p>
                <p className="font-black my-3">{p.price.toLocaleString('vi-VN')}đ</p>
                <div className="flex gap-2">
                  <button
                    className="border px-3 py-2 text-xs font-bold"
                    onClick={() => openEditor(p)}
                    aria-label={`Sửa ${p.name}`}
                  >
                    Sửa
                  </button>
                  <button
                    disabled={busy}
                    className="border px-3 py-2 text-xs"
                    onClick={() =>
                      action(async () => {
                        await apiJson(
                          `/api/products/${p.id}`,
                          jsonBody('PUT', { inStock: !p.inStock, version: p.version }),
                        );
                        await reload();
                      }, 'Đã cập nhật trạng thái.')
                    }
                  >
                    {p.inStock ? 'Ẩn' : 'Hiện'}
                  </button>
                  <button
                    disabled={busy}
                    className="border px-3 py-2 text-xs text-red-700"
                    aria-label={`Xóa ${p.name}`}
                    onClick={() => {
                      if (window.confirm(`Xóa sản phẩm ${p.name}?`))
                        action(async () => {
                          await apiJson(`/api/products/${p.id}`, { method: 'DELETE' });
                          await reload();
                        }, 'Đã xóa sản phẩm.');
                    }}
                  >
                    Xóa
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : (
        <div className="space-y-4">
          {filteredOrders.slice((current - 1) * 6, current * 6).map((o) => (
            <article key={o.id} className="border p-4 sm:p-6">
              <div className="flex flex-wrap justify-between gap-2">
                <h2 className="font-mono text-sm font-bold break-all">{o.id}</h2>
                <span className="font-bold text-xs bg-muted px-2 py-1">
                  {statusLabels[o.status]}
                </span>
              </div>
              <p className="text-sm mt-3 break-words">
                {o.customerDetails.name} · {o.customerDetails.phone} · {o.customerDetails.email}
              </p>
              <p className="text-xs text-muted-foreground mt-1 break-words">
                {o.customerDetails.address}
              </p>
              <ul className="text-sm my-4 space-y-1">
                {o.items.map((i, index) => (
                  <li key={index}>
                    {i.name} · {i.size} · {i.color} · x{i.quantity}
                  </li>
                ))}
              </ul>
              <p className="font-black">
                {o.total.toLocaleString('vi-VN')}đ ·{' '}
                <span className="text-sm font-semibold">
                  {o.paymentMethod} /{' '}
                  {o.paymentStatus === 'Paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(o.createdAt).toLocaleString('vi-VN')}
              </p>
              {o.reportedNotReceived && (
                <p className="text-sm text-red-700 mt-3">
                  Khách báo chưa nhận được hàng. Cần liên hệ kiểm tra.
                </p>
              )}
              {o.userConfirmedReceived && (
                <p className="text-xs text-green-700 mt-3">Khách đã xác nhận nhận hàng.</p>
              )}
              <div className="flex flex-wrap gap-2 mt-4">
                {transitions[o.status]
                  .filter((s) => !(s === 'Cancelled' && o.paymentStatus === 'Paid'))
                  .map((s) => (
                    <button
                      key={s}
                      disabled={busy}
                      className="border p-2 text-xs font-bold disabled:opacity-40"
                      onClick={() => updateOrder(o, { status: s })}
                    >
                      {statusLabels[s]}
                    </button>
                  ))}
                {o.paymentStatus === 'Unpaid' &&
                  o.status !== 'Cancelled' &&
                  (o.paymentMethod === 'BANK' || o.status === 'Delivered') && (
                    <button
                      disabled={busy}
                      className="bg-foreground text-background p-2 text-xs font-bold disabled:opacity-40"
                      onClick={() => updateOrder(o, { paymentStatus: 'Paid' })}
                    >
                      Xác nhận đã thu tiền
                    </button>
                  )}
              </div>
            </article>
          ))}
        </div>
      )}
      {loaded && total === 0 && <p className="py-10 text-center">Không có dữ liệu phù hợp.</p>}
      <Pagination page={current} pages={pages} onPage={setPage} />
      {editing !== undefined && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto p-3 sm:p-8">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="editor-title"
            className="bg-background max-w-3xl mx-auto p-4 sm:p-7 rounded"
          >
            <div className="flex justify-between gap-3 mb-5">
              <h2 id="editor-title" className="font-black text-xl">
                {editing ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
              </h2>
              <button
                disabled={busy}
                onClick={() => setEditing(undefined)}
                className="border px-3 text-sm"
              >
                Đóng
              </button>
            </div>
            {error && (
              <p role="alert" className="p-3 bg-red-50 text-red-700 text-sm mb-4">
                {error}
              </p>
            )}
            {message && (
              <p role="status" className="p-3 bg-green-50 text-green-800 text-sm mb-4">
                {message}
              </p>
            )}
            <form onSubmit={save} className="space-y-4">
              <label className="block text-sm font-semibold">
                Tên sản phẩm
                <input
                  required
                  maxLength={180}
                  value={draft.name}
                  onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                  className={field}
                />
              </label>
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="text-sm font-semibold">
                  Giá bán (đ)
                  <input
                    type="number"
                    required
                    min={1}
                    max={1000000000}
                    step={1}
                    value={draft.price}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, price: Number(e.target.value) }))
                    }
                    className={field}
                  />
                </label>
                <label className="text-sm font-semibold">
                  Giá gốc (đ, tùy chọn)
                  <input
                    type="number"
                    min={draft.price}
                    max={1000000000}
                    value={draft.originalPrice ?? ''}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        originalPrice: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                    className={field}
                  />
                </label>
                <label className="text-sm font-semibold">
                  Danh mục
                  <select
                    value={draft.category}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        category: e.target.value as Product['category'],
                      }))
                    }
                    className={field}
                  >
                    <option value="Sneaker">Giày Sneaker</option>
                    <option value="SportShoes">Giày thể thao</option>
                    <option value="Clothing">Quần áo</option>
                  </select>
                </label>
                <label className="text-sm font-semibold">
                  Phân loại
                  <input
                    required
                    maxLength={120}
                    value={draft.subcategory}
                    onChange={(e) => setDraft((prev) => ({ ...prev, subcategory: e.target.value }))}
                    className={field}
                  />
                </label>
              </div>
              <div>
                <p className="text-sm font-semibold mb-2">Mô tả sản phẩm</p>
                <RichEditor
                  key={editing?.id || 'new'}
                  initialHtml={editing?.descriptionHtml || ''}
                  onChange={(html, text) =>
                    setDraft((prev) => ({ ...prev, description: text, descriptionHtml: html }))
                  }
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="text-sm font-semibold">
                  Kích thước, ngăn cách bằng dấu phẩy
                  <input
                    required
                    value={sizesText}
                    onChange={(e) => setSizesText(e.target.value)}
                    className={field}
                    placeholder="40, 41, 42"
                  />
                </label>
                <label className="text-sm font-semibold">
                  Số lượng tồn
                  <input
                    type="number"
                    required
                    min={0}
                    max={1000000}
                    value={draft.stockQuantity}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, stockQuantity: Number(e.target.value) }))
                    }
                    className={field}
                  />
                </label>
              </div>
              <label className="block text-sm font-semibold">
                Màu sắc, mỗi dòng Tên màu: #mã-màu
                <textarea
                  required
                  rows={3}
                  value={colorsText}
                  onChange={(e) => setColorsText(e.target.value)}
                  className={field}
                  placeholder="Đen: #111111"
                />
              </label>
              <label className="block text-sm font-semibold">
                Ảnh sản phẩm (JPG, PNG, WebP; tối đa 10 ảnh, mỗi ảnh 5MB)
                <input
                  aria-label="Upload nhiều ảnh"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  disabled={busy}
                  onChange={(e) => {
                    upload(e.target.files);
                    e.target.value = '';
                  }}
                  className={field}
                />
              </label>
              <label className="block text-sm font-semibold">
                Đường dẫn ảnh, mỗi dòng một ảnh (xóa dòng để bỏ ảnh)
                <textarea
                  rows={4}
                  required
                  value={imagesText}
                  onChange={(e) => setImagesText(e.target.value)}
                  className={field}
                  placeholder="/uploads/… hoặc https://…"
                />
              </label>
              <div className="flex flex-wrap gap-5">
                {[
                  ['inStock', 'Đang bán'],
                  ['featured', 'Nổi bật'],
                  ['trending', 'Xu hướng'],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={draft[key as 'inStock' | 'featured' | 'trending']}
                      onChange={(e) => setDraft((prev) => ({ ...prev, [key]: e.target.checked }))}
                    />
                    {label}
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap gap-3 pt-4">
                <button
                  disabled={busy}
                  className="bg-foreground text-background px-5 py-3 font-bold disabled:opacity-40"
                >
                  {busy ? 'Đang xử lý…' : 'Lưu sản phẩm'}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className="border px-5 py-3"
                  onClick={() => setEditing(undefined)}
                >
                  Hủy
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
