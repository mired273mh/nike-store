// Frontend data fetching only. All business logic and persistence live in PHP/MySQL.
export type { Product, Order, OrderItem, UserSession } from './types';
import type { Product } from './types';
const origin = () => process.env.PHP_API_ORIGIN || 'http://127.0.0.1:8000';
export async function getProducts(): Promise<Product[]> {
  const response = await fetch(`${origin()}/api/products`, { cache: 'no-store' });
  if (!response.ok) throw new Error('Không thể tải sản phẩm. Kiểm tra PHP API và MySQL.');
  return response.json();
}
export async function getProductById(id: string): Promise<Product | undefined> {
  const response = await fetch(`${origin()}/api/products/${encodeURIComponent(id)}`, {
    cache: 'no-store',
  });
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error('Không thể tải thông tin sản phẩm.');
  return response.json();
}
