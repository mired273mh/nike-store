<?php
declare(strict_types=1);

function send_mail(string $to, string $subject, string $message, ?string $html = null): string
{
    $config = mail_config();
    if ($config['transport'] === 'smtp') {
        if (!is_file(ROOT . '/vendor/autoload.php')) {
            throw new RuntimeException('Run Composer install for SMTP support.');
        }
        require_once ROOT . '/vendor/autoload.php';
        $mail = new PHPMailer\PHPMailer\PHPMailer(true);
        $mail->isSMTP();
        $mail->Host = $config['host'];
        $mail->Port = $config['port'];
        $mail->SMTPAuth = $config['username'] !== '';
        $mail->Username = $config['username'];
        $mail->Password = smtp_password();
        $mail->SMTPSecure = $config['encryption'] === 'none' ? '' : $config['encryption'];
        $mail->SMTPAutoTLS = $config['encryption'] !== 'none';
        if (PHP_OS_FAMILY === 'Windows') {
            $caFile = dirname(PHP_BINARY, 2) . '/cacert.pem';
            if (is_file($caFile)) {
                $mail->SMTPOptions = [
                    'ssl' => [
                        'cafile' => $caFile,
                        'verify_peer' => true,
                        'verify_peer_name' => true,
                    ],
                ];
            }
        }
        $mail->CharSet = 'UTF-8';
        $mail->Timeout = 10;
        $mail->setFrom($config['from'], 'Nike Store');
        $mail->addAddress($to);
        $mail->Subject = $subject;
        if ($html !== null) {
            $mail->isHTML(true);
            $mail->Body = $html;
            $mail->AltBody = $message;
        } else {
            $mail->Body = $message;
        }
        $mail->send();
        return 'sent';
    }
    if (env('APP_ENV', 'development') === 'production') {
        throw new RuntimeException('SMTP must be configured in production.');
    }
    $dir = ROOT . '/storage/outbox';
    if (!is_dir($dir)) {
        mkdir($dir, 0700, true);
    }
    if (
        file_put_contents(
            $dir . '/' . bin2hex(random_bytes(12)) . '.json',
            json_encode(
                [
                    'to' => $to,
                    'subject' => $subject,
                    'message' => $message,
                    'html' => $html,
                    'createdAt' => gmdate('c'),
                ],
                JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT,
            ),
            LOCK_EX,
        ) === false
    ) {
        throw new RuntimeException('Unable to save email preview.');
    }
    return 'preview';
}
function email_escape(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
function order_email_content(array $order, string $note = ''): array
{
    $labels = [
        'Pending' => 'Chờ xác nhận',
        'Processing' => 'Đang chuẩn bị hàng',
        'Shipped' => 'Đang giao hàng',
        'Delivered' => 'Đã giao hàng',
        'Cancelled' => 'Đã hủy',
    ];
    $status = $labels[$order['status']] ?? 'Đã cập nhật';
    $payment = $order['paymentStatus'] === 'Paid' ? 'Đã thanh toán' : 'Chưa thanh toán';
    $demoPayment =
        $order['paymentMethod'] === 'BANK' &&
        ($order['paymentInstructions']['mode'] ?? 'demo') === 'demo';
    $total = number_format($order['total'], 0, ',', '.') . 'đ';
    $subject = 'Nike Store — ' . $status . ' — ' . $order['id'];
    $items = '';
    foreach ($order['items'] as $item) {
        $items .=
            '<tr><td style="padding:12px 0;border-bottom:1px solid #eee"><strong>' .
            email_escape($item['name']) .
            '</strong><br><span style="color:#71717a;font-size:12px">Size ' .
            email_escape($item['size']) .
            ' · ' .
            email_escape($item['color']) .
            '</span></td><td style="text-align:center">' .
            (int) $item['quantity'] .
            '</td><td style="text-align:right">' .
            number_format($item['price'] * $item['quantity'], 0, ',', '.') .
            'đ</td></tr>';
    }
    $message =
        'Xin chào ' .
        $order['customerDetails']['name'] .
        '. Đơn ' .
        $order['id'] .
        ': ' .
        $status .
        '. ' .
        $payment .
        '. Tổng tiền ' .
        $total .
        '.';
    if ($demoPayment) {
        $message .= "\nQR ngân hàng mô phỏng — không chuyển tiền thật.";
    }
    if ($note !== '') {
        $message .= "\nLời nhắn từ cửa hàng: " . $note;
    }
    $html =
        '<!doctype html><html lang="vi"><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;background:#f4f4f5;margin:0;padding:24px"><main style="max-width:640px;margin:auto;background:#fff;border:1px solid #e4e4e7"><header style="background:#111;color:#fff;padding:28px"><div style="font-size:30px;font-weight:900">NIKE<span style="color:#ff1e27">.</span></div><p style="font-size:20px;margin-bottom:0">' .
        email_escape($status) .
        '</p></header><section style="padding:28px"><p>Xin chào <strong>' .
        email_escape($order['customerDetails']['name']) .
        '</strong>,</p><p>Cửa hàng đã cập nhật đơn hàng <strong>' .
        email_escape($order['id']) .
        '</strong>.</p><p style="padding:12px;background:#f4f4f5">Trạng thái: <strong>' .
        email_escape($status) .
        '</strong><br>Thanh toán: <strong>' .
        $payment .
        '</strong></p>' .
        ($demoPayment
            ? '<p style="padding:12px;background:#fff7ed;color:#9a3412">QR ngân hàng mô phỏng — không chuyển tiền thật.</p>'
            : '') .
        ($note !== ''
            ? '<div style="padding:16px;border-left:4px solid #ff1e27;background:#fff5f5"><strong>Lời nhắn từ cửa hàng</strong><p>' .
                nl2br(email_escape($note)) .
                '</p></div>'
            : '') .
        '<table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr><th style="text-align:left">Sản phẩm</th><th>SL</th><th style="text-align:right">Thành tiền</th></tr></thead><tbody>' .
        $items .
        '</tbody></table><p style="text-align:right">Phí giao hàng: ' .
        number_format($order['shippingFee'], 0, ',', '.') .
        'đ</p><p style="text-align:right;font-size:22px"><strong>Tổng cộng: ' .
        $total .
        '</strong></p><h3>Thông tin giao hàng</h3><p>' .
        email_escape($order['customerDetails']['name']) .
        '<br>' .
        email_escape($order['customerDetails']['phone']) .
        '<br>' .
        email_escape($order['customerDetails']['address']) .
        '</p><p style="font-size:12px;color:#71717a">Cảm ơn bạn đã mua sắm tại Nike Store.</p></section></main></body></html>';
    return ['subject' => $subject, 'message' => $message, 'html' => $html];
}
function notification_summary(array $row): array
{
    return [
        'id' => $row['id'],
        'recipient' => $row['recipient'],
        'subject' => $row['subject'],
        'status' => $row['status'],
        'createdAt' => gmdate('c', strtotime($row['created_at'])),
    ];
}
function last_order_notification(string $orderId): ?array
{
    $row = query(
        'SELECT id,recipient,subject,status,created_at FROM order_notifications WHERE order_id=? ORDER BY created_at DESC,id DESC LIMIT 1',
        [$orderId],
    )->fetch();
    return $row ? notification_summary($row) : null;
}
function order_mail(array $order, string $note = ''): array
{
    $content = order_email_content($order, $note);
    $status = 'failed';
    $transport = mail_config()['transport'];
    try {
        $status = send_mail(
            $order['customerDetails']['email'],
            $content['subject'],
            $content['message'],
            $content['html'],
        );
    } catch (Throwable $e) {
        error_log('Order email delivery failed: ' . $e->getMessage());
    }
    $id = bin2hex(random_bytes(16));
    query(
        'INSERT INTO order_notifications(id,order_id,recipient,subject,html,message,status,transport,sent_at) VALUES(?,?,?,?,?,?,?,?,?)',
        [
            $id,
            $order['id'],
            $order['customerDetails']['email'],
            $content['subject'],
            $content['html'],
            $content['message'],
            $status,
            $transport,
            $status === 'sent' ? gmdate('Y-m-d H:i:s') : null,
        ],
    );
    return notification_summary(
        query('SELECT * FROM order_notifications WHERE id=?', [$id])->fetch(),
    );
}
function order_extras_route(string $orderId, string $action, string $method): never
{
    $user = current_user();
    $row = query('SELECT * FROM orders WHERE id=?', [$orderId])->fetch();
    if (!$row) {
        fail(404, 'Không tìm thấy đơn hàng.');
    }
    if ($user['role'] !== 'admin' && $row['user_id'] !== $user['id']) {
        fail(403, 'Đơn hàng không thuộc tài khoản của bạn.');
    }
    $order = order_row($row);
    if ($action === 'payment' && $method === 'GET') {
        if (
            $order['paymentMethod'] !== 'BANK' ||
            $order['paymentStatus'] === 'Paid' ||
            $order['status'] === 'Cancelled'
        ) {
            fail(409, 'Đơn hàng này không cần thanh toán QR.');
        }
        respond(payment_instructions($order));
    }
    if ($action === 'email-preview' && $method === 'GET') {
        if ($user['role'] !== 'admin') {
            fail(403, 'Chỉ Admin xem bản nháp email.');
        }
        $note = isset($_GET['message']) ? text_field($_GET, 'message', 2000, 0) : '';
        respond([
            ...order_email_content($order, $note),
            'recipient' => $order['customerDetails']['email'],
            'transport' => mail_config()['transport'],
        ]);
    }
    if ($action === 'notifications' && $method === 'GET') {
        respond(
            array_map(
                'notification_summary',
                query(
                    'SELECT id,recipient,subject,status,created_at FROM order_notifications WHERE order_id=? ORDER BY created_at DESC,id DESC',
                    [$orderId],
                )->fetchAll(),
            ),
        );
    }
    if ($action === 'notifications' && $method === 'POST') {
        if ($user['role'] !== 'admin') {
            fail(403, 'Chỉ Admin gửi lại email.');
        }
        mutation_guard();
        rate_limit('order-mail', 20, 3600);
        $data = body();
        $note = text_field(['message' => $data['message'] ?? ''], 'message', 2000, 0);
        $notification = order_mail($order, $note);
        audit('order.email', $orderId, $user['id']);
        respond(
            [
                'notification' => $notification,
                'message' =>
                    $notification['status'] === 'sent'
                        ? 'Đã gửi email cho khách hàng.'
                        : ($notification['status'] === 'preview'
                            ? 'Đã tạo thư mô phỏng. Bật SMTP để gửi vào hộp thư thật.'
                            : 'Gửi email thất bại. Vui lòng kiểm tra cấu hình SMTP.'),
            ],
            $notification['status'] === 'failed' ? 502 : 200,
        );
    }
    fail(405, 'Phương thức không được hỗ trợ.');
}
