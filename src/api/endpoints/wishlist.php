<?php
// api/endpoints/wishlist.php
require_once __DIR__ . '/../common.php';
require_once __DIR__ . '/../db.php';
require_api_key();

function pdo_conn() {
  if (function_exists('db')) return db();
  throw new Exception('No DB connection function');
}

function read_json_body() {
  $raw = file_get_contents('php://input');
  $d = json_decode($raw, true);
  return is_array($d) ? $d : [];
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
  $pdo = pdo_conn();

  // Get customer_id and session_id
  $customerId = null;
  $sessionId = null;
  
  if (isset($_GET['customer_id']) && $_GET['customer_id'] !== '' && $_GET['customer_id'] !== 'null') {
    $customerId = (int)$_GET['customer_id'];
  }
  if (isset($_GET['session_id']) && $_GET['session_id'] !== '' && $_GET['session_id'] !== 'null') {
    $sessionId = trim($_GET['session_id']);
  }
  
  // Also check POST/PUT body
  $body = read_json_body();
  if (isset($body['customer_id']) && $body['customer_id'] !== '' && $body['customer_id'] !== 'null') {
    $customerId = (int)$body['customer_id'];
  }
  if (isset($body['session_id']) && $body['session_id'] !== '' && $body['session_id'] !== 'null') {
    $sessionId = trim($body['session_id']);
  }

  /* ---------------- GET (list wishlist items) ---------------- */
  if ($method === 'GET') {
    // If no customer_id or session_id, return empty list instead of error
    if (!$customerId && !$sessionId) {
      echo json_encode(['ok' => true, 'items' => []], JSON_UNESCAPED_UNICODE);
      exit;
    }

    $sql = "
      SELECT w.*, 
             p.id as product_id,
             p.name as product_name,
             p.description,
             p.wholesale_rate as price,
             p.mrp as old_price,
             COALESCE((SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY created_at DESC LIMIT 1), '') as image,
             p.stock,
             p.status as product_status,
             c.name as category_name
      FROM wishlist w
      LEFT JOIN products p ON p.id = w.product_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE 1=1
    ";
    $params = [];

    if ($customerId) {
      $sql .= " AND w.customer_id = :customer_id";
      $params[':customer_id'] = $customerId;
    } else {
      $sql .= " AND w.session_id = :session_id";
      $params[':session_id'] = $sessionId;
    }

    $sql .= " ORDER BY w.created_at DESC";

    try {
      $st = $pdo->prepare($sql);
      $st->execute($params);
      $rows = $st->fetchAll(PDO::FETCH_ASSOC);
    } catch (PDOException $e) {
      // Log error and return empty instead of crashing
      error_log("Wishlist GET error: " . $e->getMessage());
      echo json_encode(['ok' => true, 'items' => [], 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
      exit;
    }

    $items = [];
    foreach ($rows as $row) {
      // Skip if product_id is null (product might be deleted)
      if (empty($row['product_id'])) {
        continue;
      }
      
      $imageUrl = '';
      if (!empty($row['image'])) {
        $imageUrl = $row['image'];
        // Check if URL starts with http (PHP 7.x compatible)
        if (strpos($imageUrl, 'http') !== 0) {
          // LOCAL DEVELOPMENT - Use Mac IP for phone testing
          $imageUrl = 'http://192.168.1.6:8000/' . ltrim($imageUrl, '/');
          // PRODUCTION SERVER
          // $imageUrl = 'https://shreeram.webbiezinfotech.in/' . ltrim($imageUrl, '/');
          // For Mac browser testing, you can also use: 'http://localhost:8000/' . ltrim($imageUrl, '/')
        }
      }

      $items[] = [
        'id' => (int)$row['id'],
        'product_id' => (int)$row['product_id'],
        'product_name' => $row['product_name'] ?? 'Product Name',
        'description' => $row['description'] ?? '',
        'price' => (float)($row['price'] ?? 0),
        'old_price' => !empty($row['old_price']) ? (float)$row['old_price'] : null,
        'image' => $imageUrl,
        'stock' => (int)($row['stock'] ?? 0),
        'category_name' => $row['category_name'] ?? '',
        'created_at' => $row['created_at'] ?? ''
      ];
    }

    echo json_encode(['ok' => true, 'items' => $items, 'debug' => [
      'customer_id' => $customerId,
      'session_id' => $sessionId ? substr($sessionId, 0, 20) . '...' : null,
      'row_count' => count($rows),
      'item_count' => count($items)
    ]], JSON_UNESCAPED_UNICODE);
    exit;
  }

  /* ---------------- POST (add to wishlist) ---------------- */
  if ($method === 'POST') {
    $b = $_POST ?: read_json_body();

    $productId = isset($b['product_id']) ? (int)$b['product_id'] : 0;
    
    if (!$productId) {
      http_response_code(400);
      echo json_encode(['ok' => false, 'error' => 'product_id required'], JSON_UNESCAPED_UNICODE);
      exit;
    }

    if (!$customerId && !$sessionId) {
      http_response_code(400);
      echo json_encode(['ok' => false, 'error' => 'customer_id or session_id required'], JSON_UNESCAPED_UNICODE);
      exit;
    }

    // Check if already in wishlist
    try {
      $checkSql = "SELECT id FROM wishlist WHERE product_id = :product_id";
      $checkParams = [':product_id' => $productId];
      
      if ($customerId) {
        $checkSql .= " AND customer_id = :customer_id";
        $checkParams[':customer_id'] = $customerId;
      } else {
        $checkSql .= " AND session_id = :session_id";
        $checkParams[':session_id'] = $sessionId;
      }
      
      $checkSt = $pdo->prepare($checkSql);
      $checkSt->execute($checkParams);
      
      if ($checkSt->fetch()) {
        echo json_encode(['ok' => true, 'message' => 'Already in wishlist', 'id' => null], JSON_UNESCAPED_UNICODE);
        exit;
      }

      // Insert into wishlist
      $st = $pdo->prepare("
        INSERT INTO wishlist (customer_id, session_id, product_id, created_at)
        VALUES (:customer_id, :session_id, :product_id, NOW())
      ");
      $st->execute([
        ':customer_id' => $customerId,
        ':session_id' => $sessionId,
        ':product_id' => $productId
      ]);
      $id = (int)$pdo->lastInsertId();
    } catch (PDOException $e) {
      http_response_code(500);
      echo json_encode(['ok' => false, 'error' => 'Database error: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
      exit;
    }

    echo json_encode(['ok' => true, 'id' => $id, 'message' => 'Added to wishlist'], JSON_UNESCAPED_UNICODE);
    exit;
  }

  /* ---------------- DELETE (remove from wishlist) ---------------- */
  if ($method === 'DELETE') {
    if (!isset($_GET['id']) && !isset($_GET['product_id'])) {
      http_response_code(400);
      echo json_encode(['ok' => false, 'error' => 'id or product_id required'], JSON_UNESCAPED_UNICODE);
      exit;
    }

    $wishlistId = isset($_GET['id']) ? (int)$_GET['id'] : null;
    $productId = isset($_GET['product_id']) ? (int)$_GET['product_id'] : null;

    $sql = "DELETE FROM wishlist WHERE ";
    $params = [];

    if ($wishlistId) {
      $sql .= "id = :id";
      $params[':id'] = $wishlistId;
    } else {
      $sql .= "product_id = :product_id";
      $params[':product_id'] = $productId;
      
      if ($customerId) {
        $sql .= " AND customer_id = :customer_id";
        $params[':customer_id'] = $customerId;
      } else if ($sessionId) {
        $sql .= " AND session_id = :session_id";
        $params[':session_id'] = $sessionId;
      }
    }

    try {
      $st = $pdo->prepare($sql);
      $st->execute($params);

      if ($st->rowCount() > 0) {
        echo json_encode(['ok' => true, 'deleted' => $st->rowCount()], JSON_UNESCAPED_UNICODE);
      } else {
        http_response_code(404);
        echo json_encode(['ok' => false, 'error' => 'Item not found in wishlist'], JSON_UNESCAPED_UNICODE);
      }
    } catch (PDOException $e) {
      http_response_code(500);
      echo json_encode(['ok' => false, 'error' => 'Database error: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
    exit;
  }

  http_response_code(405);
  echo json_encode(['ok' => false, 'error' => 'Method Not Allowed'], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}

