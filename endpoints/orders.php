<?php
// api-folder/endpoints/orders.php
require_once __DIR__ . '/../common.php';
require_once __DIR__ . '/../db.php';
require_api_key();

/* ---------- helpers ---------- */
function pdo_conn() {
  if (function_exists('db'))      return db();
  if (function_exists('get_pdo')) return db();   // <-- FIX
  throw new Exception('No DB connection function');
}
function read_json_body() {
  $raw = file_get_contents('php://input');
  error_log("Raw JSON body: " . $raw);
  $d = json_decode($raw, true);
  if (json_last_error() !== JSON_ERROR_NONE) {
    error_log("JSON decode error: " . json_last_error_msg());
  }
  return is_array($d) ? $d : [];
}

/* ---------- method detection (supports override) ---------- */
$method = $_SERVER['REQUEST_METHOD'];
if (!empty($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'])) {
  $method = strtoupper($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE']);
}
if (!empty($_POST['_method'])) {
  $method = strtoupper($_POST['_method']);
}

try {
  $pdo = pdo_conn();

  /* ---------------- GET (list or single with items) ---------------- */
  if ($method === 'GET') {

    // single: /orders.php?id=1  -> { item, items[] }
    if (isset($_GET['id'])) {
      $id = (int)$_GET['id'];

      $st = $pdo->prepare("
        SELECT o.*, COALESCE(c.name,'') AS customer_name, COALESCE(c.firm,'') AS customer_firm
        FROM orders o
        LEFT JOIN customers c ON c.id = o.customer_id
        WHERE o.id = :id
        LIMIT 1
      ");
      $st->execute([':id'=>$id]);
      $order = $st->fetch(PDO::FETCH_ASSOC) ?: null;

      $it = $pdo->prepare("
        SELECT 
          i.id,
          i.order_id,
          i.product_id,
          i.category_id,
          i.quantity,
          i.price,
          i.created_at,
          p.name AS product_name,  -- Get from products table via FK
          p.sku,
          p.mrp,
          p.wholesale_rate,
          COALESCE(i.subtotal, (i.price * i.quantity), 0) AS subtotal,
          c.name AS category_name  -- Get category name if needed
        FROM order_items i
        LEFT JOIN products p ON p.id = i.product_id
        LEFT JOIN categories c ON c.id = i.category_id
        WHERE i.order_id = :id
        ORDER BY i.id ASC
      ");
      $it->execute([':id'=>$id]);
      $items = $it->fetchAll(PDO::FETCH_ASSOC);

      echo json_encode(['ok'=>true, 'item'=>$order, 'items'=>$items], JSON_UNESCAPED_UNICODE);
      exit;
    }

    // list with pagination + optional filters
    $page  = isset($_GET['page'])  ? max(1,(int)$_GET['page']) : 1;
    $limit = isset($_GET['limit']) ? max(1,min(200,(int)$_GET['limit'])) : 20;
    $offset = ($page-1)*$limit;

    $where = [];
    $params = [];

    // filter by status (e.g. confirmed/processing/shipped/delivered/pending/cancelled/proceed)
    if (!empty($_GET['status'])) {
      $where[] = "o.status = :status";
      $params[':status'] = $_GET['status'];
    }

    // search
    if (!empty($_GET['q'])) {
      $where[] = "(COALESCE(c.name,'') LIKE :q OR COALESCE(o.address,'') LIKE :q OR CAST(o.id AS CHAR) LIKE :q)";
      $params[':q'] = '%'.$_GET['q'].'%';
    }

    $whereSql = $where ? ('WHERE '.implode(' AND ', $where)) : '';

    // total
    $stTotal = $pdo->prepare("SELECT COUNT(*) FROM orders o LEFT JOIN customers c ON c.id = o.customer_id $whereSql");
    $stTotal->execute($params);
    $total = (int)$stTotal->fetchColumn();

    // rows with items count - using subquery for better performance
    $sql = "
      SELECT o.*, 
        COALESCE(c.name,'') AS customer_name, 
        COALESCE(c.firm,'') AS customer_firm,
        COALESCE((SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id), 0) AS items_count
      FROM orders o
      LEFT JOIN customers c ON c.id = o.customer_id
      $whereSql
      ORDER BY o.id DESC
      LIMIT $limit OFFSET $offset
    ";
    $st = $pdo->prepare($sql);
    $st->execute($params);
    $rows = $st->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['ok'=>true,'page'=>$page,'limit'=>$limit,'total'=>$total,'items'=>$rows], JSON_UNESCAPED_UNICODE);
    exit;
  }

  /* ---------------- POST (create simple order) ---------------- */
  if ($method === 'POST') {
    // Get request body - try multiple methods
    $rawInput = file_get_contents('php://input');
    error_log("=== ORDER CREATE REQUEST ===");
    error_log("Raw input: " . substr($rawInput, 0, 500));
    
    $b = $_POST;
    if (empty($b) || !isset($b['items'])) {
      $jsonBody = json_decode($rawInput, true);
      if (is_array($jsonBody)) {
        $b = $jsonBody;
        error_log("Using JSON body");
      } else {
        error_log("JSON decode failed, trying read_json_body()");
        $b = read_json_body();
      }
    } else {
      error_log("Using POST data");
    }
    
    // Debug: Log entire request body
    error_log("Request body: " . json_encode($b));
    error_log("Items in request: " . (isset($b['items']) ? "YES - " . count($b['items']) : "NO"));
    error_log("Items data: " . (isset($b['items']) ? json_encode($b['items']) : "NOT SET"));

    $customer_id  = isset($b['customer_id']) ? (int)$b['customer_id'] : 0;
    $total_amount = isset($b['total_amount']) ? (float)$b['total_amount'] : 0.0;
    $currency     = !empty($b['currency']) ? $b['currency'] : 'INR';
    $payment      = !empty($b['payment'])  ? $b['payment']  : 'pending';   // paid|pending|failed
    $status       = !empty($b['status'])   ? $b['status']   : 'pending';   // <-- default aligned with UI
    $address      = isset($b['address']) ? trim($b['address']) : null;
    $order_date   = isset($b['order_date']) ? trim($b['order_date']) : null;
    $delivery_date = isset($b['delivery_date']) ? trim($b['delivery_date']) : null;
    
    // Validate status values
    $valid_statuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'proceed'];
    if (!in_array($status, $valid_statuses)) {
      $status = 'pending';
    }

    if ($customer_id <= 0) {
      http_response_code(400);
      echo json_encode(['ok'=>false,'error'=>'customer_id required']); exit;
    }

    // Get customer name from customers table
    $customer_name = '';
    if ($customer_id > 0) {
      $custSt = $pdo->prepare("SELECT name FROM customers WHERE id = :id LIMIT 1");
      $custSt->execute([':id' => $customer_id]);
      $customer = $custSt->fetch(PDO::FETCH_ASSOC);
      $customer_name = $customer ? $customer['name'] : '';
    }

    // Check if status column exists, if not use default
    $checkStatusCol = $pdo->query("SHOW COLUMNS FROM orders LIKE 'status'");
    $hasStatus = $checkStatusCol->rowCount() > 0;
    
    if ($hasStatus) {
      $st = $pdo->prepare("
        INSERT INTO orders (customer_id, customer_name, total_amount, currency, payment, status, address, order_date, delivery_date, created_at)
        VALUES (:c,:cn,:t,:cur,:pay,:status,:addr,:od,:dd,NOW())
      ");
    } else {
      $st = $pdo->prepare("
        INSERT INTO orders (customer_id, customer_name, total_amount, currency, payment, address, order_date, delivery_date, created_at)
        VALUES (:c,:cn,:t,:cur,:pay,:addr,:od,:dd,NOW())
      ");
    }
    if ($hasStatus) {
      $st->execute([
        ':c'=>$customer_id, ':cn'=>$customer_name, ':t'=>$total_amount, ':cur'=>$currency,
        ':pay'=>$payment, ':status'=>$status, ':addr'=>$address, ':od'=>$order_date, ':dd'=>$delivery_date
      ]);
    } else {
      $st->execute([
        ':c'=>$customer_id, ':cn'=>$customer_name, ':t'=>$total_amount, ':cur'=>$currency,
        ':pay'=>$payment, ':addr'=>$address, ':od'=>$order_date, ':dd'=>$delivery_date
      ]);
    }
    $id = (int)$pdo->lastInsertId();

    // Insert order items - ALWAYS try to insert if items exist
    $itemsSaved = 0;
    error_log("=== STARTING ORDER ITEMS INSERT ===");
    error_log("Order ID: $id");
    error_log("Checking for items...");
    
    // Check multiple ways items might be sent
    $items = null;
    if (isset($b['items']) && is_array($b['items'])) {
      $items = $b['items'];
      error_log("Found items in b['items']: " . count($items));
    } elseif (isset($_POST['items'])) {
      $items = json_decode($_POST['items'], true);
      error_log("Found items in POST: " . (is_array($items) ? count($items) : 0));
    }
    
    if ($items && is_array($items) && count($items) > 0) {
      error_log("Processing " . count($items) . " items");
      
      foreach ($items as $idx => $item) {
        $product_id = isset($item['product_id']) ? (int)$item['product_id'] : 0;
        $category_id = isset($item['category_id']) ? (int)$item['category_id'] : null;
        $quantity = isset($item['quantity']) ? (int)$item['quantity'] : 1;
        $price = isset($item['price']) ? (float)$item['price'] : 0.0;
        
        error_log("Item $idx: product_id=$product_id, category_id=$category_id, quantity=$quantity, price=$price");
        
        // Insert REGARDLESS - let database handle validation
        if ($product_id > 0) {  // Only check product_id, price can be 0
          $inserted = false;
          
          // Method 1: With category_id (can be NULL)
          try {
            $sql1 = "INSERT INTO order_items (order_id, product_id, category_id, quantity, price, created_at) VALUES (?, ?, ?, ?, ?, NOW())";
            $stmt1 = $pdo->prepare($sql1);
            $result1 = $stmt1->execute([$id, $product_id, $category_id, $quantity, $price]);
            
            if ($result1 && $stmt1->rowCount() > 0) {
              $itemsSaved++;
              $inserted = true;
              error_log("✅ INSERTED with category_id: order_id=$id, product_id=$product_id, qty=$quantity, price=$price");
            } else {
              error_log("⚠️ Execute returned true but rowCount=0 for item $idx");
            }
          } catch (PDOException $e1) {
            error_log("Method 1 PDOException: " . $e1->getMessage());
            error_log("Error Code: " . $e1->getCode());
            
            // Method 2: Without category_id
            try {
              $sql2 = "INSERT INTO order_items (order_id, product_id, quantity, price, created_at) VALUES (?, ?, ?, ?, NOW())";
              $stmt2 = $pdo->prepare($sql2);
              $result2 = $stmt2->execute([$id, $product_id, $quantity, $price]);
              
              if ($result2 && $stmt2->rowCount() > 0) {
                $itemsSaved++;
                $inserted = true;
                error_log("✅ INSERTED without category_id: order_id=$id, product_id=$product_id");
              } else {
                error_log("⚠️ Method 2 execute returned true but rowCount=0");
              }
            } catch (PDOException $e2) {
              error_log("❌ Method 2 also failed: " . $e2->getMessage() . " Code: " . $e2->getCode());
              error_log("SQL State: " . $e2->errorInfo[0] ?? 'unknown');
            }
          } catch (Exception $e) {
            error_log("❌ General Exception: " . $e->getMessage());
          }
          
          if (!$inserted) {
            error_log("❌ FAILED to insert item: product_id=$product_id, order_id=$id, price=$price, qty=$quantity");
          }
        } else {
          error_log("⚠️ Skipping - product_id is 0 or invalid");
        }
      }
    } else {
      error_log("❌ NO ITEMS FOUND in request");
      error_log("b['items'] exists: " . (isset($b['items']) ? 'YES' : 'NO'));
      error_log("b['items'] is array: " . (is_array($b['items'] ?? null) ? 'YES' : 'NO'));
      error_log("b['items'] count: " . (isset($b['items']) && is_array($b['items']) ? count($b['items']) : 0));
    }
    
    error_log("=== ORDER ITEMS INSERT COMPLETE: $itemsSaved items saved ===");

    // Return success with order id and items saved count
    echo json_encode([
      'ok'=>true,
      'id'=>$id,
      'items_saved'=>$itemsSaved,
      'message'=>'Order created successfully'
    ], JSON_UNESCAPED_UNICODE);
    exit;
  }

  /* ---------------- PUT/PATCH (update) ---------------- */
  if ($method === 'PUT' || $method === 'PATCH') {
    if (!isset($_GET['id'])) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'id required']); exit; }
    $id = (int)$_GET['id'];
    $b = read_json_body();

    // normalize + build update list
    $sets = [];
    $params = [':id'=>$id];

    if (array_key_exists('payment', $b)) {
      $sets[] = "payment = :payment";
      $params[':payment'] = $b['payment']; // paid | pending | failed
    }
    if (array_key_exists('status', $b)) {
      $val = strtolower($b['status']);
      if ($val === 'paid' || $val === 'pending' || $val === 'failed') {
        $sets[] = "payment = :payment_norm";
        $params[':payment_norm'] = $val;
      } else {
        $sets[] = "status = :status";
        $params[':status'] = $b['status']; // confirmed/processing/shipped/delivered/pending/cancelled/proceed
      }
    }
    foreach (['total_amount','currency','address','order_date','delivery_date'] as $f) {
      if (array_key_exists($f, $b)) {
        $sets[] = "$f = :$f";
        $params[":$f"] = $b[$f];
      }
    }

    // touch updated_at
    $sets[] = "updated_at = NOW()";

    if (empty($sets)) { echo json_encode(['ok'=>true,'updated'=>0]); exit; }

    $sql = "UPDATE orders SET ".implode(', ', $sets)." WHERE id = :id";
    $st = $pdo->prepare($sql);
    $st->execute($params);

    echo json_encode(['ok'=>true,'updated'=>$st->rowCount()], JSON_UNESCAPED_UNICODE);
    exit;
  }

  /* ---------------- DELETE (soft cancel) ---------------- */
  if ($method === 'DELETE') {
    if (!isset($_GET['id'])) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'id required']); exit; }
    $id = (int)$_GET['id'];
    $st = $pdo->prepare("UPDATE orders SET updated_at = NOW() WHERE id = :id");
    $st->execute([':id'=>$id]);
    echo json_encode(['ok'=>true,'updated'=>$st->rowCount()], JSON_UNESCAPED_UNICODE);
    exit;
  }

  http_response_code(405);
  echo json_encode(['ok'=>false,'error'=>'Method Not Allowed']);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['ok'=>false,'error'=>$e->getMessage()]);
}
