'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import { apiJson } from '@/lib/api';
import type { QrPayment } from '@/lib/types';

export default function PaymentQr({ orderId }: { orderId: string }) {
  const [payment, setPayment] = useState<QrPayment | null>(null);
  const [image, setImage] = useState(''),
    [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    apiJson<QrPayment>(`/api/orders/${encodeURIComponent(orderId)}/payment`)
      .then(async (data) => {
        const image = data.qrPayload
          ? await QRCode.toDataURL(data.qrPayload, {
              width: 280,
              margin: 2,
              errorCorrectionLevel: 'M',
            })
          : data.qrImageUrl || '';
        if (active) {
          setPayment(data);
          setImage(image);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [orderId]);
  if (error)
    return (
      <p role="alert" className="p-3 bg-red-50 text-red-700 text-sm">
        {error}
      </p>
    );
  if (!payment || !image)
    return (
      <p role="status" className="p-4 text-sm">
        Đang tạo mã QR…
      </p>
    );
  return (
    <section
      aria-label="Thanh toán QR"
      className="border p-4 sm:p-5 my-4 text-left bg-white text-zinc-950"
    >
      <h2 className="font-black text-lg mb-3">
        {payment.mode === 'demo' ? 'QR THANH TOÁN DEMO' : 'QUÉT QR CHUYỂN KHOẢN'}
      </h2>
      {payment.mode === 'demo' && (
        <p
          role="note"
          className="bg-amber-50 text-amber-900 border border-amber-200 p-3 text-sm font-semibold mb-4"
        >
          QR mô phỏng — không chuyển tiền thật. Ngân hàng và tài khoản bên dưới là dữ liệu ảo.
        </p>
      )}
      <div className="flex flex-col sm:flex-row items-center gap-5">
        <Image
          src={image}
          alt={
            payment.mode === 'demo' ? 'Mã QR demo của đơn hàng' : 'Mã VietQR thanh toán đơn hàng'
          }
          width={280}
          height={280}
          className="w-60 h-60 max-w-full object-contain"
        />
        <div className="space-y-2 text-sm min-w-0 w-full">
          <p className="font-bold">{payment.name}</p>
          <p>
            Chủ tài khoản: <strong>{payment.holder}</strong>
          </p>
          <p className="break-all">
            Số tài khoản: <strong>{payment.account}</strong>
          </p>
          <p>
            Số tiền: <strong className="text-lg">{payment.amount.toLocaleString('vi-VN')}đ</strong>
          </p>
          <p className="break-all">
            Nội dung: <strong>{payment.reference}</strong>
          </p>
          <p className="text-xs text-zinc-600">
            {payment.mode === 'demo'
              ? 'Quét để xem thông tin đơn mẫu. Trạng thái thanh toán chỉ đổi khi Admin xác nhận.'
              : 'Chỉ chuyển đúng số tiền và nội dung. Cửa hàng sẽ kiểm tra rồi xác nhận thanh toán.'}
          </p>
          {payment.mode === 'demo' && (
            <a
              href={image}
              download={`QR-${orderId}.png`}
              className="inline-block border px-3 py-2 font-bold"
            >
              Tải ảnh QR demo
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
