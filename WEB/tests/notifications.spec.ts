import { test, expect } from '@playwright/test';
import net from 'node:net';
import { Client, dbHelper, orderInput } from './helpers';

const defaultConfig = () => ({
  bank: { mode: 'demo' },
  mail: {
    transport: 'file',
    from: 'sender@example.invalid',
    adminEmail: 'admin@example.invalid',
    host: 'smtp.gmail.com',
    port: 587,
    username: 'sender@example.invalid',
    encryption: 'tls',
    password: '',
  },
});
test.beforeAll(() => {
  dbHelper('reseed');
});
test.beforeEach(async () => {
  dbHelper('clear-limits');
  const a = await Client.create();
  await a.admin();
  expect((await a.send('/api/admin/settings', 'PUT', defaultConfig())).status()).toBe(200);
  await a.dispose();
});
async function order(paymentMethod = 'COD') {
  const admin = await Client.create();
  await admin.admin();
  const p = await admin.product();
  const buyer = await Client.create();
  await buyer.register();
  const response = await buyer.send('/api/orders', 'POST', { ...orderInput(p.id), paymentMethod });
  expect(response.status()).toBe(201);
  return { admin, buyer, order: (await response.json()).order };
}
async function smtpSink() {
  const messages: string[] = [];
  const server = net.createServer((socket) => {
    let pending = '',
      data = false,
      content = '',
      auth = 0;
    socket.write('220 localhost test SMTP\r\n');
    socket.on('data', (chunk) => {
      pending += chunk.toString('utf8');
      let end;
      while ((end = pending.indexOf('\r\n')) >= 0) {
        const line = pending.slice(0, end);
        pending = pending.slice(end + 2);
        if (data) {
          if (line === '.') {
            messages.push(content);
            content = '';
            data = false;
            socket.write('250 queued\r\n');
          } else content += line + '\r\n';
          continue;
        }
        if (auth === 1) {
          auth = 2;
          socket.write('334 UGFzc3dvcmQ6\r\n');
          continue;
        }
        if (auth === 2) {
          auth = 0;
          socket.write('235 authenticated\r\n');
          continue;
        }
        if (/^EHLO|^HELO/.test(line))
          socket.write('250-localhost\r\n250-8BITMIME\r\n250 AUTH LOGIN PLAIN\r\n');
        else if (line === 'AUTH LOGIN') {
          auth = 1;
          socket.write('334 VXNlcm5hbWU6\r\n');
        } else if (line.startsWith('AUTH PLAIN')) socket.write('235 authenticated\r\n');
        else if (line === 'DATA') {
          data = true;
          socket.write('354 end with dot\r\n');
        } else if (line === 'QUIT') {
          socket.end('221 bye\r\n');
        } else socket.write('250 ok\r\n');
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as net.AddressInfo).port;
  return {
    messages,
    port,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
test('demo bank is public while SMTP credentials stay private', async () => {
  const c = await Client.create();
  const settings = await (await c.send('/api/settings')).json();
  expect(settings.bank.mode).toBe('demo');
  expect(settings.bank.account).toMatch(/^DEMO-/);
  expect(settings.mail).toBeUndefined();
  expect((await c.send('/api/admin/settings')).status()).toBe(401);
  await c.register();
  expect((await c.send('/api/admin/settings')).status()).toBe(403);
  expect((await c.send('/api/admin/settings', 'PUT', defaultConfig())).status()).toBe(403);
  await c.dispose();
});
test('QR demo uses server amount and a non-payment payload', async () => {
  const { admin, buyer, order: o } = await order('BANK');
  const response = await buyer.send(`/api/orders/${o.id}/payment`);
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data.mode).toBe('demo');
  expect(data.amount).toBe(790000);
  expect(data.qrImageUrl).toBeNull();
  expect(JSON.parse(data.qrPayload)).toEqual(
    expect.objectContaining({
      type: 'NIKE_STORE_DEMO_NOT_A_PAYMENT',
      orderId: o.id,
      amountVND: 790000,
    }),
  );
  await admin.dispose();
  await buyer.dispose();
});
test('QR requires order ownership', async () => {
  const { admin, buyer, order: o } = await order('BANK');
  const other = await Client.create();
  expect((await other.send(`/api/orders/${o.id}/payment`)).status()).toBe(401);
  await other.register();
  expect((await other.send(`/api/orders/${o.id}/payment`)).status()).toBe(403);
  await other.dispose();
  await admin.dispose();
  await buyer.dispose();
});
test('COD, paid and cancelled orders do not offer QR payment', async () => {
  const a = await order();
  expect((await a.buyer.send(`/api/orders/${a.order.id}/payment`)).status()).toBe(409);
  await a.admin.dispose();
  await a.buyer.dispose();
  const b = await order('BANK');
  await b.buyer.send('/api/orders', 'PUT', { orderId: b.order.id, status: 'Cancelled' });
  expect((await b.buyer.send(`/api/orders/${b.order.id}/payment`)).status()).toBe(409);
  await b.admin.dispose();
  await b.buyer.dispose();
  const c = await order('BANK');
  await c.admin.send('/api/orders', 'PUT', { orderId: c.order.id, paymentStatus: 'Paid' });
  expect((await c.buyer.send(`/api/orders/${c.order.id}/payment`)).status()).toBe(409);
  await c.admin.dispose();
  await c.buyer.dispose();
});
test('bank details are snapshotted with the order', async () => {
  const { admin, buyer, order: o } = await order('BANK');
  const settings = defaultConfig();
  const response = await admin.send('/api/admin/settings', 'PUT', {
    ...settings,
    bank: {
      mode: 'real',
      name: 'Bank Test',
      bin: '970436',
      account: '000000000000',
      holder: 'TEST ONLY',
    },
  });
  expect(response.status()).toBe(200);
  const old = await (await buyer.send(`/api/orders/${o.id}/payment`)).json();
  expect(old.mode).toBe('demo');
  expect(old.account).toBe('DEMO-000123456');
  await admin.dispose();
  await buyer.dispose();
});
test('new real-bank instruction uses a VietQR link with canonical details', async () => {
  const a = await Client.create();
  await a.admin();
  await a.send('/api/admin/settings', 'PUT', {
    ...defaultConfig(),
    bank: {
      mode: 'real',
      name: 'Test Bank',
      bin: '970436',
      account: '000000000000',
      holder: 'TEST ONLY',
    },
  });
  const { admin, buyer, order: o } = await order('BANK');
  const data = await (await buyer.send(`/api/orders/${o.id}/payment`)).json();
  const link = new URL(data.qrImageUrl);
  expect(link.origin).toBe('https://img.vietqr.io');
  expect(link.searchParams.get('amount')).toBe('790000');
  expect(link.searchParams.get('addInfo')).toBe(data.reference);
  await a.dispose();
  await admin.dispose();
  await buyer.dispose();
});
test('order creation and Admin updates create customer notifications', async () => {
  const { admin, buyer, order: o } = await order();
  expect(o.lastNotification.status).toBe('preview');
  expect(o.lastNotification.recipient).toBe('buyer@example.invalid');
  await admin.send('/api/orders', 'PUT', { orderId: o.id, status: 'Processing' });
  const rows = await (await buyer.send(`/api/orders/${o.id}/notifications`)).json();
  expect(rows).toHaveLength(2);
  expect(rows[0].subject).toContain('Đang chuẩn bị hàng');
  const current = (await (await buyer.send('/api/orders')).json()).find(
    (item: { id: string }) => item.id === o.id,
  );
  expect(current.lastNotification.id).toBe(rows[0].id);
  await admin.dispose();
  await buyer.dispose();
});
test('Admin previews an escaped HTML email and sends a custom note in preview mode', async () => {
  const { admin, buyer, order: o } = await order();
  const note = '<script>alert(1)</script> Cửa hàng đã gửi hàng.';
  const p = await admin.send(
    `/api/orders/${o.id}/email-preview?message=${encodeURIComponent(note)}`,
  );
  expect(p.status()).toBe(200);
  const preview = await p.json();
  expect(preview.html).toContain('&lt;script&gt;');
  expect(preview.html).not.toContain('<script>');
  expect(preview.html).toContain('790.000đ');
  const sent = await admin.send(`/api/orders/${o.id}/notifications`, 'POST', { message: note });
  expect(sent.status()).toBe(200);
  expect((await sent.json()).notification.status).toBe('preview');
  await admin.dispose();
  await buyer.dispose();
});
test('customers cannot send emails or read other order notification history', async () => {
  const { admin, buyer, order: o } = await order();
  expect((await buyer.send(`/api/orders/${o.id}/email-preview`)).status()).toBe(403);
  expect((await buyer.send(`/api/orders/${o.id}/notifications`, 'POST', {})).status()).toBe(403);
  const c = await Client.create();
  await c.register();
  expect((await c.send(`/api/orders/${o.id}/notifications`)).status()).toBe(403);
  await c.dispose();
  await admin.dispose();
  await buyer.dispose();
});
test('SMTP credentials are encrypted at rest and never returned to Admin', async () => {
  const a = await Client.create();
  await a.admin();
  const password = 'SyntheticSecretForTests123!';
  const config = defaultConfig();
  const saved = await a.send('/api/admin/settings', 'PUT', {
    ...config,
    mail: { ...config.mail, password },
  });
  expect(saved.status()).toBe(200);
  const data = await saved.json();
  expect(data.mail.passwordConfigured).toBe(true);
  expect(JSON.stringify(data)).not.toContain(password);
  const stored = JSON.parse(dbHelper('settings-inspect')).encryptedPassword;
  expect(stored).not.toBe(password);
  const again = await (await a.send('/api/admin/settings')).json();
  expect(again.mail.password).toBeUndefined();
  await a.dispose();
});
test('SMTP transport sends HTML through a local SMTP server', async () => {
  const sink = await smtpSink();
  const a = await Client.create();
  await a.admin();
  try {
    const config = defaultConfig();
    expect(
      (
        await a.send('/api/admin/settings', 'PUT', {
          ...config,
          mail: {
            ...config.mail,
            transport: 'smtp',
            host: '127.0.0.1',
            port: sink.port,
            username: 'sink-user',
            password: 'SyntheticPassword123!',
            encryption: 'none',
          },
        })
      ).status(),
    ).toBe(200);
    const { admin, buyer, order: o } = await order();
    expect(o.lastNotification.status).toBe('sent');
    expect(sink.messages).toHaveLength(1);
    expect(sink.messages[0]).toContain('Content-Type: text/html');
    expect(sink.messages[0]).toContain('buyer@example.invalid');
    expect(sink.messages[0]).toContain('NIKE');
    const repeated = await a.send(`/api/orders/${o.id}/notifications`, 'POST', {
      message: 'Lời nhắn kiểm thử',
    });
    expect((await repeated.json()).notification.status).toBe('sent');
    expect(sink.messages).toHaveLength(2);
    await admin.dispose();
    await buyer.dispose();
  } finally {
    await a.send('/api/admin/settings', 'PUT', defaultConfig());
    await a.dispose();
    await sink.close();
  }
});
test('SMTP failures are recorded without losing the successfully created order', async () => {
  const a = await Client.create();
  await a.admin();
  const config = defaultConfig();
  await a.send('/api/admin/settings', 'PUT', {
    ...config,
    mail: {
      ...config.mail,
      transport: 'smtp',
      host: '127.0.0.1',
      port: 9,
      username: 'sink-user',
      password: 'SyntheticPassword123!',
      encryption: 'none',
    },
  });
  try {
    const { admin, buyer, order: o } = await order();
    expect(o.lastNotification.status).toBe('failed');
    const orders = await (await buyer.send('/api/orders')).json();
    expect(orders.some((item: { id: string }) => item.id === o.id)).toBe(true);
    const resend = await a.send(`/api/orders/${o.id}/notifications`, 'POST', {});
    expect(resend.status()).toBe(502);
    expect((await resend.json()).notification.status).toBe('failed');
    await admin.dispose();
    await buyer.dispose();
  } finally {
    await a.send('/api/admin/settings', 'PUT', defaultConfig());
    await a.dispose();
  }
});
test('mail test endpoint reports preview mode honestly and validates the recipient', async () => {
  const a = await Client.create();
  await a.admin();
  expect((await a.send('/api/admin/mail-test', 'POST', { email: 'bad' })).status()).toBe(400);
  const response = await a.send('/api/admin/mail-test', 'POST', { email: 'self@example.invalid' });
  expect(response.status()).toBe(200);
  expect((await response.json()).status).toBe('preview');
  await a.dispose();
});
