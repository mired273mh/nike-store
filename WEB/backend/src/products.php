<?php
declare(strict_types=1);

function clean_html(string $html): string
{
    $html = preg_replace('#<(script|style|iframe|object)\b[^>]*>.*?</\1>#is', '', $html);
    $html = strip_tags($html, '<p><br><strong><b><em><i><u><ul><ol><li><h2><h3><blockquote>');
    return preg_replace('/<([a-z0-9]+)\b[^>]*>/i', '<$1>', $html);
}
function image_url(mixed $url): string
{
    if (!is_string($url) || strlen($url) > 1024) {
        fail(400, 'Đường dẫn ảnh không hợp lệ.');
    }
    if (
        preg_match(
            '#^/(images/[a-zA-Z0-9_.-]+\.(png|jpg|jpeg|webp|svg)|uploads/[a-f0-9]{32}\.(png|jpg|webp))$#D',
            $url,
        )
    ) {
        return $url;
    }
    if (
        filter_var($url, FILTER_VALIDATE_URL) &&
        parse_url($url, PHP_URL_SCHEME) === 'https' &&
        !parse_url($url, PHP_URL_USER)
    ) {
        return $url;
    }
    fail(400, 'Ảnh phải là đường dẫn nội bộ hoặc URL HTTPS.');
}
function product_row(array $r): array
{
    $imgs = query('SELECT url FROM product_images WHERE product_id=? ORDER BY position,id', [
        $r['id'],
    ])->fetchAll(PDO::FETCH_COLUMN);
    return [
        'id' => $r['id'],
        'name' => $r['name'],
        'description' => $r['description'],
        'descriptionHtml' => $r['description_html'],
        'price' => (int) $r['price'],
        'originalPrice' => $r['original_price'] === null ? null : (int) $r['original_price'],
        'category' => $r['category'],
        'subcategory' => $r['subcategory'],
        'images' => $imgs,
        'sizes' => json_decode($r['sizes'], true),
        'colors' => json_decode($r['colors'], true),
        'rating' => (float) $r['rating'],
        'reviewsCount' => (int) $r['reviews_count'],
        'featured' => (bool) $r['featured'],
        'trending' => (bool) $r['trending'],
        'inStock' => (bool) $r['in_stock'] && (int) $r['stock_quantity'] > 0,
        'stockQuantity' => (int) $r['stock_quantity'],
        'version' => (int) $r['version'],
    ];
}
function product_input(array $d, ?array $old = null): array
{
    $d = array_merge($old ?? [], $d);
    $p = [
        'name' => text_field($d, 'name', 180),
        'description' => text_field($d, 'description', 20000),
        'price' => integer_field($d, 'price', 1, 1000000000),
        'category' => text_field($d, 'category', 20),
        'subcategory' => text_field($d, 'subcategory', 120),
        'stockQuantity' => integer_field($d, 'stockQuantity', 0, 1000000),
        'featured' => boolean_field($d, 'featured'),
        'trending' => boolean_field($d, 'trending'),
        'inStock' => boolean_field($d, 'inStock', true),
    ];
    if (!in_array($p['category'], ['Sneaker', 'SportShoes', 'Clothing'], true)) {
        fail(400, 'Danh mục không hợp lệ.');
    }
    $p['originalPrice'] = isset($d['originalPrice'])
        ? integer_field($d, 'originalPrice', $p['price'], 1000000000)
        : null;
    $p['descriptionHtml'] = clean_html((string) ($d['descriptionHtml'] ?? ''));
    $imgs = $d['images'] ?? null;
    if (!is_array($imgs) || !array_is_list($imgs) || count($imgs) < 1 || count($imgs) > 10) {
        fail(400, 'Cần từ 1 đến 10 ảnh.');
    }
    $p['images'] = array_values(array_unique(array_map('image_url', $imgs)));
    $sizes = $d['sizes'] ?? null;
    $colors = $d['colors'] ?? null;
    if (!is_array($sizes) || !array_is_list($sizes) || count($sizes) < 1 || count($sizes) > 30) {
        fail(400, 'Cần từ 1 đến 30 kích thước.');
    }
    $p['sizes'] = array_values(
        array_unique(array_map(fn($v) => text_field(['size' => $v], 'size', 20), $sizes)),
    );
    if (
        !is_array($colors) ||
        !array_is_list($colors) ||
        count($colors) < 1 ||
        count($colors) > 20
    ) {
        fail(400, 'Cần từ 1 đến 20 màu.');
    }
    $p['colors'] = array_map(function ($c) {
        if (!is_array($c)) {
            fail(400, 'Màu không hợp lệ.');
        }
        $name = text_field($c, 'name', 80);
        $hex = text_field($c, 'hex', 7, 7);
        if (!preg_match('/^#[a-f0-9]{6}$/iD', $hex)) {
            fail(400, 'Mã màu không hợp lệ.');
        }
        return ['name' => $name, 'hex' => $hex];
    }, $colors);
    if ($p['stockQuantity'] === 0) {
        $p['inStock'] = false;
    }
    return $p;
}
function store_product(array $p, string $id, bool $new): array
{
    $args = [
        $p['name'],
        $p['description'],
        $p['descriptionHtml'],
        $p['price'],
        $p['originalPrice'],
        $p['category'],
        $p['subcategory'],
        json_encode($p['sizes']),
        json_encode($p['colors']),
        (int) $p['featured'],
        (int) $p['trending'],
        (int) $p['inStock'],
        $p['stockQuantity'],
    ];
    if ($new) {
        query(
            'INSERT INTO products(name,description,description_html,price,original_price,category,subcategory,sizes,colors,featured,trending,in_stock,stock_quantity,id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
            [...$args, $id],
        );
    } else {
        query(
            'UPDATE products SET name=?,description=?,description_html=?,price=?,original_price=?,category=?,subcategory=?,sizes=?,colors=?,featured=?,trending=?,in_stock=?,stock_quantity=?,version=version+1 WHERE id=?',
            [...$args, $id],
        );
    }
    query('DELETE FROM product_images WHERE product_id=?', [$id]);
    foreach ($p['images'] as $i => $url) {
        query('INSERT INTO product_images(product_id,url,position) VALUES(?,?,?)', [$id, $url, $i]);
    }
    return product_row(query('SELECT * FROM products WHERE id=?', [$id])->fetch());
}
function products_route(?string $id, string $method): never
{
    if ($method === 'GET') {
        $s = session_data();
        $admin = ($s['role'] ?? null) === 'admin';
        if ($id !== null) {
            $r = query('SELECT * FROM products WHERE id=?', [$id])->fetch();
            if (!$r || (!$admin && (!$r['in_stock'] || $r['stock_quantity'] < 1))) {
                fail(404, 'Không tìm thấy sản phẩm.');
            }
            respond(product_row($r));
        }
        $where = [
            $admin && ($_GET['includeHidden'] ?? '') === '1'
                ? '1=1'
                : 'in_stock=1 AND stock_quantity>0',
        ];
        $args = [];
        if (isset($_GET['category']) && $_GET['category'] !== 'All') {
            $where[] = 'category=?';
            $args[] = $_GET['category'];
        }
        if (isset($_GET['search'])) {
            $s = substr((string) $_GET['search'], 0, 200);
            $where[] = '(name LIKE ? OR description LIKE ? OR subcategory LIKE ?)';
            array_push($args, '%' . $s . '%', '%' . $s . '%', '%' . $s . '%');
        }
        $sort =
            [
                'price_asc' => 'price ASC,id',
                'price_desc' => 'price DESC,id',
                'rating' => 'rating DESC,id',
                'featured' => 'featured DESC,id',
            ][$_GET['sort'] ?? 'featured'] ?? 'featured DESC,id';
        $sql = ' FROM products WHERE ' . implode(' AND ', $where);
        if (isset($_GET['page'])) {
            $page = max(1, (int) $_GET['page']);
            $per = min(48, max(1, (int) ($_GET['perPage'] ?? 9)));
            $count = (int) query('SELECT COUNT(*)' . $sql, $args)->fetchColumn();
            $offset = ($page - 1) * $per;
            $rows = query(
                'SELECT *' . $sql . ' ORDER BY ' . $sort . ' LIMIT ' . $per . ' OFFSET ' . $offset,
                $args,
            )->fetchAll();
            respond([
                'products' => array_map('product_row', $rows),
                'total' => $count,
                'page' => $page,
                'perPage' => $per,
                'totalPages' => (int) ceil($count / $per),
            ]);
        }
        respond(
            array_map(
                'product_row',
                query('SELECT *' . $sql . ' ORDER BY ' . $sort, $args)->fetchAll(),
            ),
        );
    }
    $u = admin_user();
    mutation_guard();
    if ($method === 'POST' && $id === null) {
        $p = product_input(body());
        $id = 'prd-' . bin2hex(random_bytes(12));
        $r = transaction(fn() => store_product($p, $id, true));
        audit('product.create', $id, $u['id']);
        respond(['product' => $r, 'message' => 'Đã thêm sản phẩm.'], 201);
    }
    if ($id !== null && in_array($method, ['PUT', 'DELETE'], true)) {
        $data = $method === 'PUT' ? body() : [];
        $r = transaction(function () use ($id, $method, $data) {
            $old = query('SELECT * FROM products WHERE id=? FOR UPDATE', [$id])->fetch();
            if (!$old) {
                fail(404, 'Không tìm thấy sản phẩm.');
            }
            if ($method === 'DELETE') {
                query('DELETE FROM products WHERE id=?', [$id]);
                return null;
            }
            if (isset($data['version']) && $data['version'] !== (int) $old['version']) {
                fail(409, 'Sản phẩm đã được cập nhật. Vui lòng tải lại.');
            }
            return store_product(product_input($data, product_row($old)), $id, false);
        });
        audit('product.' . strtolower($method), $id, $u['id']);
        respond([
            'product' => $r,
            'message' => $method === 'DELETE' ? 'Đã xóa sản phẩm.' : 'Đã cập nhật sản phẩm.',
        ]);
    }
    if ($id === null && in_array($method, ['PUT', 'DELETE'], true)) {
        $d = body();
        $ids = $d['productIds'] ?? null;
        if (!is_array($ids) || !array_is_list($ids) || !count($ids) || count($ids) > 100) {
            fail(400, 'Chọn từ 1 đến 100 sản phẩm.');
        }
        foreach ($ids as $v) {
            if (!is_string($v) || strlen($v) > 100) {
                fail(400, 'Mã sản phẩm không hợp lệ.');
            }
        }
        $stock = $method === 'PUT' ? boolean_field($d, 'inStock') : false;
        $marks = implode(',', array_fill(0, count($ids), '?'));
        transaction(function () use ($method, $ids, $marks, $stock) {
            if ($method === 'DELETE') {
                query('DELETE FROM products WHERE id IN (' . $marks . ')', $ids);
            } else {
                query(
                    'UPDATE products SET in_stock=IF(stock_quantity>0,?,0),version=version+1 WHERE id IN (' .
                        $marks .
                        ')',
                    [(int) $stock, ...$ids],
                );
            }
        });
        audit(
            'product.batch_' . strtolower($method),
            implode(',', array_slice($ids, 0, 2)),
            $u['id'],
        );
        respond(['message' => 'Đã cập nhật các sản phẩm được chọn.']);
    }
    fail(405, 'Phương thức không được hỗ trợ.');
}
