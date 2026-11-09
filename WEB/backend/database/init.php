<?php
declare(strict_types=1);
require_once __DIR__ . '/../src/bootstrap.php';
require_once ROOT . '/src/products.php';
if (PHP_SAPI !== 'cli') {
    exit(1);
}
db()->exec(file_get_contents(__DIR__ . '/schema.sql'));
if (!query("SHOW COLUMNS FROM orders LIKE 'payment_instructions'")->fetch()) {
    db()->exec('ALTER TABLE orders ADD COLUMN payment_instructions JSON NULL AFTER payment_status');
}
if (
    query("SHOW COLUMNS FROM order_notifications LIKE 'created_at'")->fetch()['Type'] !==
    'datetime(6)'
) {
    db()->exec(
        'ALTER TABLE order_notifications MODIFY created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)',
    );
}
if (!query('SELECT name FROM app_metadata WHERE name=?', ['initial_seed'])->fetch()) {
    transaction(function () {
        $products = json_decode(
            file_get_contents(__DIR__ . '/products.json'),
            true,
            512,
            JSON_THROW_ON_ERROR,
        );
        foreach ($products as $p) {
            $p['stockQuantity'] = $p['stockQuantity'] ?? 100;
            $p['descriptionHtml'] =
                $p['descriptionHtml'] ??
                '<p>' . htmlspecialchars($p['description'], ENT_QUOTES, 'UTF-8') . '</p>';
            store_product(product_input($p), $p['id'], true);
            query('UPDATE products SET rating=?,reviews_count=? WHERE id=?', [
                $p['rating'],
                $p['reviewsCount'],
                $p['id'],
            ]);
        }
        $users = [
            [
                'id' => 'usr-1',
                'email' => 'admin@premium.com',
                'name' => 'Admin Nike Store',
                'role' => 'admin',
                'password' => 'Admin123!',
            ],
            [
                'id' => 'usr-2',
                'email' => 'user@premium.com',
                'name' => 'Khách hàng',
                'role' => 'user',
                'password' => 'User123!',
            ],
        ];
        foreach ($users as $u) {
            query('INSERT INTO users(id,email,password_hash,name,role) VALUES(?,?,?,?,?)', [
                $u['id'],
                $u['email'],
                password_hash($u['password'], PASSWORD_DEFAULT),
                $u['name'],
                $u['role'],
            ]);
        }
        query('INSERT INTO app_metadata(name,value) VALUES(?,?)', ['initial_seed', gmdate('c')]);
    });
    echo "Database initialized with demonstration data.\n";
} else {
    echo "Schema checked; existing data preserved.\n";
}
