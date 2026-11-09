import React from 'react';
import { notFound } from 'next/navigation';
import { getProductById, getProducts } from '@/lib/db';
import ProductDetailClient from '@/components/products/ProductDetailClient';

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export const revalidate = 0; // Force dynamic to always load fresh data

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { id } = await params;

  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  const allProducts = await getProducts();

  return <ProductDetailClient product={product} allProducts={allProducts} />;
}
