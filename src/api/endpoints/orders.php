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

    // rows
    $sql = "
      SELECT o.*, COALESCE(c.name,'') AS customer_name, COALESCE(c.firm,'') AS customer_firm
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
    $b = $_POST ?: read_json_body();

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

    $st = $pdo->prepare("
      INSERT INTO orders (customer_id, customer_name, total_amount, currency, payment, address, order_date, delivery_date, created_at)
      VALUES (:c,:cn,:t,:cur,:pay,:addr,:od,:dd,NOW())
    ");
    $st->execute([
      ':c'=>$customer_id, ':cn'=>$customer_name, ':t'=>$total_amount, ':cur'=>$currency,
      ':pay'=>$payment, ':addr'=>$address, ':od'=>$order_date, ':dd'=>$delivery_date
    ]);
    $id = (int)$pdo->lastInsertId();

    echo json_encode(['ok'=>true,'id'=>$id], JSON_UNESCAPED_UNICODE);
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
