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
  $d = json_decode($raw, true);
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
        SELECT i.*, p.name AS product_name, p.sku
        FROM order_items i
        LEFT JOIN products p ON p.id = i.product_id
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

    // rows with items count
    $sql = "
      SELECT o.*, 
             COALESCE(c.name,'') AS customer_name, 
             COALESCE(c.firm,'') AS customer_firm,
             (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) AS items_count
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

  /* ---------------- POST (create order with items) ---------------- */
  if ($method === 'POST') {
    $b = $_POST ?: read_json_body();

    $customer_id  = isset($b['customer_id']) ? (int)$b['customer_id'] : 0;
    $total_amount = isset($b['total_amount']) ? (float)$b['total_amount'] : 0.0;
    $currency     = !empty($b['currency']) ? $b['currency'] : 'INR';
    $payment      = !empty($b['payment'])  ? $b['payment']  : 'pending';   // paid|pending|failed
    $status       = !empty($b['status'])   ? $b['status']   : 'pending';   // <-- default aligned with UI
    $address      = isset($b['address']) && !empty(trim($b['address'])) ? trim($b['address']) : 'To be confirmed - Admin will contact customer';
    $order_date   = isset($b['order_date']) && !empty(trim($b['order_date'])) ? trim($b['order_date']) : date('Y-m-d');
    // Delivery date: if provided use it, otherwise set to 3 days from order date
    $delivery_date = null;
    if (isset($b['delivery_date']) && !empty(trim($b['delivery_date']))) {
      $delivery_date = trim($b['delivery_date']);
    } else if ($order_date) {
      $deliveryDateObj = new DateTime($order_date);
      $deliveryDateObj->modify('+3 days');
      $delivery_date = $deliveryDateObj->format('Y-m-d');
    } else {
      $deliveryDateObj = new DateTime();
      $deliveryDateObj->modify('+3 days');
      $delivery_date = $deliveryDateObj->format('Y-m-d');
    }
    $items        = isset($b['items']) && is_array($b['items']) ? $b['items'] : [];
    
    // Validate status values
    $valid_statuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'proceed'];
    if (!in_array($status, $valid_statuses)) {
      $status = 'pending';
    }

    if ($customer_id <= 0) {
      http_response_code(400);
      echo json_encode(['ok'=>false,'error'=>'customer_id required']); exit;
    }

    // Get customer name and address from customers table
    $customer_name = '';
    $customer_address = '';
    if ($customer_id > 0) {
      $custSt = $pdo->prepare("SELECT name, address FROM customers WHERE id = :id LIMIT 1");
      $custSt->execute([':id' => $customer_id]);
      $customer = $custSt->fetch(PDO::FETCH_ASSOC);
      if ($customer) {
        $customer_name = $customer['name'] ?? '';
        $customer_address = $customer['address'] ?? '';
      }
    }
    
    // Use customer address if address not provided or is null
    if (empty($address) || $address === null || $address === 'To be confirmed - Admin will contact customer') {
      $address = !empty($customer_address) ? $customer_address : 'To be confirmed - Admin will contact customer';
    }

    $itemsSaved = 0;

    try {
      $pdo->beginTransaction();

      // Insert order
      $st = $pdo->prepare("
        INSERT INTO orders (customer_id, customer_name, total_amount, currency, payment, status, address, order_date, delivery_date, created_at)
        VALUES (:c,:cn,:t,:cur,:pay,:status,:addr,:od,:dd,NOW())
      ");
      $st->execute([
        ':c'=>$customer_id, 
        ':cn'=>$customer_name, 
        ':t'=>$total_amount, 
        ':cur'=>$currency,
        ':pay'=>$payment,
        ':status'=>$status,
        ':addr'=>$address, 
        ':od'=>$order_date, 
        ':dd'=>$delivery_date
      ]);
      $id = (int)$pdo->lastInsertId();

      // Insert order items if provided
      if (!empty($items) && $id > 0) {
        // Get category_id from product if not provided
        $getProductCat = $pdo->prepare("SELECT category_id FROM products WHERE id = :pid LIMIT 1");
        
        $ins1 = $pdo->prepare("INSERT INTO order_items (order_id, product_id, category_id, quantity, price) VALUES (:order_id, :product_id, :category_id, :quantity, :price)");
        $ins2 = $pdo->prepare("INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (:order_id, :product_id, :quantity, :price)");

        foreach ($items as $item) {
          $product_id = isset($item['product_id']) ? (int)$item['product_id'] : 0;
          if ($product_id <= 0) continue;
          
          // Get category_id from product if not provided in item
          $category_id = null;
          if (isset($item['category_id']) && $item['category_id'] !== '' && $item['category_id'] !== null && $item['category_id'] !== 0) {
            $category_id = (int)$item['category_id'];
          } else {
            // Fetch category_id from product
            $getProductCat->execute([':pid' => $product_id]);
            $product = $getProductCat->fetch(PDO::FETCH_ASSOC);
            if ($product && isset($product['category_id']) && $product['category_id']) {
              $category_id = (int)$product['category_id'];
            }
          }
          
          $quantity = isset($item['quantity']) ? max(1, (int)$item['quantity']) : 1;
          $price = isset($item['price']) ? (float)$item['price'] : 0.0;

          if ($category_id !== null && $category_id > 0) {
            $ins1->execute([
              ':order_id' => $id,
              ':product_id' => $product_id,
              ':category_id' => $category_id,
              ':quantity' => $quantity,
              ':price' => $price,
            ]);
            $itemsSaved += $ins1->rowCount();
          } else {
            $ins2->execute([
              ':order_id' => $id,
              ':product_id' => $product_id,
              ':quantity' => $quantity,
              ':price' => $price,
            ]);
            $itemsSaved += $ins2->rowCount();
          }
        }
      }

      $pdo->commit();
    } catch (Throwable $tx) {
      $pdo->rollBack();
      http_response_code(500);
      echo json_encode(['ok'=>false,'error'=>'Failed to create order: '.$tx->getMessage()]); 
      exit;
    }

    echo json_encode(['ok'=>true,'id'=>$id,'items_saved'=>$itemsSaved], JSON_UNESCAPED_UNICODE);
    exit;
  }

  /* ---------------- PUT/PATCH (update) ---------------- */
  if ($method === 'PUT' || $method === 'PATCH') {
    if (!isset($_GET['id'])) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'id required']); exit; }
    $id = (int)$_GET['id'];
    $b = read_json_body();

    $items = isset($b['items']) && is_array($b['items']) ? $b['items'] : null;
    unset($b['items']);

    // normalize + build update list
    $sets = [];
    $params = [':id'=>$id];

    if (array_key_exists('payment', $b)) {
      $sets[] = "payment = :payment";
      $params[':payment'] = $b['payment']; // paid | pending | failed
    }
    // Track if status is being changed to confirmed
    $statusChangedToConfirmed = false;
    $oldStatus = null;
    
    if (array_key_exists('status', $b)) {
      // Get old status before updating
      $oldStatusStmt = $pdo->prepare("SELECT status FROM orders WHERE id = :id LIMIT 1");
      $oldStatusStmt->execute([':id' => $id]);
      $oldOrder = $oldStatusStmt->fetch(PDO::FETCH_ASSOC);
      $oldStatus = $oldOrder ? $oldOrder['status'] : null;
      
      $val = strtolower($b['status']);
      if ($val === 'paid' || $val === 'pending' || $val === 'failed') {
        $sets[] = "payment = :payment_norm";
        $params[':payment_norm'] = $val;
      } else {
        $sets[] = "status = :status";
        $params[':status'] = $b['status']; // confirmed/processing/shipped/delivered/pending/cancelled/proceed
        
        // Check if status is being changed to 'confirmed' from another status
        if (strtolower($b['status']) === 'confirmed' && $oldStatus !== 'confirmed') {
          $statusChangedToConfirmed = true;
        }
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

    $itemsSaved = 0;

    try {
      $pdo->beginTransaction();

      $sql = "UPDATE orders SET ".implode(', ', $sets)." WHERE id = :id";
      $st = $pdo->prepare($sql);
      $st->execute($params);

      // If status changed to confirmed, deduct stock from products
      if ($statusChangedToConfirmed) {
        // Get all order items
        $itemsStmt = $pdo->prepare("SELECT product_id, quantity FROM order_items WHERE order_id = :order_id");
        $itemsStmt->execute([':order_id' => $id]);
        $orderItems = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Deduct stock for each item
        $updateStockStmt = $pdo->prepare("UPDATE products SET stock = GREATEST(0, stock - :quantity) WHERE id = :product_id");
        foreach ($orderItems as $orderItem) {
          $productId = (int)$orderItem['product_id'];
          $quantity = (int)$orderItem['quantity'];
          if ($productId > 0 && $quantity > 0) {
            $updateStockStmt->execute([
              ':product_id' => $productId,
              ':quantity' => $quantity
            ]);
          }
        }
      }

      if ($items !== null) {
        $del = $pdo->prepare("DELETE FROM order_items WHERE order_id = :id");
        $del->execute([':id' => $id]);

        $ins1 = $pdo->prepare("INSERT INTO order_items (order_id, product_id, category_id, quantity, price) VALUES (:order_id, :product_id, :category_id, :quantity, :price)");
        $ins2 = $pdo->prepare("INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (:order_id, :product_id, :quantity, :price)");

        foreach ($items as $item) {
          $product_id = isset($item['product_id']) ? (int)$item['product_id'] : 0;
          if ($product_id <= 0) continue;
          $category_id = isset($item['category_id']) && $item['category_id'] !== '' ? (int)$item['category_id'] : null;
          $quantity = isset($item['quantity']) ? max(1, (int)$item['quantity']) : 1;
          $price = isset($item['price']) ? (float)$item['price'] : 0.0;

          if ($category_id !== null) {
            $ins1->execute([
              ':order_id' => $id,
              ':product_id' => $product_id,
              ':category_id' => $category_id,
              ':quantity' => $quantity,
              ':price' => $price,
            ]);
            $itemsSaved += $ins1->rowCount();
          } else {
            $ins2->execute([
              ':order_id' => $id,
              ':product_id' => $product_id,
              ':quantity' => $quantity,
              ':price' => $price,
            ]);
            $itemsSaved += $ins2->rowCount();
          }
        }
      }

      $pdo->commit();
    } catch (Throwable $tx) {
      $pdo->rollBack();
      throw $tx;
    }

    echo json_encode(['ok'=>true,'updated'=>$st->rowCount(),'items_saved'=>$itemsSaved], JSON_UNESCAPED_UNICODE);
    exit;
  }

  /* ---------------- DELETE (soft cancel - set status to cancelled) ---------------- */
  if ($method === 'DELETE') {
    if (!isset($_GET['id'])) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'id required']); exit; }
    $id = (int)$_GET['id'];
    
    // Update order status to 'cancelled' instead of deleting
    $st = $pdo->prepare("UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = :id");
    $st->execute([':id'=>$id]);
    
    if ($st->rowCount() > 0) {
      echo json_encode(['ok'=>true,'updated'=>$st->rowCount(),'status'=>'cancelled'], JSON_UNESCAPED_UNICODE);
    } else {
      http_response_code(404);
      echo json_encode(['ok'=>false,'error'=>'Order not found'], JSON_UNESCAPED_UNICODE);
    }
    exit;
  }

  http_response_code(405);
  echo json_encode(['ok'=>false,'error'=>'Method Not Allowed']);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['ok'=>false,'error'=>$e->getMessage()]);
}
