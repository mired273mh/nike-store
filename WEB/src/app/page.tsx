import React from 'react';
import { getProducts } from '@/lib/db';
import HomeClient from '@/components/home/HomeClient';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const products = await getProducts();
  return <HomeClient products={products} />;
}
