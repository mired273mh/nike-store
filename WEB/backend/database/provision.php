<?php
declare(strict_types=1);
require __DIR__ . '/../src/bootstrap.php';
if (PHP_SAPI !== 'cli') {
    exit(1);
}
$pdo = new PDO(
    'mysql:host=' .
        env('DB_HOST', '127.0.0.1') .
        ';port=' .
        env('DB_PORT', '3307') .
        ';charset=utf8mb4',
    'root',
    env('MYSQL_ROOT_PASSWORD'),
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION],
);
$name = env('DB_DATABASE', 'nike_store');
$user = env('DB_USERNAME', 'nike_app');
$password = env('DB_PASSWORD');
if (
    !preg_match('/^[a-zA-Z0-9_]+$/D', $name) ||
    !preg_match('/^[a-zA-Z0-9_]+$/D', $user) ||
    strlen($password) < 16
) {
    throw new RuntimeException('Invalid database credentials.');
}
$pdo->exec(
    'CREATE DATABASE IF NOT EXISTS `' .
        $name .
        '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
);
$pdo->exec(
    'CREATE USER IF NOT EXISTS ' .
        $pdo->quote($user) .
        "@'127.0.0.1' IDENTIFIED BY " .
        $pdo->quote($password),
);
$pdo->exec(
    'CREATE USER IF NOT EXISTS ' .
        $pdo->quote($user) .
        "@'localhost' IDENTIFIED BY " .
        $pdo->quote($password),
);
foreach (['localhost', '127.0.0.1'] as $host) {
    $pdo->exec(
        'GRANT ALL PRIVILEGES ON `' .
            $name .
            '`.* TO ' .
            $pdo->quote($user) .
            '@' .
            $pdo->quote($host),
    );
}
if (env('MYSQL_NEW_ROOT_PASSWORD') !== '') {
    $pdo->exec(
        "ALTER USER 'root'@'localhost' IDENTIFIED BY " .
            $pdo->quote(env('MYSQL_NEW_ROOT_PASSWORD')),
    );
}
echo "Application database and scoped account ready.\n";
