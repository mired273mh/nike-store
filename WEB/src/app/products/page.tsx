import React, { Suspense } from 'react';
import { getProducts } from '@/lib/db';
import ProductsClient from '@/components/products/ProductsClient';

export const revalidate = 0; // Force dynamic to always fetch fresh products and handle query params

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-20 flex items-center justify-center text-zinc-500 font-semibold">
          Đang tải bộ sưu tập sản phẩm...
        </div>
      }
    >
      <ProductsClient initialProducts={products} />
    </Suspense>
  );
}
