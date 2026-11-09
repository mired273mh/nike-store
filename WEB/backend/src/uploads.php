<?php
declare(strict_types=1);

function uploads_route(string $method): never
{
    $u = admin_user();
    mutation_guard();
    if ($method !== 'POST') {
        fail(405, 'Phương thức không được hỗ trợ.');
    }
    rate_limit('uploads', 60, 3600);
    $files = $_FILES['images'] ?? null;
    if (
        !$files ||
        !is_array($files['name']) ||
        count($files['name']) < 1 ||
        count($files['name']) > 10
    ) {
        fail(400, 'Chọn từ 1 đến 10 ảnh.');
    }
    $validated = [];
    $types = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    $info = new finfo(FILEINFO_MIME_TYPE);
    foreach ($files['name'] as $i => $name) {
        if ($files['error'][$i] !== UPLOAD_ERR_OK) {
            fail(400, 'Upload ảnh thất bại.');
        }
        if ($files['size'][$i] > 5242880) {
            fail(413, 'Mỗi ảnh tối đa 5MB.');
        }
        $tmp = $files['tmp_name'][$i];
        $mime = $info->file($tmp);
        $size = @getimagesize($tmp);
        if (!isset($types[$mime]) || !$size || $size[0] > 8000 || $size[1] > 8000) {
            fail(400, 'Chỉ nhận ảnh JPG, PNG, WebP hợp lệ, tối đa 8000px.');
        }
        $id = bin2hex(random_bytes(16));
        $validated[] = [
            'id' => $id,
            'filename' => $id . '.' . $types[$mime],
            'mime' => $mime,
            'tmp' => $tmp,
        ];
    }
    $dir = ROOT . '/storage/uploads';
    if (!is_dir($dir)) {
        mkdir($dir, 0700, true);
    }
    $moved = [];
    try {
        transaction(function () use ($validated, $dir, $u, &$moved) {
            foreach ($validated as $f) {
                if (!move_uploaded_file($f['tmp'], $dir . '/' . $f['filename'])) {
                    throw new RuntimeException('Unable to move uploaded file.');
                }
                $moved[] = $dir . '/' . $f['filename'];
                query('INSERT INTO uploads(id,user_id,filename,mime_type) VALUES(?,?,?,?)', [
                    $f['id'],
                    $u['id'],
                    $f['filename'],
                    $f['mime'],
                ]);
            }
        });
    } catch (Throwable $e) {
        foreach ($moved as $p) {
            if (is_file($p)) {
                unlink($p);
            }
        }
        throw $e;
    }
    respond(['images' => array_map(fn($f) => '/uploads/' . $f['filename'], $validated)], 201);
}
