<?php
declare(strict_types=1);
require __DIR__ . '/../src/bootstrap.php';
require ROOT . '/src/products.php';
if (PHP_SAPI !== 'cli') {
    exit(1);
}
// Export only public seed products and synthetic demo accounts, never runtime rows.
$sql =
    "-- Website Nike Store: clean demonstration schema + seed\n-- Select an empty database before importing. UTF-8 / MySQL 8.\n" .
    file_get_contents(__DIR__ . '/schema.sql') .
    "\nSTART TRANSACTION;\n";
function sql_value(mixed $value): string
{
    if ($value === null) {
        return 'NULL';
    }
    if (is_int($value) || is_float($value)) {
        return (string) $value;
    }
    return db()->quote((string) $value);
}
foreach (json_decode(file_get_contents(__DIR__ . '/products.json'), true) as $p) {
    $html = clean_html('<p>' . htmlspecialchars($p['description'], ENT_QUOTES, 'UTF-8') . '</p>');
    $values = [
        $p['id'],
        $p['name'],
        $p['description'],
        $html,
        $p['price'],
        $p['originalPrice'] ?? null,
        $p['category'],
        $p['subcategory'],
        json_encode($p['sizes']),
        json_encode($p['colors']),
        $p['rating'],
        $p['reviewsCount'],
        (int) $p['featured'],
        (int) $p['trending'],
        (int) $p['inStock'],
        100,
    ];
    $sql .=
        'INSERT INTO products(id,name,description,description_html,price,original_price,category,subcategory,sizes,colors,rating,reviews_count,featured,trending,in_stock,stock_quantity) VALUES (' .
        implode(',', array_map('sql_value', $values)) .
        ");\n";
    foreach ($p['images'] as $position => $url) {
        $sql .=
            'INSERT INTO product_images(product_id,url,position) VALUES (' .
            implode(',', array_map('sql_value', [$p['id'], $url, $position])) .
            ");\n";
    }
}
foreach (
    [
        ['usr-1', 'admin@premium.com', 'Admin123!', 'Admin Nike Store', 'admin'],
        ['usr-2', 'user@premium.com', 'User123!', 'Khách hàng', 'user'],
    ]
    as [$id, $email, $password, $name, $role]
) {
    $sql .=
        'INSERT INTO users(id,email,password_hash,name,role) VALUES (' .
        implode(
            ',',
            array_map('sql_value', [
                $id,
                $email,
                password_hash($password, PASSWORD_DEFAULT),
                $name,
                $role,
            ]),
        ) .
        ");\n";
}
$sql .=
    "INSERT INTO app_metadata(name,value) VALUES ('initial_seed','demo-sql-import');\nCOMMIT;\n";
file_put_contents(__DIR__ . '/demo.sql', $sql);
echo "Clean demo SQL exported.\n";
