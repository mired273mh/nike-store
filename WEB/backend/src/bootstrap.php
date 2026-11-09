<?php
declare(strict_types=1);

date_default_timezone_set('UTC');
const ROOT = __DIR__ . '/..';
if (is_file(ROOT . '/.env')) {
    foreach (file(ROOT . '/.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        if (str_starts_with(trim($line), '#') || !str_contains($line, '=')) {
            continue;
        }
        [$key, $value] = explode('=', $line, 2);
        if (getenv(trim($key)) === false) {
            putenv(trim($key) . '=' . trim($value, " \t\r\n\"'"));
        }
    }
}
function env(string $key, string $default = ''): string
{
    return getenv($key) === false ? $default : (string) getenv($key);
}
function db(): PDO
{
    static $pdo;
    if (!$pdo) {
        $pdo = new PDO(
            'mysql:host=' .
                env('DB_HOST', '127.0.0.1') .
                ';port=' .
                env('DB_PORT', '3307') .
                ';dbname=' .
                env('DB_DATABASE', 'nike_store') .
                ';charset=utf8mb4',
            env('DB_USERNAME', 'nike_app'),
            env('DB_PASSWORD'),
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ],
        );
        $pdo->exec("SET time_zone = '+00:00'");
    }
    return $pdo;
}
function query(string $sql, array $args = []): PDOStatement
{
    $s = db()->prepare($sql);
    $s->execute($args);
    return $s;
}
function fail(int $status, string $message): never
{
    throw new ApiError($message, $status);
}
class ApiError extends RuntimeException {}
function respond(mixed $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    exit();
}
function body(): array
{
    if (!str_starts_with($_SERVER['CONTENT_TYPE'] ?? '', 'application/json')) {
        fail(415, 'Yêu cầu JSON.');
    }
    if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 1048576) {
        fail(413, 'Dữ liệu quá lớn.');
    }
    try {
        $data = json_decode(file_get_contents('php://input'), true, 64, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        fail(400, 'JSON không hợp lệ.');
    }
    if (!is_array($data) || (array_is_list($data) && $data !== [])) {
        fail(400, 'Dữ liệu không hợp lệ.');
    }
    return $data;
}
function text_field(array $data, string $key, int $max = 120, int $min = 1): string
{
    $v = $data[$key] ?? null;
    if (!is_string($v) || mb_strlen(trim($v)) < $min || mb_strlen(trim($v)) > $max) {
        fail(400, "Trường $key phải có từ $min đến $max ký tự.");
    }
    return trim($v);
}
function email_field(array $data, string $key = 'email'): string
{
    $v = strtolower(text_field($data, $key, 254));
    if (!filter_var($v, FILTER_VALIDATE_EMAIL)) {
        fail(400, 'Email không hợp lệ.');
    }
    return $v;
}
function integer_field(array $data, string $key, int $min, int $max): int
{
    $v = $data[$key] ?? null;
    if (!is_int($v) || $v < $min || $v > $max) {
        fail(400, "Trường $key phải là số nguyên từ $min đến $max.");
    }
    return $v;
}
function boolean_field(array $data, string $key, bool $default = false): bool
{
    $v = $data[$key] ?? $default;
    if (!is_bool($v)) {
        fail(400, "Trường $key phải là boolean.");
    }
    return $v;
}
function password_field(array $data, string $key = 'password'): string
{
    $v = $data[$key] ?? null;
    if (!is_string($v) || strlen($v) < 8 || strlen($v) > 72) {
        fail(400, 'Mật khẩu phải từ 8 đến 72 ký tự.');
    }
    return $v;
}
function audit(string $action, string $id, ?string $userId): void
{
    query('INSERT INTO audit_logs(user_id,action,entity_id) VALUES(?,?,?)', [
        $userId,
        $action,
        mb_substr($id, 0, 100),
    ]);
}
function rate_limit(string $bucket, int $max, int $seconds): void
{
    $key = hash('sha256', $bucket . ':' . ($_SERVER['REMOTE_ADDR'] ?? 'cli'));
    query(
        'INSERT INTO rate_limits(key_hash,attempts,expires_at) VALUES(?,1,DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? SECOND)) ON DUPLICATE KEY UPDATE attempts=IF(expires_at < UTC_TIMESTAMP(),1,attempts+1), expires_at=IF(expires_at < UTC_TIMESTAMP(),DATE_ADD(UTC_TIMESTAMP(),INTERVAL ? SECOND),expires_at)',
        [$key, $seconds, $seconds],
    );
    $s = query('SELECT attempts FROM rate_limits WHERE key_hash=?', [$key])->fetch();
    if ($s['attempts'] > $max) {
        header('Retry-After: ' . $seconds);
        fail(429, 'Thao tác quá nhiều lần. Vui lòng thử lại sau.');
    }
}
function transaction(callable $fn): mixed
{
    db()->beginTransaction();
    try {
        $v = $fn();
        db()->commit();
        return $v;
    } catch (Throwable $e) {
        if (db()->inTransaction()) {
            db()->rollBack();
        }
        throw $e;
    }
}
