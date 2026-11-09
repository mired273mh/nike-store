<?php
declare(strict_types=1);

function order_row(array $o): array
{
    $items = query(
        'SELECT product_id AS productId,product_name AS name,image,quantity,size,color,price FROM order_items WHERE order_id=? ORDER BY id',
        [$o['id']],
    )->fetchAll();
    foreach ($items as &$i) {
        $i['quantity'] = (int) $i['quantity'];
        $i['price'] = (int) $i['price'];
    }
    unset($i);
    return [
        'id' => $o['id'],
        'userId' => $o['user_id'],
        'customerDetails' => [
            'name' => $o['customer_name'],
            'email' => $o['customer_email'],
            'address' => $o['customer_address'],
            'phone' => $o['customer_phone'],
        ],
        'items' => $items,
        'total' => (int) $o['total'],
        'shippingFee' => (int) $o['shipping_fee'],
        'status' => $o['status'],
        'paymentMethod' => $o['payment_method'],
        'paymentStatus' => $o['payment_status'],
        'paymentInstructions' => isset($o['payment_instructions'])
            ? json_decode($o['payment_instructions'], true)
            : null,
        'lastNotification' => last_order_notification($o['id']),
        'reportedNotReceived' => (bool) $o['reported_not_received'],
        'userConfirmedReceived' => (bool) $o['user_confirmed_received'],
        'version' => (int) $o['version'],
        'createdAt' => gmdate('c', strtotime($o['created_at'])),
    ];
}
function orders_route(string $method): never
{
    $u = current_user();
    if ($method === 'GET') {
        $rows =
            $u['role'] === 'admin'
                ? query('SELECT * FROM orders ORDER BY created_at DESC,id DESC')->fetchAll()
                : query('SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC,id DESC', [
                    $u['id'],
                ])->fetchAll();
        respond(array_map('order_row', $rows));
    }
    mutation_guard();
    $d = body();
    if ($method === 'POST') {
        rate_limit('orders', 30, 3600);
        if (isset($d['userId']) && $d['userId'] !== $u['id']) {
            fail(403, 'Không thể tạo đơn cho tài khoản khác.');
        }
        $customer = $d['customerDetails'] ?? null;
        if (!is_array($customer)) {
            fail(400, 'Thiếu thông tin giao hàng.');
        }
        $name = text_field($customer, 'name');
        $email = email_field($customer);
        $address = text_field($customer, 'address', 500, 5);
        $phone = text_field($customer, 'phone', 20, 9);
        if (!preg_match('/^\+?[0-9][0-9 .-]{8,18}$/D', $phone)) {
            fail(400, 'Số điện thoại không hợp lệ.');
        }
        $methodPay = $d['paymentMethod'] ?? 'COD';
        if (!in_array($methodPay, ['COD', 'BANK'], true)) {
            fail(400, 'Hiện hỗ trợ COD hoặc chuyển khoản ngân hàng.');
        }
        $items = $d['items'] ?? null;
        if (
            !is_array($items) ||
            !array_is_list($items) ||
            count($items) < 1 ||
            count($items) > 100
        ) {
            fail(400, 'Giỏ hàng phải có từ 1 đến 100 dòng.');
        }
        $order = transaction(function () use (
            $d,
            $items,
            $name,
            $email,
            $address,
            $phone,
            $u,
            $methodPay,
        ) {
            $normalized = [];
            $quantities = [];
            $subtotal = 0;
            foreach ($items as $i) {
                if (!is_array($i)) {
                    fail(400, 'Sản phẩm trong giỏ không hợp lệ.');
                }
                $pid = text_field($i, 'productId', 100);
                $q = integer_field($i, 'quantity', 1, 99);
                $size = text_field($i, 'size', 20);
                $color = text_field($i, 'color', 80);
                $quantities[$pid] = ($quantities[$pid] ?? 0) + $q;
                $normalized[] = [
                    'productId' => $pid,
                    'quantity' => $q,
                    'size' => $size,
                    'color' => $color,
                ];
            }
            ksort($quantities);
            $products = [];
            foreach ($quantities as $pid => $q) {
                $p = query('SELECT * FROM products WHERE id=? FOR UPDATE', [$pid])->fetch();
                if (!$p) {
                    fail(404, 'Sản phẩm không còn tồn tại.');
                }
                if (!$p['in_stock'] || $p['stock_quantity'] < $q) {
                    fail(409, 'Sản phẩm ' . $p['name'] . ' không đủ tồn kho.');
                }
                $products[$pid] = product_row($p);
            }
            foreach ($normalized as &$i) {
                $p = $products[$i['productId']];
                if (
                    !in_array($i['size'], $p['sizes'], true) ||
                    !in_array($i['color'], array_column($p['colors'], 'name'), true)
                ) {
                    fail(400, 'Size hoặc màu không hợp lệ.');
                }
                $i['price'] = $p['price'];
                $i['name'] = $p['name'];
                $i['image'] = $p['images'][0];
                $subtotal += $p['price'] * $i['quantity'];
            }
            unset($i);
            $shipping = $subtotal > 1000000 ? 0 : 40000;
            $total = $subtotal + $shipping;
            if (isset($d['total']) && (!is_int($d['total']) || $d['total'] !== $total)) {
                fail(400, 'Giá hoặc tổng đơn đã thay đổi. Vui lòng cập nhật giỏ hàng.');
            }
            $id = 'ord-' . bin2hex(random_bytes(12));
            $instructions = $methodPay === 'BANK' ? bank_config() : null;
            if (
                $instructions &&
                $instructions['mode'] === 'real' &&
                (!preg_match('/^[0-9]{6}$/D', $instructions['bin']) ||
                    !preg_match('/^[0-9]{6,25}$/D', $instructions['account']))
            ) {
                fail(409, 'Cửa hàng chưa cấu hình đầy đủ QR ngân hàng.');
            }
            query(
                'INSERT INTO orders(id,user_id,customer_name,customer_email,customer_address,customer_phone,total,shipping_fee,payment_method,payment_instructions) VALUES(?,?,?,?,?,?,?,?,?,?)',
                [
                    $id,
                    $u['id'],
                    $name,
                    $email,
                    $address,
                    $phone,
                    $total,
                    $shipping,
                    $methodPay,
                    $instructions ? json_encode($instructions, JSON_UNESCAPED_UNICODE) : null,
                ],
            );
            foreach ($normalized as $i) {
                query(
                    'INSERT INTO order_items(order_id,product_id,product_name,image,quantity,size,color,price) VALUES(?,?,?,?,?,?,?,?)',
                    [
                        $id,
                        $i['productId'],
                        $i['name'],
                        $i['image'],
                        $i['quantity'],
                        $i['size'],
                        $i['color'],
                        $i['price'],
                    ],
                );
            }
            foreach ($quantities as $pid => $q) {
                query(
                    'UPDATE products SET stock_quantity=stock_quantity-?,version=version+1 WHERE id=?',
                    [$q, $pid],
                );
            }
            audit('order.create', $id, $u['id']);
            return order_row(query('SELECT * FROM orders WHERE id=?', [$id])->fetch());
        });
        $order['lastNotification'] = order_mail($order);
        respond(['order' => $order, 'message' => 'Đặt hàng thành công.'], 201);
    }
    if ($method === 'PUT') {
        $id = text_field($d, 'orderId', 64);
        $order = transaction(function () use ($id, $d, $u) {
            $o = query('SELECT * FROM orders WHERE id=? FOR UPDATE', [$id])->fetch();
            if (!$o) {
                fail(404, 'Không tìm thấy đơn hàng.');
            }
            if ($u['role'] !== 'admin' && $o['user_id'] !== $u['id']) {
                fail(403, 'Đơn hàng không thuộc tài khoản của bạn.');
            }
            if (isset($d['version']) && $d['version'] !== (int) $o['version']) {
                fail(409, 'Đơn hàng vừa được cập nhật. Vui lòng tải lại.');
            }
            $allowed = [
                'orderId',
                'version',
                'status',
                'paymentStatus',
                'reportedNotReceived',
                'userConfirmedReceived',
            ];
            if (array_diff(array_keys($d), $allowed)) {
                fail(400, 'Có trường cập nhật không được hỗ trợ.');
            }
            if (count(array_intersect(array_keys($d), array_slice($allowed, 2))) === 0) {
                fail(400, 'Thiếu thay đổi cần cập nhật.');
            }
            $status = $d['status'] ?? $o['status'];
            $payment = $d['paymentStatus'] ?? $o['payment_status'];
            $reported = (bool) $o['reported_not_received'];
            $confirmed = (bool) $o['user_confirmed_received'];
            if (
                !in_array(
                    $status,
                    ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
                    true,
                ) ||
                !in_array($payment, ['Paid', 'Unpaid'], true)
            ) {
                fail(400, 'Trạng thái không hợp lệ.');
            }
            if ($u['role'] === 'admin') {
                $transitions = [
                    'Pending' => ['Processing', 'Cancelled'],
                    'Processing' => ['Shipped', 'Cancelled'],
                    'Shipped' => ['Delivered'],
                    'Delivered' => [],
                    'Cancelled' => [],
                ];
                if (
                    $status !== $o['status'] &&
                    !in_array($status, $transitions[$o['status']], true)
                ) {
                    fail(409, 'Không thể chuyển sang trạng thái này.');
                }
                if ($payment !== $o['payment_status']) {
                    if (
                        $payment !== 'Paid' ||
                        $status === 'Cancelled' ||
                        ($o['payment_method'] === 'COD' && $status !== 'Delivered')
                    ) {
                        fail(409, 'Chỉ xác nhận đã thu tiền COD khi giao thành công.');
                    }
                }
                if (isset($d['reportedNotReceived'])) {
                    fail(403, 'Chỉ khách hàng gửi khiếu nại.');
                }
                if (isset($d['userConfirmedReceived'])) {
                    fail(403, 'Chỉ khách hàng xác nhận nhận hàng.');
                }
                if ($status === 'Delivered' && $o['status'] !== 'Delivered') {
                    $reported = false;
                }
            } else {
                if (isset($d['paymentStatus'])) {
                    fail(403, 'Thanh toán do quản trị viên xác nhận.');
                }
                if (
                    isset($d['status']) &&
                    !($status === 'Cancelled' && $o['status'] === 'Pending')
                ) {
                    fail(403, 'Bạn chỉ có thể hủy đơn đang chờ xác nhận.');
                }
                if (isset($d['reportedNotReceived'])) {
                    if (
                        !boolean_field($d, 'reportedNotReceived') ||
                        $o['status'] !== 'Delivered' ||
                        isset($d['status']) ||
                        isset($d['userConfirmedReceived'])
                    ) {
                        fail(409, 'Chỉ báo chưa nhận hàng cho đơn đã giao.');
                    }
                    $reported = true;
                    $confirmed = false;
                }
                if (isset($d['userConfirmedReceived'])) {
                    if (
                        !boolean_field($d, 'userConfirmedReceived') ||
                        !in_array($o['status'], ['Shipped', 'Delivered'], true) ||
                        isset($d['status'])
                    ) {
                        fail(409, 'Chỉ xác nhận nhận hàng khi đơn đã được gửi.');
                    }
                    $confirmed = true;
                    $reported = false;
                    $status = 'Delivered';
                }
            }
            if ($status === 'Cancelled' && $o['status'] !== 'Cancelled') {
                if ($o['payment_status'] === 'Paid') {
                    fail(409, 'Đơn đã thanh toán cần liên hệ cửa hàng để hoàn tiền.');
                }
                $restore = query(
                    'SELECT product_id,SUM(quantity) AS qty FROM order_items WHERE order_id=? AND product_id IS NOT NULL GROUP BY product_id ORDER BY product_id',
                    [$id],
                )->fetchAll();
                foreach ($restore as $r) {
                    query(
                        'UPDATE products SET stock_quantity=stock_quantity+?,version=version+1 WHERE id=?',
                        [(int) $r['qty'], $r['product_id']],
                    );
                }
            }
            query(
                'UPDATE orders SET status=?,payment_status=?,reported_not_received=?,user_confirmed_received=?,version=version+1 WHERE id=?',
                [$status, $payment, (int) $reported, (int) $confirmed, $id],
            );
            audit('order.update', $id, $u['id']);
            return order_row(query('SELECT * FROM orders WHERE id=?', [$id])->fetch());
        });
        $order['lastNotification'] = order_mail($order);
        if ($order['reportedNotReceived']) {
            try {
                send_mail(
                    mail_config()['adminEmail'],
                    'Khiếu nại chưa nhận hàng: ' . $order['id'],
                    'Vui lòng kiểm tra đơn hàng trong trang quản trị.',
                );
            } catch (Throwable $e) {
                error_log($e->getMessage());
            }
        }
        respond(['order' => $order, 'message' => 'Đã cập nhật đơn hàng.']);
    }
    fail(405, 'Phương thức không được hỗ trợ.');
}
