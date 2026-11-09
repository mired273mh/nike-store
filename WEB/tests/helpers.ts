import { request, type APIRequestContext } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
export const apiOrigin = process.env.TEST_API_ORIGIN || 'http://127.0.0.1:8001';
export function dbHelper(action: string) {
  const runtime = path.join(process.env.LOCALAPPDATA || '', 'NikeStoreRuntime');
  const php =
    process.env.PHP_BIN ||
    (process.platform === 'win32' ? path.join(runtime, 'php/php.exe') : 'php');
  const args =
    process.platform === 'win32'
      ? ['-c', 'backend/php.ini', '-d', `extension_dir=${path.join(runtime, 'php/ext')}`]
      : [];
  return execFileSync(php, [...args, 'tests/database.php', action], {
    env: { ...process.env, DB_DATABASE: 'nike_store_test' },
    encoding: 'utf8',
  });
}
export class Client {
  csrf = '';
  constructor(public context: APIRequestContext) {}
  static async create() {
    const c = new Client(await request.newContext({ baseURL: apiOrigin }));
    const r = await c.send('/api/auth/session');
    c.csrf = (await r.json()).csrfToken;
    return c;
  }
  async send(url: string, method = 'GET', data?: unknown, headers: Record<string, string> = {}) {
    const r = await this.context.fetch(url, {
      method,
      ...(data !== undefined ? { data } : {}),
      headers: { ...(method !== 'GET' ? { 'X-CSRF-Token': this.csrf } : {}), ...headers },
    });
    if (r.headers()['x-csrf-token']) this.csrf = r.headers()['x-csrf-token'];
    return r;
  }
  async admin() {
    const r = await this.send('/api/auth/login', 'POST', {
      email: 'admin@premium.com',
      password: 'Admin123!',
    });
    if (r.status() !== 200) throw new Error(`Admin login: ${r.status()} ${await r.text()}`);
    return this;
  }
  async register() {
    const email = `test-${crypto.randomUUID()}@example.invalid`,
      password = 'TestPassword123!';
    const r = await this.send('/api/auth/register', 'POST', { name: 'Test User', email, password });
    if (r.status() !== 201) throw new Error(`Register: ${r.status()} ${await r.text()}`);
    const data = await r.json();
    return { email, password, user: data.user };
  }
  async product(overrides: Record<string, unknown> = {}) {
    const r = await this.send('/api/products', 'POST', { ...productInput(), ...overrides });
    if (r.status() !== 201) throw new Error(`Create: ${r.status()} ${await r.text()}`);
    return (await r.json()).product;
  }
  async dispose() {
    await this.context.dispose();
  }
}
export function productInput() {
  return {
    name: `Test ${crypto.randomUUID()}`,
    description: 'Sản phẩm kiểm thử tự động.',
    descriptionHtml: '<p>Mô tả <strong>định dạng</strong></p>',
    price: 750000,
    originalPrice: 900000,
    category: 'Sneaker',
    subcategory: 'Kiểm thử',
    stockQuantity: 20,
    images: ['/images/shoe-sneaker.jpg'],
    sizes: ['40', '41'],
    colors: [{ name: 'Đen', hex: '#111111' }],
    inStock: true,
    featured: false,
    trending: false,
  };
}
export function orderInput(productId: string) {
  return {
    customerDetails: {
      name: 'Test Buyer',
      email: 'buyer@example.invalid',
      address: '123 Test Street',
      phone: '0900000000',
    },
    items: [{ productId, quantity: 1, size: '40', color: 'Đen' }],
    total: 790000,
    paymentMethod: 'COD',
  };
}
export function resetCode(email: string) {
  const dir = 'backend/storage/outbox';
  const matches = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')))
    .filter((m) => m.to === email && m.subject.includes('khôi phục'))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const code = matches[0]?.message.match(/\b[0-9]{6}\b/)?.[0];
  if (!code) throw new Error('Reset email not found');
  return code as string;
}
