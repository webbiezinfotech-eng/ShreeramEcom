<?php
// api/endpoints/customers.php
declare(strict_types=1);
require_once __DIR__ . '/../common.php';
require_once __DIR__ . '/../db.php';
require_api_key();

$pdo = db();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// Helper
function respond($data, $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

switch ($method) {
    // ✅ Fetch Customers
    case 'GET':
        if (isset($_GET['id'])) {
            $st = $pdo->prepare("SELECT * FROM customers WHERE id=?");
            $st->execute([(int)$_GET['id']]);
            $row = $st->fetch();
            if (!$row) respond(['error' => 'not_found'], 404);
            respond($row);
        }

        $q = trim($_GET['q'] ?? '');
        $status = $_GET['status'] ?? null;

        $sql = "SELECT * FROM customers WHERE 1";
        $params = [];

        if ($status !== null && $status !== '') {
            $sql .= " AND status = ?";
            $params[] = $status;
        }
        if ($q !== '') {
            $sql .= " AND (name LIKE ? OR firm LIKE ? OR email LIKE ? OR phone LIKE ? OR address LIKE ?)";
            $params[] = "%$q%";
            $params[] = "%$q%";
            $params[] = "%$q%";
            $params[] = "%$q%";
            $params[] = "%$q%";
        }

        $st = $pdo->prepare($sql);
        $st->execute($params);
        $rows = $st->fetchAll();
        respond($rows);
        break;

    // ✅ Add New Customer
    case 'POST':
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data || !isset($data['name'], $data['email'])) {
            respond(['error' => 'Name & Email required'], 400);
        }

        $st = $pdo->prepare("INSERT INTO customers (name, firm, address, email, phone, status, created_at)
                             VALUES (?, ?, ?, ?, ?, ?, NOW())");
        $st->execute([
            $data['name'] ?? '',
            $data['firm'] ?? '',
            $data['address'] ?? '',
            $data['email'] ?? '',
            $data['phone'] ?? '',
            $data['status'] ?? 'true'
        ]);
        respond(['success' => true, 'id' => $pdo->lastInsertId()]);
        break;

    // ✅ Update Customer
    case 'PUT':
        if (!isset($_GET['id'])) respond(['error' => 'Missing id'], 400);
        $id = (int)$_GET['id'];

        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data) respond(['error' => 'Invalid JSON'], 400);

        $st = $pdo->prepare("UPDATE customers SET name=?, firm=?, address=?, email=?, phone=?, status=? WHERE id=?");
        $st->execute([
            $data['name'] ?? '',
            $data['firm'] ?? '',
            $data['address'] ?? '',
            $data['email'] ?? '',
            $data['phone'] ?? '',
            $data['status'] ?? 'true',
            $id
        ]);
        respond(['success' => true]);
        break;

    // ✅ Delete Customer (Soft Delete - Update status to false)
    // case 'DELETE':
    //     if (!isset($_GET['id'])) respond(['error' => 'Missing id'], 400);
    //     $id = (int)$_GET['id'];

    //     // Soft delete - Update status to 'false' instead of deleting
    //     $st = $pdo->prepare("UPDATE customers SET status = 'false' WHERE id=?");
    //     $st->execute([$id]);
    //     respond(['success' => true, 'message' => 'Customer status updated to inactive']);
    //     break;

    default:
        respond(['error' => 'Method not allowed'], 405);
}
