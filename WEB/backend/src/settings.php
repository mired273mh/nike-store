<?php
declare(strict_types=1);

function setting(string $name, string $fallback = ''): string
{
    $value = query('SELECT value FROM app_settings WHERE name=?', [$name])->fetchColumn();
    return $value === false ? $fallback : (string) $value;
}
function save_setting(string $name, string $value): void
{
    query(
        'INSERT INTO app_settings(name,value) VALUES(?,?) ON DUPLICATE KEY UPDATE value=VALUES(value)',
        [$name, $value],
    );
}
function mail_key(): string
{
    $file = ROOT . '/storage/mail.key';
    if (!is_file($file)) {
        $handle = @fopen($file, 'x');
        if ($handle !== false) {
            fwrite($handle, bin2hex(random_bytes(32)));
            fclose($handle);
            @chmod($file, 0600);
        }
    }
    $key = is_file($file) ? hex2bin(trim(file_get_contents($file))) : false;
    if ($key === false || strlen($key) !== 32) {
        throw new RuntimeException('Email encryption key unavailable.');
    }
    return $key;
}
function encrypt_mail_secret(string $value): string
{
    $iv = random_bytes(12);
    $tag = '';
    $encrypted = openssl_encrypt($value, 'aes-256-gcm', mail_key(), OPENSSL_RAW_DATA, $iv, $tag);
    if ($encrypted === false) {
        throw new RuntimeException('Unable to protect SMTP credential.');
    }
    return base64_encode($iv . $tag . $encrypted);
}
function smtp_password(): string
{
    $encrypted = setting('smtp_password');
    if ($encrypted === '') {
        return env('SMTP_PASSWORD');
    }
    $raw = base64_decode($encrypted, true);
    if ($raw === false || strlen($raw) < 28) {
        throw new RuntimeException('Invalid protected SMTP credential.');
    }
    $password = openssl_decrypt(
        substr($raw, 28),
        'aes-256-gcm',
        mail_key(),
        OPENSSL_RAW_DATA,
        substr($raw, 0, 12),
        substr($raw, 12, 16),
    );
    if ($password === false) {
        throw new RuntimeException('Unable to read SMTP credential.');
    }
    return $password;
}
function mail_config(): array
{
    return [
        'transport' => setting('mail_transport', env('MAIL_TRANSPORT', 'file')),
        'from' => setting('mail_from', env('MAIL_FROM', 'no-reply@example.com')),
        'adminEmail' => setting('admin_email', env('ADMIN_EMAIL', 'admin@example.com')),
        'host' => setting('smtp_host', env('SMTP_HOST', 'smtp.gmail.com')),
        'port' => (int) setting('smtp_port', env('SMTP_PORT', '587')),
        'username' => setting('smtp_username', env('SMTP_USERNAME')),
        'encryption' => setting('smtp_encryption', env('SMTP_ENCRYPTION', 'tls')),
        'passwordConfigured' => setting('smtp_password') !== '' || env('SMTP_PASSWORD') !== '',
    ];
}
function bank_config(): array
{
    $mode = setting('bank_mode', env('BANK_MODE', 'demo'));
    if ($mode === 'demo') {
        return [
            'mode' => 'demo',
            'name' => 'Nike Demo Bank',
            'account' => 'DEMO-000123456',
            'holder' => 'NIKE STORE DEMO',
            'bin' => '',
            'notice' => 'QR mô phỏng — không chuyển tiền thật.',
        ];
    }
    return [
        'mode' => 'real',
        'name' => setting('bank_name', env('BANK_NAME')),
        'account' => setting('bank_account', env('BANK_ACCOUNT')),
        'holder' => setting('bank_holder', env('BANK_HOLDER')),
        'bin' => setting('bank_bin', env('BANK_BIN')),
        'notice' => 'Kiểm tra thông tin người nhận trong ứng dụng ngân hàng trước khi xác nhận.',
    ];
}
function payment_instructions(array $order): array
{
    $bank = $order['paymentInstructions'] ?? bank_config();
    $reference = 'NIKE' . strtoupper(substr(str_replace('-', '', $order['id']), -16));
    $payment = [
        ...$bank,
        'amount' => $order['total'],
        'reference' => $reference,
        'orderId' => $order['id'],
    ];
    if ($bank['mode'] === 'demo') {
        $payment['qrPayload'] = json_encode(
            [
                'type' => 'NIKE_STORE_DEMO_NOT_A_PAYMENT',
                'orderId' => $order['id'],
                'amountVND' => $order['total'],
                'reference' => $reference,
            ],
            JSON_UNESCAPED_SLASHES,
        );
        $payment['qrImageUrl'] = null;
    } else {
        if (
            !preg_match('/^[0-9]{6}$/D', $bank['bin']) ||
            !preg_match('/^[0-9]{6,25}$/D', $bank['account'])
        ) {
            fail(409, 'Cửa hàng chưa cấu hình đầy đủ tài khoản ngân hàng.');
        }
        $payment['qrPayload'] = null;
        $payment['qrImageUrl'] =
            'https://img.vietqr.io/image/' .
            $bank['bin'] .
            '-' .
            $bank['account'] .
            '-compact2.png?' .
            http_build_query(
                [
                    'amount' => $order['total'],
                    'addInfo' => $reference,
                    'accountName' => $bank['holder'],
                ],
                '',
                '&',
                PHP_QUERY_RFC3986,
            );
    }
    return $payment;
}
function settings_route(string $method): never
{
    $admin = admin_user();
    if ($method === 'GET') {
        respond(['bank' => bank_config(), 'mail' => mail_config()]);
    }
    if ($method !== 'PUT') {
        fail(405, 'Phương thức không được hỗ trợ.');
    }
    mutation_guard();
    $data = body();
    $bank = $data['bank'] ?? null;
    $mail = $data['mail'] ?? null;
    if (!is_array($bank) || !is_array($mail)) {
        fail(400, 'Thiếu cấu hình ngân hàng hoặc email.');
    }
    $mode = $bank['mode'] ?? 'demo';
    if (!in_array($mode, ['demo', 'real'], true)) {
        fail(400, 'Chế độ QR không hợp lệ.');
    }
    $bankValues = ['bank_mode' => $mode];
    if ($mode === 'real') {
        foreach (['name', 'account', 'holder', 'bin'] as $key) {
            $bankValues['bank_' . $key] = text_field($bank, $key, 120);
        }
        if (
            !preg_match('/^[0-9]{6}$/D', $bank['bin']) ||
            !preg_match('/^[0-9]{6,25}$/D', $bank['account'])
        ) {
            fail(400, 'BIN ngân hàng gồm 6 số; tài khoản gồm 6 đến 25 số.');
        }
    }
    $transport = $mail['transport'] ?? 'file';
    if (!in_array($transport, ['file', 'smtp'], true)) {
        fail(400, 'Chế độ email không hợp lệ.');
    }
    $values = [
        'mail_transport' => $transport,
        'mail_from' => email_field($mail, 'from'),
        'admin_email' => email_field($mail, 'adminEmail'),
    ];
    $host = text_field($mail, 'host', 253);
    if (!preg_match('/^[a-zA-Z0-9.-]+$/D', $host)) {
        fail(400, 'Máy chủ SMTP không hợp lệ.');
    }
    $values['smtp_host'] = $host;
    $values['smtp_port'] = (string) integer_field($mail, 'port', 1, 65535);
    $values['smtp_username'] = text_field($mail, 'username', 254, 0);
    $encryption = $mail['encryption'] ?? 'tls';
    if (!in_array($encryption, ['tls', 'ssl', 'none'], true)) {
        fail(400, 'Mã hóa SMTP không hợp lệ.');
    }
    if (env('APP_ENV', 'development') === 'production' && $encryption === 'none') {
        fail(400, 'SMTP production cần TLS hoặc SSL.');
    }
    $values['smtp_encryption'] = $encryption;
    $password = $mail['password'] ?? '';
    if (!is_string($password) || strlen($password) > 512) {
        fail(400, 'Mật khẩu ứng dụng không hợp lệ.');
    }
    if ($password !== '') {
        $values['smtp_password'] = encrypt_mail_secret($password);
    }
    if (
        $transport === 'smtp' &&
        ($values['smtp_username'] === '' ||
            ($password === '' && !mail_config()['passwordConfigured']))
    ) {
        fail(400, 'Cần tài khoản và mật khẩu ứng dụng để gửi email thật.');
    }
    transaction(function () use ($bankValues, $values, $admin) {
        foreach ([...$bankValues, ...$values] as $key => $value) {
            save_setting($key, $value);
        }
        audit('settings.update', 'store', $admin['id']);
    });
    respond(['bank' => bank_config(), 'mail' => mail_config(), 'message' => 'Đã lưu cấu hình.']);
}
