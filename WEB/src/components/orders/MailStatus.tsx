import type { MailNotification } from '@/lib/types';
export default function MailStatus({ notification }: { notification?: MailNotification | null }) {
  if (!notification) return null;
  return (
    <p
      className={`text-xs mt-3 ${notification.status === 'failed' ? 'text-red-700' : 'text-muted-foreground'}`}
    >
      {notification.status === 'sent'
        ? `Đã gửi email thông báo tới ${notification.recipient}.`
        : notification.status === 'preview'
          ? 'Đã tạo bản xem trước email. Cửa hàng chưa bật gửi email thật.'
          : 'Email chưa gửi được; đơn hàng vẫn được ghi nhận. Cửa hàng có thể gửi lại thông báo.'}
    </p>
  );
}
