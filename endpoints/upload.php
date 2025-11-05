<?php
// api/endpoints/upload.php
declare(strict_types=1);
require_once __DIR__ . '/../common.php';
require_once __DIR__ . '/../db.php';
require_api_key();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') json_out(['error'=>'method_not_allowed'], 405);
if (!isset($_POST['product_id']) || !isset($_FILES['image'])) json_out(['error'=>'missing_fields'], 422);

$pid = (int)$_POST['product_id'];
$file = $_FILES['image'];
if ($file['error'] !== UPLOAD_ERR_OK) json_out(['error'=>'upload_failed'], 400);
$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
if (!in_array($ext, ['jpg','jpeg','png','webp'])) json_out(['error'=>'invalid_type'], 422);
if ($file['size'] > (MAX_UPLOAD_MB*1024*1024)) json_out(['error'=>'file_too_large'], 413);

$safe = bin2hex(random_bytes(12)) . '.' . $ext;
$dest = __DIR__ . '/../uploads/' . $safe;
if (!move_uploaded_file($file['tmp_name'], $dest)) json_out(['error'=>'move_failed'], 500);

$pdo = db();
$st = $pdo->prepare('INSERT INTO product_images (product_id, filename) VALUES (?,?)');
$st->execute([$pid, $safe]);

json_out(['ok'=>true, 'filename'=>$safe]);
