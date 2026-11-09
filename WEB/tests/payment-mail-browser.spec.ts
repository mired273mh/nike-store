import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import { Client, dbHelper, orderInput } from './helpers';

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
test('customer selects demo QR, sees a local QR image and can reopen it from order history', async ({
  page,
}) => {
  const client = await Client.create();
  const account = await client.register();
  await client.dispose();
  await login(page, account.email, account.password);
  await expect(page).toHaveURL('/');
  await page.goto('/products/nike-air-max-alpha-5');
  await page.getByRole('button', { name: '40', exact: true }).first().click();
  await page.getByRole('button', { name: 'Thêm vào giỏ hàng' }).click();
  await expect(page.getByText(/Đã thêm thành công/)).toBeVisible();
  await page.goto('/cart');
  await page.getByLabel('Số điện thoại', { exact: true }).fill('0900000000');
  await page.getByLabel('Địa chỉ', { exact: true }).fill('123 Test Street');
  await page.getByRole('radio', { name: 'QR ngân hàng (demo)', exact: true }).check();
  await page.getByRole('button', { name: 'Đặt hàng & xem QR', exact: true }).click();
  const qr = page.getByRole('region', { name: 'Thanh toán QR', exact: true });
  await expect(qr).toContainText('không chuyển tiền thật');
  await expect(qr).toContainText('DEMO-000123456');
  await expect(qr).toContainText('2.450.000đ');
  await expect(qr.getByRole('img')).toHaveAttribute('src', /^data:image\/png;base64,/);
  fs.mkdirSync('review-results/after', { recursive: true });
  await page.screenshot({ path: 'review-results/after/qr-demo-checkout.png', fullPage: true });
  await page.getByRole('link', { name: 'Xem đơn hàng', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Thanh toán QR', exact: true })).toBeVisible();
  await expect(page.locator('main')).toContainText('Cửa hàng chưa bật gửi email thật.');
});
test('Admin previews the email, adds a message and records a simulated delivery', async ({
  page,
}) => {
  const admin = await Client.create();
  await admin.admin();
  const product = await admin.product();
  const buyer = await Client.create();
  await buyer.register();
  const r = await buyer.send('/api/orders', 'POST', orderInput(product.id));
  const order = (await r.json()).order;
  await login(page, 'admin@premium.com', 'Admin123!');
  await expect(page).toHaveURL('/admin');
  await page.getByLabel('Tìm trong trang quản trị').fill(order.id);
  await page.getByRole('button', { name: 'Xem / gửi email', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'EMAIL THÔNG BÁO ĐƠN HÀNG', exact: true });
  await expect(dialog).toContainText('buyer@example.invalid');
  await dialog
    .getByLabel('Lời nhắn của Admin cho khách')
    .fill('Đơn của bạn đang được chuẩn bị. Cảm ơn bạn!');
  await dialog.getByRole('button', { name: 'Cập nhật bản xem trước', exact: true }).click();
  await expect(
    page.frameLocator('iframe[title="Bản xem trước email gửi khách"]').locator('body'),
  ).toContainText('Đơn của bạn đang được chuẩn bị. Cảm ơn bạn!');
  await dialog.getByRole('button', { name: 'Lưu thư mô phỏng', exact: true }).click();
  await expect(dialog.getByRole('status')).toContainText('Đã tạo thư mô phỏng.');
  await expect(dialog.locator('li')).toHaveCount(2);
  await page.screenshot({ path: 'review-results/after/admin-email-preview.png', fullPage: false });
  await admin.dispose();
  await buyer.dispose();
});
test('Admin saves email configuration without exposing the saved password', async ({ page }) => {
  await login(page, 'admin@premium.com', 'Admin123!');
  await expect(page).toHaveURL('/admin');
  await page.getByRole('button', { name: 'Cấu hình QR & Email', exact: true }).click();
  await expect(page.getByLabel('Chế độ ngân hàng')).toHaveValue('demo');
  await page.getByLabel('Email gửi thông báo', { exact: true }).fill('sender@example.invalid');
  await page
    .getByLabel('Email Admin nhận khiếu nại', { exact: true })
    .fill('admin@example.invalid');
  await page.getByLabel('Tài khoản SMTP', { exact: true }).fill('sender@example.invalid');
  await page.getByLabel('Mật khẩu ứng dụng Gmail', { exact: true }).fill('SyntheticPassword123!');
  await page.getByRole('button', { name: 'Lưu cấu hình QR & Email', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Đã lưu cấu hình.');
  await expect(page.getByLabel('Mật khẩu ứng dụng Gmail', { exact: true })).toHaveValue('');
  await page.getByLabel('Email nhận thử', { exact: true }).fill('self@example.invalid');
  await page.getByRole('button', { name: 'Gửi email thử', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Đã tạo thư mô phỏng.');
});
test('QR and email settings remain usable on a 390px screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, 'admin@premium.com', 'Admin123!');
  await expect(page).toHaveURL('/admin');
  await page.getByRole('button', { name: 'Cấu hình QR & Email', exact: true }).click();
  await expect(page.getByLabel('Mật khẩu ứng dụng Gmail', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});
