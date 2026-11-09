import { test, expect, request } from '@playwright/test';
import { Client, dbHelper, productInput, orderInput, resetCode, apiOrigin } from './helpers';
test.beforeEach(() => {
  dbHelper('clear-limits');
});

test('PHP + MySQL health', async () => {
  const r = await (await request.newContext()).get(`${apiOrigin}/api/health`);
  expect(await r.json()).toEqual({ status: 'ok', backend: 'PHP', database: 'MySQL' });
});
test('public catalog filters, sorting and pagination', async () => {
  const c = await Client.create();
  const all = await (await c.send('/api/products')).json();
  expect(all.length).toBeGreaterThan(0);
  const page = await (await c.send('/api/products?page=1&perPage=3&sort=price_asc')).json();
  expect(page.products).toHaveLength(3);
  expect(page.total).toBe(all.length);
  expect(page.totalPages).toBe(Math.ceil(all.length / 3));
  expect(page.products[0].price).toBeLessThanOrEqual(page.products[1].price);
  const filtered = await (await c.send('/api/products?category=Sneaker&search=Nike')).json();
  expect(filtered.length).toBeGreaterThan(0);
  expect(
    filtered.every(
      (p: { category: string; name: string }) =>
        p.category === 'Sneaker' && p.name.includes('Nike'),
    ),
  ).toBeTruthy();
  await c.dispose();
});
test('missing product returns 404', async () => {
  const c = await Client.create();
  expect((await c.send('/api/products/missing-test')).status()).toBe(404);
  await c.dispose();
});
test('register, server session and password hash', async () => {
  const c = await Client.create();
  const a = await c.register();
  const s = await (await c.send('/api/auth/session')).json();
  expect(s.user.email).toBe(a.email);
  expect(s.user.role).toBe('user');
  const stored = JSON.parse(dbHelper('inspect')).passwords.find(
    (p: { id: string }) => p.id === a.user.id,
  );
  expect(stored.password_hash).not.toBe(a.password);
  expect(stored.password_hash).toMatch(/^\$2[ayb]\$/);
  await c.dispose();
});
test('duplicate and case-insensitive email registration rejected', async () => {
  const c = await Client.create();
  const a = await c.register();
  expect(
    (
      await c.send('/api/auth/register', 'POST', {
        name: 'Other',
        email: a.email.toUpperCase(),
        password: a.password,
      })
    ).status(),
  ).toBe(409);
  await c.dispose();
});
for (const [field, value] of [
  ['email', 'not-an-email'],
  ['password', 'short'],
  ['name', ''],
] as const)
  test(`invalid registration ${field}`, async () => {
    const c = await Client.create();
    expect(
      (
        await c.send('/api/auth/register', 'POST', {
          name: 'Test',
          email: 'valid@example.invalid',
          password: 'LongPassword123!',
          [field]: value,
        })
      ).status(),
    ).toBe(400);
    await c.dispose();
  });
test('wrong credentials rejected', async () => {
  const c = await Client.create();
  expect(
    (
      await c.send('/api/auth/login', 'POST', { email: 'admin@premium.com', password: 'wrong' })
    ).status(),
  ).toBe(401);
  await c.dispose();
});
test('auth token is random, HttpOnly and SameSite', async () => {
  const c = await Client.create();
  const r = await c.send('/api/auth/login', 'POST', {
    email: 'admin@premium.com',
    password: 'Admin123!',
  });
  const cookie = r.headers()['set-cookie'];
  expect(cookie).toMatch(/auth_token=[a-f0-9]{64}/);
  expect(cookie).toContain('HttpOnly');
  expect(cookie).toContain('SameSite=Lax');
  expect(cookie).not.toContain('usr-1');
  await c.dispose();
});
test('session rotates after login', async () => {
  const c = await Client.create();
  const before = (await c.context.storageState()).cookies.find(
    (c) => c.name === 'auth_token',
  )!.value;
  await c.admin();
  const after = (await c.context.storageState()).cookies.find(
    (c) => c.name === 'auth_token',
  )!.value;
  expect(after).not.toBe(before);
  const replay = await request.newContext({ extraHTTPHeaders: { Cookie: `auth_token=${before}` } });
  expect((await replay.get(`${apiOrigin}/api/orders`)).status()).toBe(401);
  await replay.dispose();
  await c.dispose();
});
test('logout revokes session and replayed cookie', async () => {
  const c = await Client.create();
  await c.admin();
  const token = (await c.context.storageState()).cookies.find(
    (c) => c.name === 'auth_token',
  )!.value;
  expect((await c.send('/api/auth/logout', 'POST', {})).status()).toBe(200);
  expect((await c.send('/api/orders')).status()).toBe(401);
  const replay = await request.newContext({ extraHTTPHeaders: { Cookie: `auth_token=${token}` } });
  expect((await replay.get(`${apiOrigin}/api/orders`)).status()).toBe(401);
  await replay.dispose();
  await c.dispose();
});
test('query userId cannot expose orders without login', async () => {
  const c = await Client.create();
  expect((await c.send('/api/orders?userId=usr-1')).status()).toBe(401);
  await c.dispose();
});
test('old mock token cannot grant admin', async () => {
  const r = await request.newContext({
    baseURL: apiOrigin,
    extraHTTPHeaders: { Cookie: 'auth_token=mock-token-usr-1' },
  });
  expect(
    (await r.put('/api/products', { data: { productIds: ['x'], inStock: false } })).status(),
  ).toBe(401);
  expect((await r.get('/api/orders?userId=usr-1')).status()).toBe(401);
  await r.dispose();
});
test('missing and wrong CSRF rejected', async () => {
  const c = await Client.create();
  await c.admin();
  expect((await c.context.post('/api/products', { data: productInput() })).status()).toBe(403);
  expect(
    (await c.send('/api/products', 'POST', productInput(), { 'X-CSRF-Token': 'bad' })).status(),
  ).toBe(403);
  await c.dispose();
});
test('cross-origin mutation rejected', async () => {
  const c = await Client.create();
  await c.admin();
  expect(
    (
      await c.send('/api/products', 'POST', productInput(), { Origin: 'https://evil.example' })
    ).status(),
  ).toBe(403);
  await c.dispose();
});
test('ordinary user cannot mutate products or upload', async () => {
  const c = await Client.create();
  await c.register();
  expect((await c.send('/api/products', 'POST', productInput())).status()).toBe(403);
  expect((await c.send('/api/products/x', 'DELETE')).status()).toBe(403);
  expect((await c.send('/api/uploads', 'POST')).status()).toBe(403);
  await c.dispose();
});
test('product full CRUD persists content and images', async () => {
  const c = await Client.create();
  await c.admin();
  const p = await c.product();
  const r = await c.send(`/api/products/${p.id}`, 'PUT', {
    name: 'Updated product',
    price: 880000,
    description: 'Updated description',
    descriptionHtml: '<p><strong>Updated</strong></p>',
    images: ['/images/hoodie.jpg', '/images/tee.jpg'],
    version: p.version,
  });
  expect(r.status()).toBe(200);
  const updated = (await r.json()).product;
  expect(updated.name).toBe('Updated product');
  expect(updated.images).toHaveLength(2);
  expect(updated.price).toBe(880000);
  expect(updated.descriptionHtml).toContain('<strong>');
  expect((await c.send(`/api/products/${p.id}`, 'DELETE')).status()).toBe(200);
  expect((await c.send(`/api/products/${p.id}`)).status()).toBe(404);
  await c.dispose();
});
for (const [field, value] of [
  ['price', -1],
  ['price', 1.5],
  ['stockQuantity', -1],
  ['category', 'Invalid'],
  ['sizes', []],
  ['colors', [{ name: 'Bad', hex: 'red' }]],
  ['images', ['javascript:alert(1)']],
  ['inStock', 'true'],
] as const)
  test(`validate product ${field} ${JSON.stringify(value)}`, async () => {
    const c = await Client.create();
    await c.admin();
    expect(
      (await c.send('/api/products', 'POST', { ...productInput(), [field]: value })).status(),
    ).toBe(400);
    await c.dispose();
  });
test('product editor strips active HTML and attributes', async () => {
  const c = await Client.create();
  await c.admin();
  const p = await c.product({
    descriptionHtml:
      '<p onclick="alert(1)">Safe<strong style="color:red">bold</strong><img src=x onerror=alert(1)></p><script>alert(1)</script>',
  });
  expect(p.descriptionHtml).toBe('<p>Safe<strong>bold</strong></p>');
  await c.dispose();
});
test('optimistic product version prevents overwrite', async () => {
  const c = await Client.create();
  await c.admin();
  const p = await c.product();
  expect(
    (
      await c.send(`/api/products/${p.id}`, 'PUT', { name: 'First update', version: p.version })
    ).status(),
  ).toBe(200);
  expect(
    (
      await c.send(`/api/products/${p.id}`, 'PUT', { name: 'Stale update', version: p.version })
    ).status(),
  ).toBe(409);
  await c.dispose();
});
test('hidden products excluded from public list and detail', async () => {
  const admin = await Client.create();
  await admin.admin();
  const p = await admin.product({ inStock: false });
  const c = await Client.create();
  expect((await c.send(`/api/products/${p.id}`)).status()).toBe(404);
  const list = await (await c.send('/api/products')).json();
  expect(list.some((r: { id: string }) => r.id === p.id)).toBeFalsy();
  expect((await admin.send(`/api/products/${p.id}`)).status()).toBe(200);
  await admin.dispose();
  await c.dispose();
});
test('batch hide, show and delete', async () => {
  const c = await Client.create();
  await c.admin();
  const a = await c.product(),
    b = await c.product();
  for (const inStock of [false, true]) {
    expect(
      (await c.send('/api/products', 'PUT', { productIds: [a.id, b.id], inStock })).status(),
    ).toBe(200);
    expect((await (await c.send(`/api/products/${a.id}`)).json()).inStock).toBe(inStock);
  }
  expect((await c.send('/api/products', 'DELETE', { productIds: [a.id, b.id] })).status()).toBe(
    200,
  );
  expect((await c.send(`/api/products/${b.id}`)).status()).toBe(404);
  await c.dispose();
});
test('real multipart multi-image upload and safe serving', async () => {
  const c = await Client.create();
  await c.admin();
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jQioAAAAASUVORK5CYII=',
    'base64',
  );
  const response = await c.context.post('/api/uploads', {
    headers: { 'X-CSRF-Token': c.csrf },
    multipart: {
      'images[0]': { name: 'one.png', mimeType: 'image/png', buffer: png },
      'images[1]': { name: 'two.png', mimeType: 'image/png', buffer: png },
    },
  });
  expect(response.status()).toBe(201);
  const images = (await response.json()).images;
  expect(images).toHaveLength(2);
  expect(images[0]).not.toBe(images[1]);
  const served = await c.send(images[0]);
  expect(served.headers()['content-type']).toBe('image/png');
  expect(served.headers()['x-content-type-options']).toBe('nosniff');
  await c.dispose();
});
test('reject executable disguised as image', async () => {
  const c = await Client.create();
  await c.admin();
  const r = await c.context.post('/api/uploads', {
    headers: { 'X-CSRF-Token': c.csrf },
    multipart: {
      'images[0]': {
        name: 'shell.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('<?php echo "bad"; ?>'),
      },
    },
  });
  expect(r.status()).toBe(400);
  await c.dispose();
});
test('reject SVG uploads', async () => {
  const c = await Client.create();
  await c.admin();
  const r = await c.context.post('/api/uploads', {
    headers: { 'X-CSRF-Token': c.csrf },
    multipart: {
      'images[0]': {
        name: 'x.svg',
        mimeType: 'image/svg+xml',
        buffer: Buffer.from('<svg onload="alert(1)"></svg>'),
      },
    },
  });
  expect(r.status()).toBe(400);
  await c.dispose();
});
test('private storage and traversal are not publicly served', async () => {
  const c = await Client.create();
  for (const url of [
    '/storage/legacy-import.json',
    '/storage/outbox',
    '/.env',
    '/uploads/..%2f.env',
  ])
    expect((await c.send(url)).status()).toBe(404);
  await c.dispose();
});
test('order requires login and cannot spoof another owner', async () => {
  const c = await Client.create();
  expect((await c.send('/api/orders', 'POST', orderInput('x'))).status()).toBe(401);
  await c.register();
  expect(
    (await c.send('/api/orders', 'POST', { ...orderInput('x'), userId: 'usr-1' })).status(),
  ).toBe(403);
  await c.dispose();
});
test('canonical pricing, snapshot and inventory reservation', async () => {
  const admin = await Client.create();
  await admin.admin();
  const p = await admin.product();
  const c = await Client.create();
  await c.register();
  const r = await c.send('/api/orders', 'POST', {
    ...orderInput(p.id),
    items: [
      { productId: p.id, size: '40', color: 'Đen', quantity: 1, price: 1, name: 'Fake Name' },
    ],
  });
  expect(r.status()).toBe(201);
  const o = (await r.json()).order;
  expect(o.total).toBe(790000);
  expect(o.items[0].price).toBe(750000);
  expect(o.items[0].name).toBe(p.name);
  expect((await (await admin.send(`/api/products/${p.id}`)).json()).stockQuantity).toBe(19);
  await c.dispose();
  await admin.dispose();
});
for (const [name, alter, expected] of [
  ['tampered total', { total: 1 }, 400],
  [
    'negative quantity',
    { items: [{ productId: 'PID', size: '40', color: 'Đen', quantity: -1 }] },
    400,
  ],
  [
    'fractional quantity',
    { items: [{ productId: 'PID', size: '40', color: 'Đen', quantity: 1.2 }] },
    400,
  ],
  [
    'unknown product',
    { items: [{ productId: 'missing', size: '40', color: 'Đen', quantity: 1 }] },
    404,
  ],
  ['unknown size', { items: [{ productId: 'PID', size: '99', color: 'Đen', quantity: 1 }] }, 400],
  [
    'unknown color',
    { items: [{ productId: 'PID', size: '40', color: 'Invalid', quantity: 1 }] },
    400,
  ],
  [
    'insufficient stock',
    { items: [{ productId: 'PID', size: '40', color: 'Đen', quantity: 21 }] },
    409,
  ],
  ['unsupported payment', { paymentMethod: 'VNPAY' }, 400],
] as const)
  test(`reject order ${name}`, async () => {
    const admin = await Client.create();
    await admin.admin();
    const p = await admin.product();
    const c = await Client.create();
    await c.register();
    const altered = JSON.parse(JSON.stringify(alter).replaceAll('PID', p.id));
    expect(
      (await c.send('/api/orders', 'POST', { ...orderInput(p.id), ...altered })).status(),
    ).toBe(expected);
    expect((await (await admin.send(`/api/products/${p.id}`)).json()).stockQuantity).toBe(20);
    await c.dispose();
    await admin.dispose();
  });
test('duplicate lines cannot bypass available stock', async () => {
  const admin = await Client.create();
  await admin.admin();
  const p = await admin.product({ stockQuantity: 1 });
  const c = await Client.create();
  await c.register();
  const line = { productId: p.id, size: '40', color: 'Đen', quantity: 1 };
  expect(
    (
      await c.send('/api/orders', 'POST', {
        ...orderInput(p.id),
        items: [line, line],
        total: 1500000,
      })
    ).status(),
  ).toBe(409);
  await c.dispose();
  await admin.dispose();
});
test('order ownership blocks reading and writing another account order', async () => {
  const admin = await Client.create();
  await admin.admin();
  const p = await admin.product();
  const a = await Client.create(),
    b = await Client.create();
  const account = await a.register();
  await b.register();
  const order = (await (await a.send('/api/orders', 'POST', orderInput(p.id))).json()).order;
  const orders = await (await b.send('/api/orders?userId=' + account.user.id)).json();
  expect(orders.some((o: { id: string }) => o.id === order.id)).toBeFalsy();
  expect(
    (await b.send('/api/orders', 'PUT', { orderId: order.id, status: 'Cancelled' })).status(),
  ).toBe(403);
  await a.dispose();
  await b.dispose();
  await admin.dispose();
});
test('cancel pending order restores stock once', async () => {
  const admin = await Client.create();
  await admin.admin();
  const p = await admin.product();
  const c = await Client.create();
  await c.register();
  const order = (await (await c.send('/api/orders', 'POST', orderInput(p.id))).json()).order;
  expect(
    (await c.send('/api/orders', 'PUT', { orderId: order.id, status: 'Cancelled' })).status(),
  ).toBe(200);
  expect(
    (await c.send('/api/orders', 'PUT', { orderId: order.id, status: 'Cancelled' })).status(),
  ).toBe(403);
  expect((await (await admin.send(`/api/products/${p.id}`)).json()).stockQuantity).toBe(20);
  await c.dispose();
  await admin.dispose();
});
test('order transitions and COD collection require admin confirmation', async () => {
  const admin = await Client.create();
  await admin.admin();
  const p = await admin.product();
  const c = await Client.create();
  await c.register();
  const order = (await (await c.send('/api/orders', 'POST', orderInput(p.id))).json()).order;
  expect(
    (await admin.send('/api/orders', 'PUT', { orderId: order.id, status: 'Delivered' })).status(),
  ).toBe(409);
  expect(
    (await admin.send('/api/orders', 'PUT', { orderId: order.id, paymentStatus: 'Paid' })).status(),
  ).toBe(409);
  for (const status of ['Processing', 'Shipped', 'Delivered'])
    expect((await admin.send('/api/orders', 'PUT', { orderId: order.id, status })).status()).toBe(
      200,
    );
  expect(
    (await admin.send('/api/orders', 'PUT', { orderId: order.id, paymentStatus: 'Paid' })).status(),
  ).toBe(200);
  expect(
    (await admin.send('/api/orders', 'PUT', { orderId: order.id, status: 'Pending' })).status(),
  ).toBe(409);
  await c.dispose();
  await admin.dispose();
});
test('customer cannot mark own online order paid or inject Delivered', async () => {
  const admin = await Client.create();
  await admin.admin();
  const p = await admin.product();
  const c = await Client.create();
  await c.register();
  const order = (
    await (
      await c.send('/api/orders', 'POST', { ...orderInput(p.id), paymentMethod: 'BANK' })
    ).json()
  ).order;
  expect(
    (
      await c.send('/api/orders', 'PUT', {
        orderId: order.id,
        paymentStatus: 'Paid',
        status: 'Delivered',
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await c.send('/api/orders', 'PUT', {
        orderId: order.id,
        status: 'Cancelled',
        paymentStatus: 'Paid',
      })
    ).status(),
  ).toBe(403);
  await c.dispose();
  await admin.dispose();
});
test('customer receipt confirmation and not-received report', async () => {
  const admin = await Client.create();
  await admin.admin();
  const p = await admin.product();
  const c = await Client.create();
  await c.register();
  const order = (await (await c.send('/api/orders', 'POST', orderInput(p.id))).json()).order;
  expect(
    (
      await c.send('/api/orders', 'PUT', { orderId: order.id, userConfirmedReceived: true })
    ).status(),
  ).toBe(409);
  for (const status of ['Processing', 'Shipped', 'Delivered'])
    await admin.send('/api/orders', 'PUT', { orderId: order.id, status });
  const report = await c.send('/api/orders', 'PUT', {
    orderId: order.id,
    reportedNotReceived: true,
  });
  expect(report.status()).toBe(200);
  expect((await report.json()).order.reportedNotReceived).toBe(true);
  const received = await c.send('/api/orders', 'PUT', {
    orderId: order.id,
    userConfirmedReceived: true,
  });
  expect(received.status()).toBe(200);
  expect((await received.json()).order.reportedNotReceived).toBe(false);
  await c.dispose();
  await admin.dispose();
});
test('deleting ordered product preserves order snapshot', async () => {
  const admin = await Client.create();
  await admin.admin();
  const p = await admin.product();
  const c = await Client.create();
  await c.register();
  const order = (await (await c.send('/api/orders', 'POST', orderInput(p.id))).json()).order;
  await admin.send(`/api/products/${p.id}`, 'DELETE');
  const saved = (await (await c.send('/api/orders')).json()).find(
    (o: { id: string }) => o.id === order.id,
  );
  expect(saved.items[0].name).toBe(p.name);
  expect(saved.items[0].productId).toBeNull();
  await c.dispose();
  await admin.dispose();
});
test('concurrent purchase cannot oversell final unit', async () => {
  const admin = await Client.create();
  await admin.admin();
  const p = await admin.product({ stockQuantity: 1 });
  const a = await Client.create(),
    b = await Client.create();
  await a.register();
  await b.register();
  const responses = await Promise.all([
    a.send('/api/orders', 'POST', orderInput(p.id)),
    b.send('http://127.0.0.1:8002/api/orders', 'POST', orderInput(p.id)),
  ]);
  expect(responses.map((r) => r.status()).sort()).toEqual([201, 409]);
  const item = await (await admin.send(`/api/products/${p.id}`)).json();
  expect(item.stockQuantity).toBe(0);
  expect(item.inStock).toBe(false);
  await a.dispose();
  await b.dispose();
  await admin.dispose();
});
test('fixed OTP without issuance cannot reset password', async () => {
  const c = await Client.create();
  const a = await c.register();
  expect(
    (
      await c.send('/api/auth/reset-password', 'POST', {
        email: a.email,
        otp: '123456',
        newPassword: 'ChangedPassword123!',
      })
    ).status(),
  ).toBe(400);
  await c.dispose();
});
test('real OTP is one-use, rotates password and revokes old sessions', async () => {
  const c = await Client.create();
  const a = await c.register();
  await c.send('/api/auth/reset-password', 'POST', { email: a.email, checkEmailOnly: true });
  const code = resetCode(a.email);
  const r = await c.send('/api/auth/reset-password', 'POST', {
    email: a.email,
    otp: code,
    newPassword: 'ChangedPassword123!',
  });
  expect(r.status()).toBe(200);
  expect((await c.send('/api/orders')).status()).toBe(401);
  const next = await Client.create();
  expect(
    (
      await next.send('/api/auth/reset-password', 'POST', {
        email: a.email,
        otp: code,
        newPassword: 'AnotherPassword123!',
      })
    ).status(),
  ).toBe(400);
  expect(
    (await next.send('/api/auth/login', 'POST', { email: a.email, password: a.password })).status(),
  ).toBe(401);
  expect(
    (
      await next.send('/api/auth/login', 'POST', {
        email: a.email,
        password: 'ChangedPassword123!',
      })
    ).status(),
  ).toBe(200);
  await c.dispose();
  await next.dispose();
});
test('expired OTP rejected', async () => {
  const c = await Client.create();
  const a = await c.register();
  await c.send('/api/auth/reset-password', 'POST', { email: a.email, checkEmailOnly: true });
  const code = resetCode(a.email);
  dbHelper('expire-reset');
  expect(
    (
      await c.send('/api/auth/reset-password', 'POST', {
        email: a.email,
        otp: code,
        newPassword: 'ChangedPassword123!',
      })
    ).status(),
  ).toBe(400);
  await c.dispose();
});
test('OTP locks after five wrong attempts', async () => {
  const c = await Client.create();
  const a = await c.register();
  await c.send('/api/auth/reset-password', 'POST', { email: a.email, checkEmailOnly: true });
  const code = resetCode(a.email);
  const wrong = code === '111111' ? '222222' : '111111';
  for (let i = 0; i < 5; i++)
    expect(
      (
        await c.send('/api/auth/reset-password', 'POST', {
          email: a.email,
          otp: wrong,
          newPassword: 'ChangedPassword123!',
        })
      ).status(),
    ).toBe(400);
  expect(
    (
      await c.send('/api/auth/reset-password', 'POST', {
        email: a.email,
        otp: code,
        newPassword: 'ChangedPassword123!',
      })
    ).status(),
  ).toBe(400);
  await c.dispose();
});
test('reset request does not enumerate email', async () => {
  const c = await Client.create();
  const a = await c.register();
  const x = await (
      await c.send('/api/auth/reset-password', 'POST', { email: a.email, checkEmailOnly: true })
    ).json(),
    y = await (
      await c.send('/api/auth/reset-password', 'POST', {
        email: 'unknown@example.invalid',
        checkEmailOnly: true,
      })
    ).json();
  expect(x).toEqual(y);
  await c.dispose();
});
test('login throttle returns 429', async () => {
  const c = await Client.create();
  for (let i = 0; i < 20; i++)
    expect(
      (
        await c.send('/api/auth/login', 'POST', {
          email: 'unknown@example.invalid',
          password: 'wrong',
        })
      ).status(),
    ).toBe(401);
  expect(
    (
      await c.send('/api/auth/login', 'POST', {
        email: 'unknown@example.invalid',
        password: 'wrong',
      })
    ).status(),
  ).toBe(429);
  await c.dispose();
});
test('malformed JSON is 400 without stack disclosure', async () => {
  const c = await Client.create();
  const r = await c.context.post('/api/auth/login', {
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': c.csrf },
    data: '{invalid',
  });
  expect(r.status()).toBe(400);
  expect(await r.text()).not.toContain('Stack trace');
  await c.dispose();
});
test('newsletter validates and accepts subscription idempotently', async () => {
  const c = await Client.create();
  expect((await c.send('/api/newsletter', 'POST', { email: 'invalid' })).status()).toBe(400);
  for (let i = 0; i < 2; i++)
    expect(
      (await c.send('/api/newsletter', 'POST', { email: 'subscriber@example.invalid' })).status(),
    ).toBe(200);
  await c.dispose();
});
test('cancellation preserves a product explicitly hidden by admin', async () => {
  const a = await Client.create();
  await a.admin();
  const p = await a.product();
  const c = await Client.create();
  await c.register();
  const o = (await (await c.send('/api/orders', 'POST', orderInput(p.id))).json()).order;
  await a.send(`/api/products/${p.id}`, 'PUT', { inStock: false });
  expect(
    (await c.send('/api/orders', 'PUT', { orderId: o.id, status: 'Cancelled' })).status(),
  ).toBe(200);
  const updated = await (await a.send(`/api/products/${p.id}`)).json();
  expect(updated.stockQuantity).toBe(20);
  expect(updated.inStock).toBe(false);
  await a.dispose();
  await c.dispose();
});
test('last-unit cancellation restores availability', async () => {
  const a = await Client.create();
  await a.admin();
  const p = await a.product({ stockQuantity: 1 });
  const c = await Client.create();
  await c.register();
  const o = (await (await c.send('/api/orders', 'POST', orderInput(p.id))).json()).order;
  await c.send('/api/orders', 'PUT', { orderId: o.id, status: 'Cancelled' });
  const updated = await (await a.send(`/api/products/${p.id}`)).json();
  expect(updated.stockQuantity).toBe(1);
  expect(updated.inStock).toBe(true);
  await a.dispose();
  await c.dispose();
});
test('shipping fee threshold is computed on server', async () => {
  const a = await Client.create();
  await a.admin();
  const c = await Client.create();
  await c.register();
  for (const [price, shipping] of [
    [1000000, 40000],
    [1000001, 0],
  ]) {
    const p = await a.product({ price, originalPrice: null });
    const payload = orderInput(p.id);
    const r = await c.send('/api/orders', 'POST', { ...payload, total: price + shipping });
    expect(r.status()).toBe(201);
    const o = (await r.json()).order;
    expect(o.shippingFee).toBe(shipping);
    expect(Date.now() - Date.parse(o.createdAt)).toBeLessThan(10000);
    expect(Date.now() - Date.parse(o.createdAt)).toBeGreaterThan(-1000);
  }
  await a.dispose();
  await c.dispose();
});
test('paid bank order cannot be cancelled or reversed to unpaid', async () => {
  const a = await Client.create();
  await a.admin();
  const p = await a.product();
  const c = await Client.create();
  await c.register();
  const o = (
    await (
      await c.send('/api/orders', 'POST', { ...orderInput(p.id), paymentMethod: 'BANK' })
    ).json()
  ).order;
  expect(
    (await a.send('/api/orders', 'PUT', { orderId: o.id, paymentStatus: 'Paid' })).status(),
  ).toBe(200);
  expect(
    (await c.send('/api/orders', 'PUT', { orderId: o.id, status: 'Cancelled' })).status(),
  ).toBe(409);
  expect(
    (await a.send('/api/orders', 'PUT', { orderId: o.id, paymentStatus: 'Unpaid' })).status(),
  ).toBe(409);
  await a.dispose();
  await c.dispose();
});
test('stale order version rejected', async () => {
  const a = await Client.create();
  await a.admin();
  const p = await a.product();
  const c = await Client.create();
  await c.register();
  const o = (await (await c.send('/api/orders', 'POST', orderInput(p.id))).json()).order;
  expect(
    (
      await a.send('/api/orders', 'PUT', {
        orderId: o.id,
        version: o.version,
        status: 'Processing',
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await a.send('/api/orders', 'PUT', { orderId: o.id, version: o.version, status: 'Shipped' })
    ).status(),
  ).toBe(409);
  await a.dispose();
  await c.dispose();
});
test('empty catalog remains empty after deleting every product', async () => {
  const a = await Client.create();
  await a.admin();
  const items = await (await a.send('/api/products?includeHidden=1')).json();
  const ids = items.map((p: { id: string }) => p.id);
  for (let i = 0; i < ids.length; i += 100)
    expect(
      (await a.send('/api/products', 'DELETE', { productIds: ids.slice(i, i + 100) })).status(),
    ).toBe(200);
  expect(await (await a.send('/api/products')).json()).toEqual([]);
  expect(await (await a.send('/api/products')).json()).toEqual([]);
  await a.dispose();
});
test('clean demo SQL imports and supports login without private data', async () => {
  dbHelper('import-demo');
  const c = await Client.create();
  await c.admin();
  expect(await (await c.send('/api/products')).json()).toHaveLength(14);
  const inspected = JSON.parse(dbHelper('inspect'));
  expect(inspected.passwords).toHaveLength(2);
  expect(inspected.orders).toBe(0);
  await c.dispose();
});
