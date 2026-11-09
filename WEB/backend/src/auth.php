<?php
declare(strict_types=1);

function session_data(bool $create = false): ?array
{
    $token = $_COOKIE['auth_token'] ?? '';
    $session =
        is_string($token) && preg_match('/^[a-f0-9]{64}$/D', $token)
            ? query(
                'SELECT s.*, u.email, u.name, u.role FROM sessions s LEFT JOIN users u ON u.id=s.user_id WHERE token_hash=? AND expires_at>UTC_TIMESTAMP()',
                [hash('sha256', $token)],
            )->fetch()
            : false;
    if ($session) {
        return $session;
    }
    if (!$create) {
        return null;
    }
    return new_session(null);
}
function new_session(?string $userId): array
{
    if (isset($_COOKIE['auth_token']) && is_string($_COOKIE['auth_token'])) {
        query('DELETE FROM sessions WHERE token_hash=?', [hash('sha256', $_COOKIE['auth_token'])]);
    }
    $token = bin2hex(random_bytes(32));
    $csrf = bin2hex(random_bytes(32));
    query(
        'INSERT INTO sessions(token_hash,user_id,csrf_token,expires_at) VALUES(?,?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 7 DAY))',
        [hash('sha256', $token), $userId, $csrf],
    );
    setcookie('auth_token', $token, [
        'expires' => time() + 604800,
        'path' => '/',
        'secure' => env('COOKIE_SECURE') === '1',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    $_COOKIE['auth_token'] = $token;
    header('X-CSRF-Token: ' . $csrf);
    return ['user_id' => $userId, 'csrf_token' => $csrf];
}
function current_user(): array
{
    $s = session_data();
    if (!$s || !$s['user_id']) {
        fail(401, 'Vui lòng đăng nhập.');
    }
    return [
        'id' => $s['user_id'],
        'email' => $s['email'],
        'name' => $s['name'],
        'role' => $s['role'],
    ];
}
function admin_user(): array
{
    $u = current_user();
    if ($u['role'] !== 'admin') {
        fail(403, 'Bạn không có quyền quản trị.');
    }
    return $u;
}
function mutation_guard(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (
        $origin !== '' &&
        !in_array(
            $origin,
            explode(',', env('APP_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000')),
            true,
        )
    ) {
        fail(403, 'Nguồn yêu cầu không được chấp nhận.');
    }
    $s = session_data();
    $csrf = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!$s || !is_string($csrf) || !hash_equals($s['csrf_token'], $csrf)) {
        fail(403, 'Phiên biểu mẫu đã hết hạn. Vui lòng tải lại trang.');
    }
}
function public_user(array $u): array
{
    return ['id' => $u['id'], 'email' => $u['email'], 'name' => $u['name'], 'role' => $u['role']];
}
function auth_route(string $action, string $method): never
{
    if ($action === 'session' && $method === 'GET') {
        $s = session_data(true);
        header('X-CSRF-Token: ' . $s['csrf_token']);
        respond(['user' => $s['user_id'] ? current_user() : null, 'csrfToken' => $s['csrf_token']]);
    }
    if ($method !== 'POST') {
        fail(405, 'Phương thức không được hỗ trợ.');
    }
    mutation_guard();
    if ($action === 'logout') {
        $s = session_data();
        query('DELETE FROM sessions WHERE token_hash=?', [$s['token_hash']]);
        setcookie('auth_token', '', [
            'expires' => time() - 3600,
            'path' => '/',
            'secure' => env('COOKIE_SECURE') === '1',
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        respond(['message' => 'Đã đăng xuất.']);
    }
    $data = body();
    if ($action === 'login') {
        rate_limit('login', 20, 900);
        $email = email_field($data);
        $password = $data['password'] ?? null;
        if (!is_string($password) || strlen($password) > 72) {
            fail(400, 'Mật khẩu không hợp lệ.');
        }
        $u = query('SELECT * FROM users WHERE email=?', [$email])->fetch();
        if (!$u || !password_verify($password, $u['password_hash'])) {
            fail(401, 'Email hoặc mật khẩu không chính xác.');
        }
        new_session($u['id']);
        audit('login', $u['id'], $u['id']);
        respond(['user' => public_user($u), 'message' => 'Đăng nhập thành công.']);
    }
    if ($action === 'register') {
        rate_limit('register', 10, 3600);
        $name = text_field($data, 'name');
        $email = email_field($data);
        $password = password_field($data);
        if (query('SELECT id FROM users WHERE email=?', [$email])->fetch()) {
            fail(409, 'Email này đã được sử dụng.');
        }
        $id = 'usr-' . bin2hex(random_bytes(16));
        try {
            query('INSERT INTO users(id,email,password_hash,name,role) VALUES(?,?,?,?,\'user\')', [
                $id,
                $email,
                password_hash($password, PASSWORD_DEFAULT),
                $name,
            ]);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') {
                fail(409, 'Email này đã được sử dụng.');
            }
            throw $e;
        }
        new_session($id);
        respond(
            [
                'user' => ['id' => $id, 'email' => $email, 'name' => $name, 'role' => 'user'],
                'message' => 'Đăng ký thành công.',
            ],
            201,
        );
    }
    if ($action === 'reset-password') {
        rate_limit('reset', 15, 900);
        $email = email_field($data);
        $u = query('SELECT * FROM users WHERE email=?', [$email])->fetch();
        if (($data['checkEmailOnly'] ?? false) === true) {
            if ($u) {
                $code = (string) random_int(100000, 999999);
                query(
                    'INSERT INTO password_resets(user_id,code_hash,attempts,expires_at) VALUES(?,?,0,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 10 MINUTE)) ON DUPLICATE KEY UPDATE code_hash=VALUES(code_hash),attempts=0,expires_at=VALUES(expires_at)',
                    [$u['id'], password_hash($code, PASSWORD_DEFAULT)],
                );
                send_mail(
                    $email,
                    'Mã khôi phục mật khẩu Nike Store',
                    'Mã xác nhận: ' . $code . '. Có hiệu lực 10 phút. Không chia sẻ mã này.',
                );
            }
            respond(['message' => 'Nếu email có tài khoản, mã xác nhận đã được gửi.']);
        }
        $code = text_field($data, 'otp', 6, 6);
        $password = password_field($data, 'newPassword');
        $valid = transaction(function () use ($u, $code, $password) {
            $reset = $u
                ? query('SELECT * FROM password_resets WHERE user_id=? FOR UPDATE', [
                    $u['id'],
                ])->fetch()
                : false;
            if (!$reset || $reset['attempts'] >= 5 || strtotime($reset['expires_at']) <= time()) {
                return false;
            }
            if (!password_verify($code, $reset['code_hash'])) {
                query('UPDATE password_resets SET attempts=attempts+1 WHERE user_id=?', [$u['id']]);
                return false;
            }
            query('UPDATE users SET password_hash=? WHERE id=?', [
                password_hash($password, PASSWORD_DEFAULT),
                $u['id'],
            ]);
            query('DELETE FROM password_resets WHERE user_id=?', [$u['id']]);
            query('DELETE FROM sessions WHERE user_id=?', [$u['id']]);
            return true;
        });
        if (!$valid) {
            fail(400, 'Mã xác nhận không đúng, đã dùng hoặc đã hết hạn.');
        }
        new_session(null);
        respond(['message' => 'Đã đổi mật khẩu. Vui lòng đăng nhập lại.']);
    }
    fail(404, 'Không tìm thấy chức năng.');
}
