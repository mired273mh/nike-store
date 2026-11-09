import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import { Client, dbHelper } from './helpers';
test.beforeAll(() => {
  dbHelper('reseed');
});
test.beforeEach(() => {
  dbHelper('clear-limits');
});
async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page.locator('form button[type=submit]').first().click();
}
test('catalog search, category, sorting and real page controls', async ({ page }) => {
  await page.goto('/products');
  await expect(page.locator('.product-card')).toHaveCount(9);
  await page.getByRole('button', { name: 'Trang 2', exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.locator('.product-card')).toHaveCount(5);
  await page.getByRole('button', { name: 'Giày Sneaker', exact: true }).click();
  await expect(page.locator('main')).toContainText('Hiển thị 2 sản phẩm');
  await expect(page.locator('.product-card')).toHaveCount(2);
  await page.goto('/products');
  await page.getByLabel('Tìm sản phẩm').fill('Pegasus');
  await page.getByRole('button', { name: 'Tìm', exact: true }).click();
  await expect(page.locator('.product-card')).toHaveCount(1);
  await expect(page.locator('.product-card')).toContainText('Pegasus');
  await page.goto('/products');
  await page.getByLabel('Sắp xếp sản phẩm').selectOption('price_asc');
  await expect(page).toHaveURL(/sort=price_asc/);
  await expect(page.locator('.product-card').first()).toContainText('650.000');
});
test('size selection, cart quantity, persistence and removal', async ({ page }) => {
  await page.goto('/products/nike-air-max-alpha-5');
  await page.getByRole('button', { name: 'Thêm vào giỏ hàng' }).click();
  await expect(
    page.getByText('* Vui lòng chọn size sản phẩm trước khi thêm vào giỏ hàng.'),
  ).toBeVisible();
  await page.getByRole('button', { name: '40', exact: true }).first().click();
  await page.getByRole('button', { name: 'Thêm vào giỏ hàng' }).click();
  await expect(page.getByText(/Đã thêm thành công/)).toBeVisible();
  await page.goto('/cart');
  await expect(page.locator('main')).toContainText('Nike Air Max Alpha Trainer 5');
  await page.getByRole('button', { name: /Tăng số lượng/ }).click();
  await expect(page.getByLabel('Số lượng', { exact: true })).toHaveText('2');
  await page.reload();
  await expect(page.getByLabel('Số lượng', { exact: true })).toHaveText('2');
  await page.getByRole('button', { name: /^Xóa Nike/ }).click();
  await expect(page.locator('main')).toContainText('Giỏ hàng của bạn đang trống.');
});
test('register and COD checkout through real PHP API', async ({ page }) => {
  const email = `browser-${crypto.randomUUID()}@example.invalid`;
  await page.goto('/login');
  await page.getByRole('button', { name: 'Đăng ký', exact: true }).first().click();
  await page.getByLabel('Họ và tên', { exact: true }).fill('Khách Browser');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill('BrowserPassword123!');
  await page.locator('form button[type=submit]').first().click();
  await expect(page).toHaveURL('/');
  await page.goto('/products/nike-air-max-alpha-5');
  await page.getByRole('button', { name: '40', exact: true }).first().click();
  await page.getByRole('button', { name: 'Thêm vào giỏ hàng' }).click();
  await expect(page.getByText(/Đã thêm thành công/)).toBeVisible();
  await page.goto('/cart');
  await page.getByLabel('Số điện thoại', { exact: true }).fill('0900000000');
  await page.getByLabel('Địa chỉ', { exact: true }).fill('123 Test Street');
  await page.getByRole('button', { name: 'Đặt hàng (COD)', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'ĐẶT HÀNG THÀNH CÔNG!' })).toBeVisible();
  await page.getByRole('link', { name: 'Xem đơn hàng', exact: true }).click();
  await expect(page.locator('main')).toContainText('Nike Air Max Alpha Trainer 5');
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Hủy đơn hàng', exact: true }).click();
  await expect(page.locator('main')).toContainText('Đã hủy');
});
test('logout removes cookie and browser cannot read old orders', async ({ page, context }) => {
  await login(page, 'user@premium.com', 'User123!');
  await expect(page).toHaveURL('/');
  expect((await context.cookies()).some((c) => c.name === 'auth_token')).toBeTruthy();
  await page.getByTitle('Đăng xuất', { exact: true }).click();
  await expect(page.getByRole('link', { name: 'User Account', exact: true })).toBeVisible();
  expect((await context.cookies()).some((c) => c.name === 'auth_token')).toBeFalsy();
  expect(await page.evaluate(async () => (await fetch('/api/orders')).status)).toBe(401);
  await page.reload();
  await expect(page.getByRole('link', { name: 'User Account', exact: true })).toBeVisible();
});
test('localStorage role forgery does not grant admin', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'premium_user',
      JSON.stringify({ id: 'usr-1', role: 'admin', name: 'Fake Admin' }),
    ),
  );
  await page.goto('/admin');
  await expect(page.locator('main')).toContainText('Bạn cần đăng nhập bằng tài khoản quản trị.');
  await expect(page.getByRole('button', { name: 'Thêm sản phẩm', exact: true })).toHaveCount(0);
});
test('corrupted local cart is discarded without runtime errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() =>
    localStorage.setItem(
      'premium_cart',
      JSON.stringify([{ product: { id: 'invalid', price: {}, images: [] }, quantity: -1 }]),
    ),
  );
  await page.goto('/cart');
  await expect(page.locator('main')).toContainText('Giỏ hàng của bạn đang trống.');
  expect(errors).toEqual([]);
});
test('admin editor creates, uploads, updates and deletes a product', async ({ page }) => {
  await login(page, 'admin@premium.com', 'Admin123!');
  await expect(page).toHaveURL('/admin');
  await page.getByRole('button', { name: 'Sản phẩm', exact: true }).click();
  await page.getByRole('button', { name: 'Thêm sản phẩm', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const name = `Browser Product ${Date.now()}`;
  await dialog.getByLabel('Tên sản phẩm', { exact: true }).fill(name);
  await dialog.getByLabel('Giá bán (đ)', { exact: true }).fill('650000');
  await dialog.getByLabel('Phân loại', { exact: true }).fill('Giày demo');
  await dialog
    .getByRole('textbox', { name: 'Mô tả sản phẩm', exact: true })
    .fill('Mô tả sản phẩm qua trình soạn thảo.');
  await dialog
    .getByLabel('Upload nhiều ảnh', { exact: true })
    .setInputFiles(['public/images/shoe-running.jpg', 'public/images/shoe-sneaker.jpg']);
  await expect(dialog.getByLabel(/Đường dẫn ảnh/)).toHaveValue(/\/uploads\/.*\n\/uploads\//);
  await dialog.getByRole('button', { name: 'Lưu sản phẩm', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByLabel('Tìm trong trang quản trị').fill(name);
  await expect(page.locator('article')).toHaveCount(1);
  await page.getByRole('button', { name: `Sửa ${name}`, exact: true }).click();
  await page.getByRole('dialog').getByLabel('Giá bán (đ)', { exact: true }).fill('680000');
  await page.getByRole('button', { name: 'Lưu sản phẩm', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('article')).toContainText('680.000');
  page.on('dialog', (d) => d.accept());
  await page.getByRole('button', { name: `Xóa ${name}`, exact: true }).click();
  await expect(page.locator('article')).toHaveCount(0);
  await expect(page.locator('main')).toContainText('Không có dữ liệu phù hợp.');
});
test('admin advances order and confirms COD payment', async ({ page }) => {
  const c = await Client.create();
  await c.register();
  const catalog = await (await c.send('/api/products')).json();
  const p = catalog.find((p: { id: string }) => p.id === 'nike-air-max-alpha-5');
  const created = await c.send('/api/orders', 'POST', {
    customerDetails: {
      name: 'Browser Buyer',
      email: 'browser-buyer@example.invalid',
      address: '123 Test Street',
      phone: '0900000000',
    },
    items: [{ productId: p.id, quantity: 1, size: p.sizes[0], color: p.colors[0].name }],
    total: p.price,
    paymentMethod: 'COD',
  });
  expect(created.status()).toBe(201);
  const id = (await created.json()).order.id;
  await login(page, 'admin@premium.com', 'Admin123!');
  await expect(page).toHaveURL('/admin');
  await page.getByLabel('Tìm trong trang quản trị').fill(id);
  page.on('dialog', (d) => d.accept());
  const order = page.locator('article');
  await expect(order).toHaveCount(1);
  for (const name of ['Đang xử lý', 'Đang giao', 'Đã giao', 'Xác nhận đã thu tiền'])
    await order.getByRole('button', { name, exact: true }).click();
  await expect(order).toContainText('Đã thanh toán');
  await expect(page.locator('main')).toContainText('2.450.000đ');
  await c.dispose();
});
test('newsletter subscription is persisted via API', async ({ page }) => {
  await page.goto('/');
  await page
    .getByLabel('Email nhận bản tin', { exact: true })
    .fill(`browser-${Date.now()}@example.invalid`);
  await page.locator('footer').getByRole('button', { name: 'Gửi', exact: true }).click();
  await expect(page.locator('footer')).toContainText('Đã đăng ký nhận bản tin.');
});
for (const width of [390, 768, 1440])
  test(`responsive pages at ${width}px with no horizontal overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      '/',
      '/products',
      '/products/nike-air-max-alpha-5',
      '/cart',
      '/login',
      '/orders',
      '/policies',
    ]) {
      await page.goto(route);
      await expect(page.locator('main')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        width + 1,
      );
    }
    if (width === 390) {
      await page.goto('/products');
      await page.getByRole('button', { name: 'Bộ lọc', exact: true }).click();
      await expect(page.getByRole('dialog', { name: 'Bộ lọc sản phẩm' })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await page.getByRole('button', { name: 'Toggle Menu', exact: true }).click();
      await expect(page.getByRole('link', { name: 'Trang Chủ', exact: true }).last()).toBeVisible();
    }
  });
test('authenticated admin stays responsive on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, 'admin@premium.com', 'Admin123!');
  await expect(page).toHaveURL('/admin');
  await expect(page.locator('main')).toContainText('Doanh thu đã thu');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.getByRole('button', { name: 'Sản phẩm', exact: true }).click();
  await page.getByRole('button', { name: 'Thêm sản phẩm', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});
test('main flows do not produce JavaScript runtime errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const route of [
    '/',
    '/products',
    '/products/nike-air-max-alpha-5',
    '/cart',
    '/login',
    '/orders',
    '/admin',
  ])
    await page.goto(route);
  await login(page, 'user@premium.com', 'User123!');
  await expect(page).toHaveURL('/');
  await page.goto('/orders');
  await expect(page.getByRole('heading', { name: 'Đơn hàng của tôi' })).toBeVisible();
  expect(errors).toEqual([]);
});
test('capture current desktop and mobile screens', async ({ page }) => {
  fs.mkdirSync('review-results/after', { recursive: true });
  await page.goto('/products');
  await expect(page.locator('.product-card').first()).toBeVisible();
  await expect(page.locator('.product-card').first()).toHaveCSS('opacity', '1');
  await page.screenshot({ path: 'review-results/after/desktop-products.png', fullPage: false });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.locator('.product-card').first()).toBeVisible();
  await expect(page.locator('.product-card').first()).toHaveCSS('opacity', '1');
  await page.screenshot({ path: 'review-results/after/mobile-products.png', fullPage: false });
});
