'use client';
import { useEffect, useState } from 'react';
import { apiFetch, apiJson, jsonBody } from '@/lib/api';
import type { MailNotification, Order } from '@/lib/types';
type Preview = { html: string; subject: string; recipient: string; transport: 'smtp' | 'file' };
export default function OrderEmailDialog({
  order,
  onClose,
  onDelivery,
}: {
  order: Order;
  onClose: () => void;
  onDelivery: (notification: MailNotification) => void;
}) {
  const [preview, setPreview] = useState<Preview | null>(null),
    [history, setHistory] = useState<MailNotification[]>([]);
  const [note, setNote] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const base = `/api/orders/${order.id}`;
  useEffect(() => {
    let active = true;
    Promise.all([
      apiJson<Preview>(`${base}/email-preview`),
      apiJson<MailNotification[]>(`${base}/notifications`),
    ])
      .then(([p, h]) => {
        if (active) {
          setPreview(p);
          setHistory(h);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [base]);
  async function refreshPreview() {
    setBusy(true);
    setError('');
    try {
      setPreview(
        await apiJson<Preview>(`${base}/email-preview?message=${encodeURIComponent(note)}`),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được bản xem trước.');
    } finally {
      setBusy(false);
    }
  }
  async function send() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await apiFetch(`${base}/notifications`, jsonBody('POST', { message: note }));
      const data = await response.json();
      if (data.notification) onDelivery(data.notification);
      setHistory(await apiJson<MailNotification[]>(`${base}/notifications`));
      if (!response.ok) throw Error(data.message);
      setMessage(data.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không gửi được email.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="fixed inset-0 z-50 bg-black/50 overflow-y-auto p-3 sm:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-email-title"
        className="max-w-4xl mx-auto bg-background p-4 sm:p-6 rounded"
      >
        <div className="flex gap-3 justify-between mb-4">
          <h2 id="order-email-title" className="font-black text-xl">
            EMAIL THÔNG BÁO ĐƠN HÀNG
          </h2>
          <button disabled={busy} onClick={onClose} className="border px-3 py-1">
            Đóng
          </button>
        </div>
        {error && (
          <p role="alert" className="p-3 bg-red-50 text-red-700 text-sm mb-3">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="p-3 bg-green-50 text-green-800 text-sm mb-3">
            {message}
          </p>
        )}
        {preview ? (
          <>
            <p className="text-sm break-all">
              Gửi đến: <strong>{preview.recipient}</strong>
            </p>
            <p className="text-sm mt-1 mb-3">Tiêu đề: {preview.subject}</p>
            {preview.transport === 'file' && (
              <p className="p-3 bg-amber-50 text-amber-900 text-sm mb-3">
                Đang ở chế độ thư mô phỏng. Vào mục Cấu hình QR & Email, nhập mật khẩu ứng dụng và
                bật SMTP để khách nhận trong hộp thư thật.
              </p>
            )}
            <label className="block text-sm font-semibold mb-3">
              Lời nhắn của Admin cho khách
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={2000}
                rows={3}
                className="border p-3 mt-1 w-full"
                placeholder="Ví dụ: Đơn của bạn đã được gửi, vui lòng để ý điện thoại khi giao hàng."
              />
            </label>
            <div className="flex flex-wrap gap-3 mb-4">
              <button
                disabled={busy}
                onClick={refreshPreview}
                className="border px-4 py-2 font-bold text-sm disabled:opacity-40"
              >
                Cập nhật bản xem trước
              </button>
              <button
                disabled={busy}
                onClick={send}
                className="bg-foreground text-background px-4 py-2 font-bold text-sm disabled:opacity-40"
              >
                {busy
                  ? 'Đang xử lý…'
                  : preview.transport === 'smtp'
                    ? 'Gửi email cho khách'
                    : 'Lưu thư mô phỏng'}
              </button>
            </div>
            <iframe
              title="Bản xem trước email gửi khách"
              sandbox=""
              srcDoc={preview.html}
              className="w-full h-[460px] border bg-white"
            />
            <h3 className="font-bold mt-5 mb-3">Lịch sử thông báo</h3>
            <ul className="space-y-2 text-sm">
              {history.map((n) => (
                <li key={n.id} className="border p-3">
                  <strong>
                    {n.status === 'sent'
                      ? 'Đã gửi email'
                      : n.status === 'preview'
                        ? 'Thư mô phỏng'
                        : 'Gửi thất bại'}
                  </strong>
                  <span className="block break-all">{n.recipient}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(n.createdAt).toLocaleString('vi-VN')}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p>Đang tải bản xem trước…</p>
        )}
      </section>
    </div>
  );
}
