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
    
    // ✅ Handle _method override for FormData (POST requests with _method=PUT)
    // Check $_POST first (FormData), then check raw input for JSON
    $override = null;
    if (!empty($_POST['_method'])) {
        $override = strtoupper($_POST['_method']);
    } else {
        // For JSON body, check in request body
        $rawInput = file_get_contents('php://input');
        if ($rawInput) {
            $jsonData = json_decode($rawInput, true);
            if (is_array($jsonData) && isset($jsonData['_method'])) {
                $override = strtoupper($jsonData['_method']);
            }
        }
    }
    
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
            
            // ✅ Fetch product images from product_images table
            $imgSt = $pdo->prepare("SELECT image_url FROM product_images WHERE product_id = ? ORDER BY created_at DESC LIMIT 1");
            $imgSt->execute([$id]);
            $imgRow = $imgSt->fetch(PDO::FETCH_ASSOC);
            if ($row && $imgRow && !empty($imgRow['image_url'])) {
                $row['image'] = $imgRow['image_url'];
                $row['image_url'] = $imgRow['image_url']; // For compatibility
            }
            
            echo json_encode(['ok' => true, 'item' => $row ?: null], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // list with pagination + search
        $page  = isset($_GET['page'])  ? max(1, (int)$_GET['page'])  : 1;
        $limit = isset($_GET['limit']) ? max(1, min(200, (int)$_GET['limit'])) : 20;
        $offset = ($page - 1) * $limit;
        $q = isset($_GET['q']) ? trim($_GET['q']) : '';

        $where = '';
        $searchColumns = [
            'p.name',
            'p.sku',
            'p.description',
            'p.brand',
            'p.dimensions',
        ];

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
            SELECT p.*, COALESCE(c.name,'') AS category_name,
                   (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY created_at DESC LIMIT 1) as image
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
        
        // Add image_url field for compatibility
        foreach ($rows as &$row) {
            if (!empty($row['image'])) {
                $row['image_url'] = $row['image'];
            }
        }
        unset($row);

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

        // ✅ Handle bulk import
        if (isset($_GET['action']) && $_GET['action'] === 'bulk_import') {
            if (!isset($body['products']) || !is_array($body['products'])) {
                throw new Exception('products array is required for bulk import');
            }

            $products = $body['products'];
            $imported = 0;
            $errors = [];

            foreach ($products as $index => $productData) {
                try {
                    $name = isset($productData['name']) ? trim($productData['name']) : '';
                    if (empty($name)) {
                        $errors[] = "Row " . ($index + 1) . ": Name is required";
                        continue;
                    }

                    // Check for duplicate product (case-insensitive name matching)
                    $checkProduct = $pdo->prepare("SELECT id FROM products WHERE LOWER(TRIM(name)) = LOWER(TRIM(:name)) LIMIT 1");
                    $checkProduct->execute([':name' => $name]);
                    if ($checkProduct->fetch()) {
                        $errors[] = "Row " . ($index + 1) . ": Product '$name' already exists (duplicate)";
                        continue;
                    }

                    // Handle category - check if category_id is provided or category_name
                    $category_id = null;
                    if (isset($productData['category_id']) && $productData['category_id'] !== '' && $productData['category_id'] !== null) {
                        $category_id = (int)$productData['category_id'];
                    } elseif (isset($productData['category_name']) && !empty(trim($productData['category_name']))) {
                        // If category name is provided, find existing category (case-insensitive)
                        $categoryName = trim($productData['category_name']);
                        $checkCategory = $pdo->prepare("SELECT id FROM categories WHERE LOWER(TRIM(name)) = LOWER(TRIM(:name)) LIMIT 1");
                        $checkCategory->execute([':name' => $categoryName]);
                        $catRow = $checkCategory->fetch(PDO::FETCH_ASSOC);
                        if ($catRow) {
                            $category_id = (int)$catRow['id'];
                        }
                        // If category doesn't exist, it will remain null (category will be ignored)
                    }

                    $sku = isset($productData['sku']) ? trim($productData['sku']) : '';
                    $mrp = isset($productData['mrp']) ? ((float)$productData['mrp'] > 0 ? (float)$productData['mrp'] : null) : null;
                    $wholesale_rate = isset($productData['wholesale_rate']) ? ((float)$productData['wholesale_rate'] > 0 ? (float)$productData['wholesale_rate'] : null) : null;
                    $stock = isset($productData['stock']) ? max(0, (int)$productData['stock']) : 0;
                    $status = isset($productData['status']) ? trim($productData['status']) : 'active';
                    if (!in_array($status, ['active', 'inactive'])) $status = 'active';
                    $description = isset($productData['description']) ? trim($productData['description']) : '';
                    $brand = isset($productData['brand']) ? trim($productData['brand']) : '';
                    $dimensions = isset($productData['dimensions']) ? trim($productData['dimensions']) : '';
                    $currency = isset($productData['currency']) ? trim($productData['currency']) : 'INR';

                    $sql = "INSERT INTO products (name, sku, mrp, wholesale_rate, stock, status, description, brand, dimensions, currency, category_id)
                            VALUES (:name, :sku, :mrp, :wholesale_rate, :stock, :status, :description, :brand, :dimensions, :currency, :category_id)";
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
                    $st->execute();

                    $imported++;
                } catch (Exception $e) {
                    $errors[] = "Row " . ($index + 1) . ": " . $e->getMessage();
                }
            }

            echo json_encode([
                'ok' => true,
                'imported' => $imported,
                'total' => count($products),
                'errors' => $errors
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // ✅ Regular single product create
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
        $items_per_pack = isset($body['items_per_pack']) ? max(1, (int)$body['items_per_pack']) : 1;

        if ($name === '') throw new Exception('name is required');

        // Check for duplicate product (case-insensitive name matching)
        $checkProduct = $pdo->prepare("SELECT id FROM products WHERE LOWER(TRIM(name)) = LOWER(TRIM(:name)) LIMIT 1");
        $checkProduct->execute([':name' => $name]);
        if ($checkProduct->fetch()) {
            throw new Exception("Product with name '$name' already exists (duplicate)");
        }

        // ✅ Handle file upload
        $imagePath = null;
        if (!empty($_FILES['image']['tmp_name']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
            // File location: website/src/api/endpoints/products.php
            // Uploads folder: website/src/api/uploads/
            // Path: Go up 1 level from endpoints to api, then into uploads
            $apiRoot = dirname(__DIR__); // Goes from endpoints -> api
            $uploadDir = $apiRoot . '/uploads/';
            
            // Normalize path (remove any double slashes)
            $uploadDir = str_replace('//', '/', $uploadDir);
            
            // Create uploads directory if it doesn't exist (with proper permissions)
            if (!is_dir($uploadDir)) {
                if (!mkdir($uploadDir, 0777, true)) {
                    throw new Exception('Failed to create uploads directory. Please check folder permissions.');
                }
            }
            
            // Check if directory is writable
            if (!is_writable($uploadDir)) {
                // Try to make it writable
                @chmod($uploadDir, 0777);
                if (!is_writable($uploadDir)) {
                    throw new Exception('Uploads directory is not writable. Please set permissions to 777.');
                }
            }

            $file = $_FILES['image'];
            $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            $allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
            
            if (!in_array($ext, $allowedExts)) {
                throw new Exception('Invalid image format. Allowed: jpg, jpeg, png, gif, webp');
            }

            // Max file size: 5MB
            $maxSize = 5 * 1024 * 1024;
            if ($file['size'] > $maxSize) {
                throw new Exception('Image size too large. Maximum 5MB allowed');
            }

            // Generate unique filename (clean, no spaces)
            $filename = bin2hex(random_bytes(12)) . '_' . time() . '.' . $ext;
            $target = $uploadDir . $filename;

            if (move_uploaded_file($file['tmp_name'], $target)) {
                // Store relative path for database (api/uploads/filename.ext)
                $imagePath = "api/uploads/" . $filename;
            } else {
                $errorMsg = error_get_last();
                $error = $errorMsg ? $errorMsg['message'] : 'Unknown error';
                throw new Exception('Failed to upload image. Path: ' . $target . ' Error: ' . $error);
            }
        }

        // ✅ Insert product (WITHOUT image column)
        $sql = "INSERT INTO products (name, sku, mrp, wholesale_rate, stock, status, description, brand, dimensions, currency, category_id, items_per_pack)
                VALUES (:name, :sku, :mrp, :wholesale_rate, :stock, :status, :description, :brand, :dimensions, :currency, :category_id, :items_per_pack)";
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
        $st->bindValue(':items_per_pack', $items_per_pack);
        $st->execute();

        $productId = (int)$pdo->lastInsertId();
        
        // ✅ Save image to product_images table if image was uploaded
        if (!empty($imagePath) && $productId > 0) {
            try {
                // Insert image record into product_images table
                $imgSt = $pdo->prepare('INSERT INTO product_images (product_id, image_url, created_at) VALUES (?, ?, NOW())');
                $result = $imgSt->execute([$productId, $imagePath]);
                
                if (!$result) {
                    $errorInfo = $imgSt->errorInfo();
                    $errorMsg = $errorInfo[2] ?? 'Unknown error';
                    error_log("CRITICAL: Failed to save image to product_images table. Product ID: $productId, Image Path: $imagePath, PDO Error: " . print_r($errorInfo, true));
                    throw new Exception("Failed to save image record: $errorMsg");
                }
                
                // Verify the insert was successful by checking the database
                $checkSt = $pdo->prepare("SELECT id, image_url FROM product_images WHERE product_id = ? AND image_url = ? LIMIT 1");
                $checkSt->execute([$productId, $imagePath]);
                $insertedRow = $checkSt->fetch(PDO::FETCH_ASSOC);
                
                if ($insertedRow) {
                    error_log("SUCCESS: Image saved to product_images table. ID: {$insertedRow['id']}, Product ID: $productId, Image Path: $imagePath");
                } else {
                    error_log("WARNING: Image insertion verification failed. Product ID: $productId, Image Path: $imagePath");
                    // Try one more time
                    $imgSt2 = $pdo->prepare('INSERT INTO product_images (product_id, image_url, created_at) VALUES (?, ?, NOW())');
                    $imgSt2->execute([$productId, $imagePath]);
                }
            } catch (Exception $e) {
                error_log("ERROR: Failed to save image to product_images table: " . $e->getMessage());
                error_log("Stack trace: " . $e->getTraceAsString());
                // Don't throw - product is already created, just log the image error
            }
        }
        
        echo json_encode(['ok' => true, 'id' => $productId, 'image' => $imagePath], JSON_UNESCAPED_UNICODE);
        exit;
    }

    /* ----------------- UPDATE ----------------- */
    if ($method === 'PUT' || $method === 'PATCH') {
        if (!isset($_GET['id'])) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'id required']); exit; }
        $id = (int)$_GET['id'];
        
        // ✅ Handle FormData - when POST with _method=PUT is used, $_POST and $_FILES are available
        // Check if this is multipart/form-data request (FormData)
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        $isMultipart = strpos($contentType, 'multipart/form-data') !== false || !empty($_FILES);
        
        // For FormData (multipart), use $_POST and $_FILES
        // For JSON, use read_json_body()
        if ($isMultipart) {
            $body = $_POST ?: [];
        } else {
            $body = read_json_body();
        }

        // ✅ Handle image upload for update
        $imagePath = null;
        // Check $_FILES - it's available for POST requests (even with _method=PUT)
        $hasFile = !empty($_FILES['image']['tmp_name']) && isset($_FILES['image']['error']) && $_FILES['image']['error'] === UPLOAD_ERR_OK;
        
        if ($hasFile) {
            // Uploads folder: website/src/api/uploads/
            $apiRoot = dirname(__DIR__); // Goes from endpoints -> api
            $uploadDir = $apiRoot . '/uploads/';
            $uploadDir = str_replace('//', '/', $uploadDir);
            
            if (!is_dir($uploadDir)) {
                if (!mkdir($uploadDir, 0777, true)) {
                    http_response_code(500);
                    echo json_encode(['ok' => false, 'error' => 'Failed to create uploads directory']);
                    exit;
                }
            }
            
            if (!is_writable($uploadDir)) {
                @chmod($uploadDir, 0777);
                if (!is_writable($uploadDir)) {
                    http_response_code(500);
                    echo json_encode(['ok' => false, 'error' => 'Uploads directory is not writable']);
                    exit;
                }
            }

            $file = $_FILES['image'];
            $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            $allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
            
            if (!in_array($ext, $allowedExts)) {
                http_response_code(400);
                echo json_encode(['ok' => false, 'error' => 'Invalid image format']);
                exit;
            }
            
            $maxSize = 5 * 1024 * 1024;
            if ($file['size'] > $maxSize) {
                http_response_code(400);
                echo json_encode(['ok' => false, 'error' => 'Image size too large']);
                exit;
            }
            
            $filename = bin2hex(random_bytes(12)) . '_' . time() . '.' . $ext;
            $target = $uploadDir . $filename;
            
            if (move_uploaded_file($file['tmp_name'], $target)) {
                $imagePath = "api/uploads/" . $filename;
                
                // ✅ Delete old image files from server
                $oldSt = $pdo->prepare("SELECT image_url FROM product_images WHERE product_id = ?");
                $oldSt->execute([$id]);
                $oldImages = $oldSt->fetchAll(PDO::FETCH_ASSOC);
                foreach ($oldImages as $oldImg) {
                    if (!empty($oldImg['image_url'])) {
                        // Handle both old format (uploads/) and new format (api/uploads/)
                        $oldImagePath = '';
                        if (strpos($oldImg['image_url'], 'api/uploads/') === 0) {
                            $oldImagePath = dirname(__DIR__) . '/' . $oldImg['image_url'];
                        } else {
                            $websiteRoot = dirname(dirname(dirname(__DIR__)));
                            $oldImagePath = $websiteRoot . '/' . $oldImg['image_url'];
                        }
                        if (file_exists($oldImagePath)) {
                            @unlink($oldImagePath);
                        }
                    }
                }
            } else {
                http_response_code(500);
                echo json_encode(['ok' => false, 'error' => 'Failed to upload image']);
                exit;
            }
        }

        // allowed columns (image NOT in products table, it's in product_images table)
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
            'items_per_pack' => 'int',
        ];

        $sets = [];
        $params = [':id' => $id];

        foreach ($allowed as $key => $type) {
            if (!array_key_exists($key, $body)) continue;
            
            $param = ':' . $key;
            $sets[] = "$key = $param";

            $val = $body[$key];
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

        // ✅ Update product_images table if new image uploaded
        if (!empty($imagePath)) {
            try {
                // Delete old records from product_images table
                $delSt = $pdo->prepare("DELETE FROM product_images WHERE product_id = ?");
                $delSt->execute([$id]);
                
                // Insert new image record
                $imgSt = $pdo->prepare('INSERT INTO product_images (product_id, image_url, created_at) VALUES (?, ?, NOW())');
                $imgResult = $imgSt->execute([$id, $imagePath]);
                
                if (!$imgResult) {
                    $errorInfo = $imgSt->errorInfo();
                    $errorMsg = $errorInfo[2] ?? 'Unknown error';
                    error_log("CRITICAL: Failed to save image to product_images table. Product ID: $id, Image Path: $imagePath, PDO Error: " . print_r($errorInfo, true));
                    throw new Exception("Failed to save image record: $errorMsg");
                }
                
                // Verify the insert was successful by checking the database
                $checkSt = $pdo->prepare("SELECT id, image_url FROM product_images WHERE product_id = ? AND image_url = ? LIMIT 1");
                $checkSt->execute([$id, $imagePath]);
                $insertedRow = $checkSt->fetch(PDO::FETCH_ASSOC);
                
                if ($insertedRow) {
                    error_log("SUCCESS: Image saved to product_images table. ID: {$insertedRow['id']}, Product ID: $id, Image Path: $imagePath");
                } else {
                    error_log("WARNING: Image insertion verification failed. Product ID: $id, Image Path: $imagePath");
                    // Try one more time
                    $imgSt2 = $pdo->prepare('INSERT INTO product_images (product_id, image_url, created_at) VALUES (?, ?, NOW())');
                    $imgSt2->execute([$id, $imagePath]);
                }
            } catch (Exception $e) {
                error_log("ERROR: Failed to save image to product_images table: " . $e->getMessage());
                error_log("Stack trace: " . $e->getTraceAsString());
                // Don't fail the update completely, but log the error
            }
        }

        if (empty($sets) && $imagePath === null) { 
            echo json_encode(['ok'=>true,'updated'=>0]); 
            exit; 
        }

        // Update products table if there are changes
        $updatedRows = 0;
        if (!empty($sets)) {
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
            $updatedRows = $st->rowCount();
        }

        echo json_encode(['ok' => true, 'updated' => $updatedRows > 0 ? $updatedRows : ($imagePath ? 1 : 0)], JSON_UNESCAPED_UNICODE);
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
