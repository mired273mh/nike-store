'use client';
import { useEffect, useState } from 'react';
import { apiJson, jsonBody } from '@/lib/api';
import type { BankSettings, MailSettings } from '@/lib/types';
export default function StoreSettings() {
  const [bank, setBank] = useState<BankSettings | null>(null),
    [mail, setMail] = useState<MailSettings | null>(null);
  const [password, setPassword] = useState(''),
    [recipient, setRecipient] = useState(''),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState(''),
    [message, setMessage] = useState('');
  useEffect(() => {
    apiJson<{ bank: BankSettings; mail: MailSettings }>('/api/admin/settings')
      .then((data) => {
        setBank(data.bank);
        setMail({ ...data.mail, host: data.mail.host || 'smtp.gmail.com' });
        setRecipient(data.mail.from);
      })
      .catch((e) => setError(e.message));
  }, []);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const data = await apiJson<{ bank: BankSettings; mail: MailSettings }>(
        '/api/admin/settings',
        jsonBody('PUT', { bank, mail: { ...mail, password } }),
      );
      setBank(data.bank);
      setMail(data.mail);
      setPassword('');
      setMessage('Đã lưu cấu hình. Bạn có thể gửi email thử bên dưới.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không lưu được cấu hình.');
    } finally {
      setBusy(false);
    }
  }
  async function testMail() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await apiJson<{ message: string }>(
        '/api/admin/mail-test',
        jsonBody('POST', { email: recipient }),
      );
      setMessage(result.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không gửi được email thử.');
    } finally {
      setBusy(false);
    }
  }
  const input = 'block border p-3 w-full mt-1 bg-background text-sm';
  return (
    <section className="border p-4 sm:p-6 max-w-4xl">
      <h2 className="font-black text-xl mb-4">CẤU HÌNH QR & EMAIL</h2>
      {error && (
        <p role="alert" className="bg-red-50 text-red-700 p-3 mb-4 text-sm">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="bg-green-50 text-green-800 p-3 mb-4 text-sm">
          {message}
        </p>
      )}
      {!bank || !mail ? (
        <p>Đang tải cấu hình…</p>
      ) : (
        <>
          <form onSubmit={save} className="space-y-5">
            <fieldset className="border p-4 space-y-3">
              <legend className="px-2 font-bold">QR thanh toán</legend>
              <label className="block text-sm">
                Chế độ ngân hàng
                <select
                  className={input}
                  value={bank.mode}
                  onChange={(e) =>
                    setBank({
                      ...bank,
                      mode: e.target.value as BankSettings['mode'],
                      ...(e.target.value === 'real'
                        ? { name: '', account: '', holder: '', bin: '' }
                        : {}),
                    })
                  }
                >
                  <option value="demo">Ngân hàng ảo / QR demo</option>
                  <option value="real">Tài khoản ngân hàng thật / VietQR</option>
                </select>
              </label>
              {bank.mode === 'demo' ? (
                <p className="bg-amber-50 text-amber-900 p-3 text-sm">
                  Nike Demo Bank · DEMO-000123456 · NIKE STORE DEMO. QR chỉ phục vụ trình diễn,
                  không chuyển tiền thật.
                </p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    ['name', 'Tên ngân hàng'],
                    ['bin', 'BIN ngân hàng (6 số)'],
                    ['account', 'Số tài khoản ngân hàng'],
                    ['holder', 'Tên chủ tài khoản'],
                  ].map(([key, label]) => (
                    <label key={key} className="block text-sm">
                      {label}
                      <input
                        required
                        value={bank[key as 'name' | 'bin' | 'account' | 'holder']}
                        onChange={(e) => setBank({ ...bank, [key]: e.target.value })}
                        className={input}
                      />
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
            <fieldset className="border p-4 space-y-3">
              <legend className="px-2 font-bold">Email thông báo cho khách</legend>
              <label className="block text-sm">
                Chế độ gửi email
                <select
                  className={input}
                  value={mail.transport}
                  onChange={(e) =>
                    setMail({ ...mail, transport: e.target.value as MailSettings['transport'] })
                  }
                >
                  <option value="file">Xem trước / thư mô phỏng</option>
                  <option value="smtp">Gửi thật qua SMTP</option>
                </select>
              </label>
              <p className="text-sm text-muted-foreground">
                Thông báo tự tạo khi đặt hàng và cập nhật đơn. Admin có thể xem trước và gửi lại kèm
                lời nhắn.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="block text-sm">
                  Email gửi thông báo
                  <input
                    type="email"
                    required
                    value={mail.from}
                    onChange={(e) => setMail({ ...mail, from: e.target.value })}
                    className={input}
                  />
                </label>
                <label className="block text-sm">
                  Email Admin nhận khiếu nại
                  <input
                    type="email"
                    required
                    value={mail.adminEmail}
                    onChange={(e) => setMail({ ...mail, adminEmail: e.target.value })}
                    className={input}
                  />
                </label>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="block text-sm">
                  Máy chủ SMTP
                  <input
                    required
                    value={mail.host}
                    onChange={(e) => setMail({ ...mail, host: e.target.value })}
                    className={input}
                  />
                </label>
                <label className="block text-sm">
                  Cổng SMTP
                  <input
                    type="number"
                    required
                    min="1"
                    max="65535"
                    value={mail.port}
                    onChange={(e) => setMail({ ...mail, port: Number(e.target.value) })}
                    className={input}
                  />
                </label>
              </div>
              <label className="block text-sm">
                Bảo mật kết nối
                <select
                  className={input}
                  value={mail.encryption}
                  onChange={(e) =>
                    setMail({ ...mail, encryption: e.target.value as MailSettings['encryption'] })
                  }
                >
                  <option value="tls">STARTTLS (Gmail: 587)</option>
                  <option value="ssl">SSL (Gmail: 465)</option>
                  <option value="none">Không mã hóa (chỉ dùng máy thử local)</option>
                </select>
              </label>
              <label className="block text-sm">
                Tài khoản SMTP
                <input
                  type="email"
                  autoComplete="off"
                  value={mail.username}
                  onChange={(e) => setMail({ ...mail, username: e.target.value })}
                  className={input}
                />
              </label>
              <label className="block text-sm">
                Mật khẩu ứng dụng Gmail
                <input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    mail.passwordConfigured
                      ? 'Đã lưu — để trống để giữ nguyên'
                      : 'Nhập mật khẩu ứng dụng Gmail mới'
                  }
                  maxLength={512}
                  className={input}
                />
              </label>
              <p className="text-xs text-muted-foreground">
                Mật khẩu được lưu mã hóa và không hiển thị lại.{' '}
                <a
                  className="underline"
                  href="https://myaccount.google.com/apppasswords"
                  target="_blank"
                  rel="noreferrer"
                >
                  Mở trang tạo mật khẩu ứng dụng Google
                </a>
                .
              </p>
            </fieldset>
            <button
              disabled={busy}
              className="bg-foreground text-background px-5 py-3 font-bold disabled:opacity-40"
            >
              {busy ? 'Đang xử lý…' : 'Lưu cấu hình QR & Email'}
            </button>
          </form>
          <div className="border-t pt-5 mt-6 space-y-3">
            <h3 className="font-bold">Kiểm tra gửi thư</h3>
            <p className="text-xs text-muted-foreground">
              Lưu cấu hình trước khi gửi thử. Ở chế độ mô phỏng, thư chỉ được tạo trên máy.
            </p>
            <label className="block text-sm">
              Email nhận thử
              <input
                type="email"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className={input}
              />
            </label>
            <button
              type="button"
              disabled={busy || !recipient}
              onClick={testMail}
              className="border px-4 py-2 font-bold text-sm disabled:opacity-40"
            >
              Gửi email thử
            </button>
          </div>
        </>
      )}
    </section>
  );
}
