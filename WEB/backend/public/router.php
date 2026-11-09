<?php
declare(strict_types=1);

require __DIR__ . '/../src/bootstrap.php';
require ROOT . '/src/auth.php';
require ROOT . '/src/mail.php';
require ROOT . '/src/products.php';
require ROOT . '/src/orders.php';
require ROOT . '/src/uploads.php';

try {
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $method = $_SERVER['REQUEST_METHOD'];
    header('X-Content-Type-Options: nosniff');
    if (
        preg_match('#^/uploads/([a-f0-9]{32}\.(?:jpg|png|webp))$#D', $path, $m) &&
        $method === 'GET'
    ) {
        $r = query('SELECT mime_type FROM uploads WHERE filename=?', [$m[1]])->fetch();
        $file = ROOT . '/storage/uploads/' . $m[1];
        if (!$r || !is_file($file)) {
            fail(404, 'Không tìm thấy ảnh.');
        }
        header('Content-Type: ' . $r['mime_type']);
        header('Content-Length: ' . filesize($file));
        header('Cache-Control: public,max-age=31536000,immutable');
        readfile($file);
        exit();
    }
    if ($path === '/api/health' && $method === 'GET') {
        query('SELECT 1');
        respond(['status' => 'ok', 'backend' => 'PHP', 'database' => 'MySQL']);
    }
    if ($path === '/api/settings' && $method === 'GET') {
        respond([
            'bank' =>
                env('BANK_ACCOUNT') !== ''
                    ? [
                        'name' => env('BANK_NAME'),
                        'account' => env('BANK_ACCOUNT'),
                        'holder' => env('BANK_HOLDER'),
                    ]
                    : null,
        ]);
    }
    if (preg_match('#^/api/auth/([a-z-]+)$#D', $path, $m)) {
        auth_route($m[1], $method);
    }
    if (preg_match('#^/api/products(?:/([a-zA-Z0-9_-]+))?$#D', $path, $m)) {
        products_route($m[1] ?? null, $method);
    }
    if ($path === '/api/orders') {
        orders_route($method);
    }
    if ($path === '/api/uploads') {
        uploads_route($method);
    }
    if ($path === '/api/newsletter' && $method === 'POST') {
        mutation_guard();
        rate_limit('newsletter', 10, 3600);
        $email = email_field(body());
        query('INSERT IGNORE INTO newsletter_subscribers(email) VALUES(?)', [$email]);
        respond(['message' => 'Đã đăng ký nhận bản tin.']);
    }
    fail(404, 'Không tìm thấy đường dẫn.');
} catch (ApiError $e) {
    respond(['message' => $e->getMessage()], $e->getCode());
} catch (Throwable $e) {
    error_log((string) $e);
    respond(['message' => 'Máy chủ gặp sự cố. Vui lòng thử lại sau.'], 500);
}
