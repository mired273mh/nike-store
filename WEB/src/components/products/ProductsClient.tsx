'use client';
import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Product } from '@/lib/types';
import ProductCard from '@/components/ui/ProductCard';
import Pagination from '@/components/ui/Pagination';
import { SlidersHorizontal, X } from 'lucide-react';
const categories = [
  ['All', 'Tất Cả'],
  ['Sneaker', 'Giày Sneaker'],
  ['SportShoes', 'Giày Thể Thao'],
  ['Clothing', 'Quần Áo'],
];
export default function ProductsClient({ initialProducts }: { initialProducts: Product[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const category = params.get('category') || 'All',
    search = params.get('search') || '',
    sort = params.get('sort') || 'featured';
  const maxPrice = Math.max(1000000, ...initialProducts.map((p) => p.price));
  const [price, setPrice] = useState<number | null>(null);
  const [sizes, setSizes] = useState<string[]>([]);
  const [mobile, setMobile] = useState(false);
  function navigate(key: string, value: string) {
    const p = new URLSearchParams(params.toString());
    if (value) p.set(key, value);
    else p.delete(key);
    if (key !== 'page') p.delete('page');
    router.push(`/products?${p}`);
  }
  useEffect(() => {
    if (!mobile) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobile(false);
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [mobile]);
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const result = initialProducts.filter(
      (p) =>
        p.inStock &&
        (category === 'All' || p.category === category) &&
        (!q || `${p.name} ${p.description} ${p.subcategory}`.toLowerCase().includes(q)) &&
        (!sizes.length || sizes.some((s) => p.sizes.includes(s))) &&
        p.price <= (price ?? maxPrice),
    );
    return result.sort((a, b) =>
      sort === 'price_asc'
        ? a.price - b.price
        : sort === 'price_desc'
          ? b.price - a.price
          : sort === 'rating'
            ? b.rating - a.rating
            : Number(b.featured) - Number(a.featured),
    );
  }, [initialProducts, category, search, sizes, price, maxPrice, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / 9));
  const page = Math.min(pages, Math.max(1, Number(params.get('page')) || 1));
  const availableSizes = Array.from(new Set(initialProducts.flatMap((p) => p.sizes)));
  const filters = (
    <div className="space-y-7">
      <div>
        <h2 className="text-xs font-black tracking-widest mb-4">DANH MỤC</h2>
        <div className="flex flex-col items-start gap-3">
          {categories.map(([value, label]) => (
            <button
              key={value}
              onClick={() => {
                navigate('category', value === 'All' ? '' : value);
                setMobile(false);
              }}
              className={`text-xs font-bold uppercase ${category === value ? 'text-brand-red border-l-2 border-brand-red pl-2' : 'text-muted-foreground'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <h2 className="text-xs font-black tracking-widest mb-4">GIÁ TỐI ĐA</h2>
        <input
          aria-label="Giá tối đa"
          type="range"
          min="0"
          max={maxPrice}
          step="10000"
          value={price ?? maxPrice}
          className="w-full accent-brand-red"
          onChange={(e) => {
            setPrice(Number(e.target.value));
            navigate('page', '1');
          }}
        />
        <p className="text-sm font-bold">{(price ?? maxPrice).toLocaleString('vi-VN')}đ</p>
      </div>
      <div>
        <h2 className="text-xs font-black tracking-widest mb-4">KÍCH THƯỚC</h2>
        <div className="flex flex-wrap gap-2">
          {availableSizes.map((size) => (
            <button
              key={size}
              aria-pressed={sizes.includes(size)}
              className={`border min-w-10 py-2 text-xs font-bold ${sizes.includes(size) ? 'bg-foreground text-background' : ''}`}
              onClick={() => {
                setSizes((prev) =>
                  prev.includes(size) ? prev.filter((v) => v !== size) : [...prev, size],
                );
                navigate('page', '1');
              }}
            >
              {size}
            </button>
          ))}
        </div>
      </div>
      <button
        onClick={() => {
          setPrice(null);
          setSizes([]);
          setMobile(false);
          router.push('/products');
        }}
        className="text-xs underline font-semibold"
      >
        Xóa bộ lọc
      </button>
    </div>
  );
  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="border-b pb-6 mb-8">
        <p className="text-xs text-brand-red font-bold tracking-widest mb-2">
          NIKE STORE / BỘ SƯU TẬP
        </p>
        <h1 className="text-3xl sm:text-4xl font-black uppercase">Bộ sưu tập</h1>
        <p className="text-sm text-muted-foreground mt-2" aria-live="polite">
          Hiển thị {filtered.length} sản phẩm · Trang {page}/{pages}
        </p>
        <div className="flex flex-wrap items-center gap-3 mt-5">
          <button
            className="md:hidden flex gap-2 border px-3 py-2 text-sm"
            onClick={() => setMobile(true)}
          >
            <SlidersHorizontal size={16} />
            Bộ lọc
          </button>
          <form
            className="flex flex-1 min-w-40 max-w-md gap-2"
            key={search}
            onSubmit={(e) => {
              e.preventDefault();
              navigate('search', String(new FormData(e.currentTarget).get('search') || ''));
            }}
          >
            <input
              name="search"
              aria-label="Tìm sản phẩm"
              placeholder="Tìm tên sản phẩm…"
              defaultValue={search}
              maxLength={200}
              className="border p-2 w-full min-w-0 text-sm"
            />
            <button className="border px-3 text-sm font-bold">Tìm</button>
          </form>
          <select
            aria-label="Sắp xếp sản phẩm"
            value={sort}
            onChange={(e) => navigate('sort', e.target.value)}
            className="border p-2 text-sm max-w-full"
          >
            <option value="featured">Nổi bật</option>
            <option value="price_asc">Giá: Thấp đến Cao</option>
            <option value="price_desc">Giá: Cao đến Thấp</option>
            <option value="rating">Đánh giá cao nhất</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8">
        <aside className="hidden md:block">{filters}</aside>
        <section aria-label="Danh sách sản phẩm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.slice((page - 1) * 9, page * 9).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          {!filtered.length && (
            <p className="py-16 text-center text-muted-foreground">
              Không tìm thấy sản phẩm phù hợp.
            </p>
          )}
          <Pagination page={page} pages={pages} onPage={(n) => navigate('page', String(n))} />
        </section>
      </div>
      {mobile && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setMobile(false)}>
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Bộ lọc sản phẩm"
            className="bg-background p-6 w-80 max-w-[90vw] h-full overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between mb-8">
              <h2 className="font-black">BỘ LỌC</h2>
              <button aria-label="Đóng bộ lọc" onClick={() => setMobile(false)}>
                <X />
              </button>
            </div>
            {filters}
          </aside>
        </div>
      )}
    </div>
  );
}
