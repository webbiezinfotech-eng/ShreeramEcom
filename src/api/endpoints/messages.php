<?php
// api-folder/endpoints/messages.php
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

$method = $_SERVER['REQUEST_METHOD'];

try {
  $pdo = pdo_conn();

  /* ---------------- GET (list messages) ---------------- */
  if ($method === 'GET') {
    $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
    $limit = isset($_GET['limit']) ? max(1, min(200, (int)$_GET['limit'])) : 20;
    $offset = ($page - 1) * $limit;

    $where = [];
    $params = [];

    // Filter by status (read/unread)
    if (!empty($_GET['status'])) {
      $where[] = "m.status = :status";
      $params[':status'] = $_GET['status'];
    }

    // Search
    if (!empty($_GET['q'])) {
      $where[] = "(m.name LIKE :q OR m.email LIKE :q OR m.subject LIKE :q OR m.message LIKE :q)";
      $params[':q'] = '%' . $_GET['q'] . '%';
    }

    $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

    // Total count
    $stTotal = $pdo->prepare("SELECT COUNT(*) FROM messages m $whereSql");
    $stTotal->execute($params);
    $total = (int)$stTotal->fetchColumn();

    // Get messages
    $sql = "
      SELECT m.*, 
             COALESCE(c.name, '') AS customer_name,
             COALESCE(c.firm, '') AS customer_firm,
             COALESCE(c.email, '') AS customer_email,
             COALESCE(c.phone, '') AS customer_phone
      FROM messages m
      LEFT JOIN customers c ON c.email = m.email OR c.phone = m.phone
      $whereSql
      ORDER BY m.created_at DESC
      LIMIT $limit OFFSET $offset
    ";
    $st = $pdo->prepare($sql);
    $st->execute($params);
    $rows = $st->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['ok' => true, 'page' => $page, 'limit' => $limit, 'total' => $total, 'items' => $rows], JSON_UNESCAPED_UNICODE);
    exit;
  }

  /* ---------------- POST (create message) ---------------- */
  if ($method === 'POST') {
    $b = $_POST ?: read_json_body();

    $name = isset($b['name']) ? trim($b['name']) : '';
    $email = isset($b['email']) ? trim($b['email']) : '';
    $phone = isset($b['phone']) ? trim($b['phone']) : '';
    $subject = isset($b['subject']) ? trim($b['subject']) : '';
    $message = isset($b['message']) ? trim($b['message']) : '';
    $customer_id = isset($b['customer_id']) ? (int)$b['customer_id'] : null;

    // Validation
    if (empty($name)) {
      http_response_code(400);
      echo json_encode(['ok' => false, 'error' => 'Name is required'], JSON_UNESCAPED_UNICODE);
      exit;
    }

    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
      http_response_code(400);
      echo json_encode(['ok' => false, 'error' => 'Valid email is required'], JSON_UNESCAPED_UNICODE);
      exit;
    }

    if (empty($message)) {
      http_response_code(400);
      echo json_encode(['ok' => false, 'error' => 'Message is required'], JSON_UNESCAPED_UNICODE);
      exit;
    }

    // Try to find customer by email or phone if customer_id not provided
    if (!$customer_id) {
      $custStmt = $pdo->prepare("SELECT id FROM customers WHERE email = :email OR phone = :phone LIMIT 1");
      $custStmt->execute([':email' => $email, ':phone' => $phone]);
      $customer = $custStmt->fetch(PDO::FETCH_ASSOC);
      if ($customer) {
        $customer_id = (int)$customer['id'];
      }
    }

    // Insert message
    $st = $pdo->prepare("
      INSERT INTO messages (customer_id, name, email, phone, subject, message, status, created_at)
      VALUES (:customer_id, :name, :email, :phone, :subject, :message, 'unread', NOW())
    ");
    $st->execute([
      ':customer_id' => $customer_id,
      ':name' => $name,
      ':email' => $email,
      ':phone' => $phone,
      ':subject' => $subject,
      ':message' => $message
    ]);
    $id = (int)$pdo->lastInsertId();

    echo json_encode(['ok' => true, 'id' => $id, 'message' => 'Message sent successfully'], JSON_UNESCAPED_UNICODE);
    exit;
  }

  /* ---------------- PUT/PATCH (update message status) ---------------- */
  if ($method === 'PUT' || $method === 'PATCH') {
    if (!isset($_GET['id'])) {
      http_response_code(400);
      echo json_encode(['ok' => false, 'error' => 'id required'], JSON_UNESCAPED_UNICODE);
      exit;
    }
    $id = (int)$_GET['id'];
    $b = read_json_body();

    $sets = [];
    $params = [':id' => $id];

    if (array_key_exists('status', $b)) {
      $sets[] = "status = :status";
      $params[':status'] = $b['status']; // 'read' or 'unread'
    }

    if (empty($sets)) {
      echo json_encode(['ok' => true, 'updated' => 0], JSON_UNESCAPED_UNICODE);
      exit;
    }

    $sets[] = "updated_at = NOW()";
    $sql = "UPDATE messages SET " . implode(', ', $sets) . " WHERE id = :id";
    $st = $pdo->prepare($sql);
    $st->execute($params);

    echo json_encode(['ok' => true, 'updated' => $st->rowCount()], JSON_UNESCAPED_UNICODE);
    exit;
  }

  /* ---------------- DELETE (delete message) ---------------- */
  if ($method === 'DELETE') {
    if (!isset($_GET['id'])) {
      http_response_code(400);
      echo json_encode(['ok' => false, 'error' => 'id required'], JSON_UNESCAPED_UNICODE);
      exit;
    }
    $id = (int)$_GET['id'];

    $st = $pdo->prepare("DELETE FROM messages WHERE id = :id");
    $st->execute([':id' => $id]);

    if ($st->rowCount() > 0) {
      echo json_encode(['ok' => true, 'deleted' => $st->rowCount()], JSON_UNESCAPED_UNICODE);
    } else {
      http_response_code(404);
      echo json_encode(['ok' => false, 'error' => 'Message not found'], JSON_UNESCAPED_UNICODE);
    }
    exit;
  }

  http_response_code(405);
  echo json_encode(['ok' => false, 'error' => 'Method Not Allowed'], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}

