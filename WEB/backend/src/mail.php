<?php
declare(strict_types=1);

function send_mail(string $to, string $subject, string $message): void
{
    if (env('MAIL_TRANSPORT', 'file') === 'smtp') {
        require_once ROOT . '/vendor/autoload.php';
        $mail = new PHPMailer\PHPMailer\PHPMailer(true);
        $mail->isSMTP();
        $mail->Host = env('SMTP_HOST');
        $mail->Port = (int) env('SMTP_PORT', '587');
        $mail->SMTPAuth = true;
        $mail->Username = env('SMTP_USERNAME');
        $mail->Password = env('SMTP_PASSWORD');
        $mail->SMTPSecure = env('SMTP_ENCRYPTION', 'tls');
        $mail->CharSet = 'UTF-8';
        $mail->Timeout = 10;
        $mail->setFrom(env('MAIL_FROM'), 'Nike Store');
        $mail->addAddress($to);
        $mail->Subject = $subject;
        $mail->Body = $message;
        $mail->send();
        return;
    }
    if (env('APP_ENV', 'development') === 'production') {
        throw new RuntimeException('SMTP must be configured in production.');
    }
    $dir = ROOT . '/storage/outbox';
    if (!is_dir($dir)) {
        mkdir($dir, 0700, true);
    }
    file_put_contents(
        $dir . '/' . bin2hex(random_bytes(12)) . '.json',
        json_encode(
            ['to' => $to, 'subject' => $subject, 'message' => $message, 'createdAt' => gmdate('c')],
            JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT,
        ),
        LOCK_EX,
    );
}
function order_mail(array $order): void
{
    try {
        send_mail(
            $order['customerDetails']['email'],
            'Nike Store: đơn ' . $order['id'],
            'Trạng thái: ' .
                $order['status'] .
                '. Thanh toán: ' .
                $order['paymentStatus'] .
                '. Tổng tiền: ' .
                number_format($order['total']) .
                ' VND.',
        );
    } catch (Throwable $e) {
        error_log('Order email delivery failed: ' . $e->getMessage());
    }
}
