<?php
// api-folder/endpoints/products.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // dev only
header('Access-Control-Allow-Headers: Content-Type, X-API-Key, X-HTTP-Method-Override');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../common.php';
require_once __DIR__ . '/../db.php';
require_api_key();

function pdo_conn() {
    // support both db() and get_pdo()
    if (function_exists('db')) return db();
    if (function_exists('get_pdo')) return db();
    throw new Exception('No DB connection function found');
}   

function read_json_body() {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

try {
    $pdo = pdo_conn();
    $method = $_SERVER['REQUEST_METHOD'];
    $override = isset($_POST['_method']) ? strtoupper($_POST['_method']) : null;
    if ($override) $method = $override; // support POST + _method=PUT/DELETE

    /* ----------------- READ (LIST or SINGLE) ----------------- */
    if ($method === 'GET') {
        // single by id
        if (isset($_GET['id'])) {
            $id = (int)$_GET['id'];
            $st = $pdo->prepare("
                SELECT p.*, COALESCE(c.name,'') AS category_name
                FROM products p
                LEFT JOIN categories c ON c.id = p.category_id
                WHERE p.id = :id
                LIMIT 1
            ");
            $st->execute([':id' => $id]);
            $row = $st->fetch(PDO::FETCH_ASSOC);
            echo json_encode(['ok' => true, 'item' => $row ?: null], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // list with pagination + search
        $page  = isset($_GET['page'])  ? max(1, (int)$_GET['page'])  : 1;
        $limit = isset($_GET['limit']) ? max(1, min(200, (int)$_GET['limit'])) : 20;
        $offset = ($page - 1) * $limit;
        $q = isset($_GET['q']) ? trim($_GET['q']) : '';

        $searchColumns = [
            'p.name',
            'p.sku',
            'p.description',
            'p.brand',
            'p.dimensions',
        ];

        $where = '';
        if ($q !== '') {
            $likeParts = [];
            foreach ($searchColumns as $idx => $column) {
                $likeParts[] = "{$column} LIKE :q{$idx}";
            }
            $where = 'WHERE (' . implode(' OR ', $likeParts) . ')';
        }

        $countSql = "SELECT COUNT(*) FROM products p " . ($where ? $where : "");
        $countStmt = $pdo->prepare($countSql);
        if ($q !== '') {
            foreach ($searchColumns as $idx => $_) {
                $countStmt->bindValue(":q{$idx}", "%{$q}%", PDO::PARAM_STR);
            }
        }
        $countStmt->execute();
        $total = (int)$countStmt->fetchColumn();

        $sql = "
            SELECT p.*, COALESCE(c.name,'') AS category_name
            FROM products p
            LEFT JOIN categories c ON c.id = p.category_id
            " . ($where ? $where : "") . "
            ORDER BY p.id DESC
            LIMIT $limit OFFSET $offset
        ";
        $stmt = $pdo->prepare($sql);
        if ($q !== '') {
            foreach ($searchColumns as $idx => $_) {
                $stmt->bindValue(":q{$idx}", "%{$q}%", PDO::PARAM_STR);
            }
        }
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'ok'    => true,
            'page'  => $page,
            'limit' => $limit,
            'total' => $total,
            'items' => $rows,
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    /* ----------------- CREATE ----------------- */
    if ($method === 'POST') {
        $body = $_POST ?: read_json_body();

        $name  = isset($body['name']) ? trim($body['name']) : '';
        $sku   = isset($body['sku'])  ? trim($body['sku'])  : '';
        $mrp = isset($body['mrp']) ? (float)$body['mrp'] : null;
        $wholesale_rate = isset($body['wholesale_rate']) ? (float)$body['wholesale_rate'] : null;
        $stock = isset($body['stock']) ? (int)$body['stock'] : 0;
        $status = isset($body['status']) ? trim($body['status']) : 'active';
        $description = isset($body['description']) ? trim($body['description']) : '';
        $brand = isset($body['brand']) ? trim($body['brand']) : '';
        $dimensions = isset($body['dimensions']) ? trim($body['dimensions']) : '';
        $currency = isset($body['currency']) ? trim($body['currency']) : 'INR';
        $category_id = isset($body['category_id']) && $body['category_id'] !== '' ? (int)$body['category_id'] : null;

        if ($name === '') throw new Exception('name is required');

        // ✅ Handle image upload
        $imagePath = null;
        if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
            $file = $_FILES['image'];
            $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            $allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
            
            if (!in_array($ext, $allowedExts)) {
                throw new Exception('Invalid image format. Allowed: jpg, jpeg, png, webp, gif');
            }
            
            // Max file size: 5MB
            $maxSize = 5 * 1024 * 1024; // 5MB in bytes
            if ($file['size'] > $maxSize) {
                throw new Exception('Image size too large. Maximum 5MB allowed');
            }
            
            // Create uploads directory if it doesn't exist
            $uploadDir = __DIR__ . '/../uploads/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }
            
            // Generate unique filename
            $filename = bin2hex(random_bytes(12)) . '_' . time() . '.' . $ext;
            $targetPath = $uploadDir . $filename;
            
            // Move uploaded file
            if (move_uploaded_file($file['tmp_name'], $targetPath)) {
                // Store relative path (uploads/filename.ext)
                $imagePath = 'uploads/' . $filename;
            } else {
                throw new Exception('Failed to upload image');
            }
        }

        $sql = "INSERT INTO products (name, sku, mrp, wholesale_rate, stock, status, description, brand, dimensions, currency, category_id, image)
                VALUES (:name, :sku, :mrp, :wholesale_rate, :stock, :status, :description, :brand, :dimensions, :currency, :category_id, :image)";
        $st = $pdo->prepare($sql);
        $st->bindValue(':name', $name);
        $st->bindValue(':sku', $sku);
        $st->bindValue(':mrp', $mrp, $mrp === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
        $st->bindValue(':wholesale_rate', $wholesale_rate, $wholesale_rate === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
        $st->bindValue(':stock', $stock);
        $st->bindValue(':status', $status);
        $st->bindValue(':description', $description);
        $st->bindValue(':brand', $brand);
        $st->bindValue(':dimensions', $dimensions);
        $st->bindValue(':currency', $currency);
        $st->bindValue(':category_id', $category_id, $category_id === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
        $st->bindValue(':image', $imagePath, $imagePath === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
        $st->execute();

        $id = (int)$pdo->lastInsertId();
        
        // ✅ Also save to product_images table if image was uploaded
        if ($imagePath) {
            try {
                $imgSt = $pdo->prepare('INSERT INTO product_images (product_id, image_url, created_at) VALUES (?, ?, NOW())');
                $imgSt->execute([$id, $imagePath]);
            } catch (Exception $e) {
                // If product_images table doesn't exist or has different structure, continue
                error_log("Failed to save to product_images: " . $e->getMessage());
            }
        }
        
        echo json_encode(['ok' => true, 'id' => $id, 'image' => $imagePath], JSON_UNESCAPED_UNICODE);
        exit;
    }

    /* ----------------- UPDATE ----------------- */
    if ($method === 'PUT' || $method === 'PATCH') {
        if (!isset($_GET['id'])) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'id required']); exit; }
        $id = (int)$_GET['id'];
        $body = $_POST ?: read_json_body();

        // ✅ Handle image upload for update
        $imagePath = null;
        if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
            $file = $_FILES['image'];
            $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            $allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
            
            if (!in_array($ext, $allowedExts)) {
                http_response_code(400);
                echo json_encode(['ok' => false, 'error' => 'Invalid image format. Allowed: jpg, jpeg, png, webp, gif']);
                exit;
            }
            
            // Max file size: 5MB
            $maxSize = 5 * 1024 * 1024;
            if ($file['size'] > $maxSize) {
                http_response_code(400);
                echo json_encode(['ok' => false, 'error' => 'Image size too large. Maximum 5MB allowed']);
                exit;
            }
            
            // Create uploads directory if it doesn't exist
            $uploadDir = __DIR__ . '/../uploads/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }
            
            // Generate unique filename
            $filename = bin2hex(random_bytes(12)) . '_' . time() . '.' . $ext;
            $targetPath = $uploadDir . $filename;
            
            // Move uploaded file
            if (move_uploaded_file($file['tmp_name'], $targetPath)) {
                $imagePath = 'uploads/' . $filename;
                
                // Delete old image if exists
                $oldSt = $pdo->prepare("SELECT image FROM products WHERE id = :id");
                $oldSt->execute([':id' => $id]);
                $oldRow = $oldSt->fetch(PDO::FETCH_ASSOC);
                if ($oldRow && $oldRow['image'] && file_exists(__DIR__ . '/../' . $oldRow['image'])) {
                    @unlink(__DIR__ . '/../' . $oldRow['image']);
                }
            } else {
                http_response_code(500);
                echo json_encode(['ok' => false, 'error' => 'Failed to upload image']);
                exit;
            }
        }

        // allowed columns
        $allowed = [
            'name' => 'string',
            'sku'  => 'string',
            'mrp' => 'float_nullable',
            'wholesale_rate' => 'float_nullable',
            'stock' => 'int',
            'status' => 'string',
            'description' => 'string',
            'brand' => 'string',
            'dimensions' => 'string',
            'currency' => 'string',
            'category_id' => 'int_nullable',
            'image' => 'string',
        ];

        $sets = [];
        $params = [':id' => $id];

        // ✅ Add image path to body if uploaded
        if ($imagePath !== null) {
            $body['image'] = $imagePath;
        }

        foreach ($allowed as $key => $type) {
            if (!array_key_exists($key, $body) && $key !== 'image') continue;
            // Special handling for image: only update if new image uploaded or explicitly set
            if ($key === 'image' && $imagePath === null && !isset($body['image'])) continue;
            
            $param = ':' . $key;
            $sets[] = "$key = $param";

            $val = $key === 'image' && $imagePath !== null ? $imagePath : $body[$key];
            if ($type === 'float') $val = (float)$val;
            if ($type === 'int') $val = (int)$val;

            if ($type === 'int_nullable' || $type === 'float_nullable') {
                if ($val === '' || $val === null) {
                    $params[$param] = null;
                } else {
                    $params[$param] = $type === 'int_nullable' ? (int)$val : (float)$val;
                }
                continue;
            }
            $params[$param] = $val;
        }

        if (empty($sets)) { echo json_encode(['ok'=>true,'updated'=>0]); exit; }

        $sql = "UPDATE products SET " . implode(', ', $sets) . " WHERE id = :id";
        $st = $pdo->prepare($sql);
        foreach ($params as $k => $v) {
            if (($k === ':category_id' || $k === ':mrp' || $k === ':wholesale_rate') && $v === null) {
                $st->bindValue($k, null, PDO::PARAM_NULL);
            } else {
                $st->bindValue($k, $v);
            }
        }
        $st->execute();

        echo json_encode(['ok' => true, 'updated' => $st->rowCount()], JSON_UNESCAPED_UNICODE);
        exit;
    }

  /* ----------------- DELETE (SOFT) ----------------- */
if ($method === 'DELETE') {
    if (!isset($_GET['id'])) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'id required']); exit; }
    $id = (int)$_GET['id'];

    // hard delete NAHI — sirf status ko inactive
    $st = $pdo->prepare("UPDATE products SET status = 'inactive' WHERE id = :id");
    $st->execute([':id' => $id]);

    echo json_encode(['ok' => true, 'updated' => $st->rowCount()], JSON_UNESCAPED_UNICODE);
    exit;
}


    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method Not Allowed']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
