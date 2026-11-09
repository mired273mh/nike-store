<?php
declare(strict_types=1);
require __DIR__ . '/../backend/src/bootstrap.php';
if (PHP_SAPI !== 'cli' || env('DB_DATABASE') !== 'nike_store_test') {
    throw new RuntimeException('Test database must be explicitly selected.');
}
$action = $_SERVER['argv'][1] ?? '';
if ($action === 'reset' || $action === 'reseed' || $action === 'import-demo') {
    db()->exec('SET FOREIGN_KEY_CHECKS=0');
    foreach (query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN) as $table) {
        db()->exec('DROP TABLE `' . str_replace('`', '``', $table) . '`');
    }
    db()->exec('SET FOREIGN_KEY_CHECKS=1');
    echo "Test schema cleared.\n";
    if ($action === 'reseed') {
        require __DIR__ . '/../backend/database/init.php';
    }
    if ($action === 'import-demo') {
        db()->exec(file_get_contents(__DIR__ . '/../backend/database/demo.sql'));
    }
} elseif ($action === 'inspect') {
    echo json_encode([
        'passwords' => query('SELECT id,password_hash FROM users')->fetchAll(),
        'resets' => query('SELECT user_id,attempts,expires_at FROM password_resets')->fetchAll(),
        'orders' => (int) query('SELECT COUNT(*) FROM orders')->fetchColumn(),
    ]);
} elseif ($action === 'expire-reset') {
    query('UPDATE password_resets SET expires_at=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 1 SECOND)');
} elseif ($action === 'clear-limits') {
    query('DELETE FROM rate_limits');
} else {
    throw new RuntimeException('Unknown test helper action.');
}
