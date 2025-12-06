<?php
// api/endpoints/customers.php
declare(strict_types=1);
// Suppress PHP warnings/errors to prevent HTML output before JSON
error_reporting(0);
ini_set('display_errors', 0);

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

// Helper function to check if password_hash column exists
function hasPasswordColumn($pdo) {
    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM customers LIKE 'password_hash'");
        return $stmt->rowCount() > 0;
    } catch (Exception $e) {
        return false;
    }
}

switch ($method) {
    // ✅ Login endpoint (GET with email and password)
    case 'GET':
        // Check if this is a login request
        if (isset($_GET['email']) && isset($_GET['password'])) {
            $email = trim($_GET['email'] ?? '');
            $password = $_GET['password'] ?? '';
            
            if (empty($email) || empty($password)) {
                respond(['ok' => false, 'error' => 'Email and password required'], 400);
            }
            
            // Check if password_hash column exists
            $hasPasswordCol = hasPasswordColumn($pdo);
            
            if ($hasPasswordCol) {
                // Find customer by email
                $st = $pdo->prepare("SELECT id, name, firm, email, phone, address, status, password_hash FROM customers WHERE email = ? LIMIT 1");
                $st->execute([$email]);
                $customer = $st->fetch(PDO::FETCH_ASSOC);
                
                if (!$customer) {
                    respond(['ok' => false, 'error' => 'Invalid email or password'], 401);
                }
                
                // Check if account is active (status must be 'true', true, '1', or 1)
                $status = $customer['status'];
                $isInactive = ($status === 'false' || $status === false || $status === '0' || $status === 0 || $status === null || $status === '');
                if ($isInactive) {
                    respond(['ok' => false, 'error' => 'Please contact Shreeram Store for view products', 'inactive' => true], 403);
                }
                
                // ✅ SECURITY: ALWAYS verify password if password_hash column exists
                if (empty($customer['password_hash'])) {
                    // If password_hash is empty, reject login - user must set password first
                    respond(['ok' => false, 'error' => 'Password not set. Please contact admin or reset password.'], 401);
                }
                
                // Verify password - this is MANDATORY
                if (!password_verify($password, $customer['password_hash'])) {
                    respond(['ok' => false, 'error' => 'Invalid email or password'], 401);
                }
                
                // Remove password_hash from response
                unset($customer['password_hash']);
                
                respond(['ok' => true, 'customer' => $customer]);
            } else {
                // Fallback: if password column doesn't exist, just check email and status
                $st = $pdo->prepare("SELECT id, name, firm, email, phone, address, status FROM customers WHERE email = ? LIMIT 1");
                $st->execute([$email]);
                $customer = $st->fetch(PDO::FETCH_ASSOC);
                
                if (!$customer) {
                    respond(['ok' => false, 'error' => 'Invalid email or password'], 401);
                }
                
                // Check if account is active (status must be 'true', true, '1', or 1)
                $status = $customer['status'];
                $isInactive = ($status === 'false' || $status === false || $status === '0' || $status === 0 || $status === null || $status === '');
                if ($isInactive) {
                    respond(['ok' => false, 'error' => 'Please contact Shreeram Store for view products', 'inactive' => true], 403);
                }
                
                // Allow login without password verification (for backward compatibility)
                respond(['ok' => true, 'customer' => $customer, 'warning' => 'Password authentication not enabled']);
            }
            exit;
        }
        
        // ✅ Fetch Customers (original GET logic)
        if (isset($_GET['id'])) {
            $st = $pdo->prepare("SELECT id, name, firm, address, email, phone, status, created_at FROM customers WHERE id=?");
            $st->execute([(int)$_GET['id']]);
            $row = $st->fetch(PDO::FETCH_ASSOC);
            if (!$row) respond(['error' => 'not_found'], 404);
            // Don't return password_hash
            respond($row);
        }

        $q = trim($_GET['q'] ?? '');
        $status = $_GET['status'] ?? null;

        $sql = "SELECT id, name, firm, address, email, phone, status, created_at FROM customers WHERE 1";
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
        $rows = $st->fetchAll(PDO::FETCH_ASSOC);
        respond($rows);
        break;

    // ✅ Add New Customer / Register
    case 'POST':
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data || !isset($data['name'], $data['email'])) {
            respond(['error' => 'Name & Email required'], 400);
        }
        
        // Check if email already exists
        $checkEmail = $pdo->prepare("SELECT id FROM customers WHERE email = ? LIMIT 1");
        $checkEmail->execute([$data['email']]);
        if ($checkEmail->fetch()) {
            respond(['error' => 'Email already registered'], 409);
        }
        
        $hasPasswordCol = hasPasswordColumn($pdo);
        
        // Hash password if provided and column exists
        $passwordHash = null;
        if ($hasPasswordCol && isset($data['password']) && !empty($data['password'])) {
            $passwordHash = password_hash($data['password'], PASSWORD_DEFAULT);
        }
        
        // Default status to 'true' (approved) for new registrations
        // Admin can still reject them later if needed
        $status = isset($data['status']) ? $data['status'] : 'true';
        
        if ($hasPasswordCol) {
            $st = $pdo->prepare("INSERT INTO customers (name, firm, address, email, phone, password_hash, status, created_at)
                                 VALUES (?, ?, ?, ?, ?, ?, ?, NOW())");
            $st->execute([
                $data['name'] ?? '',
                $data['firm'] ?? '',
                $data['address'] ?? '',
                $data['email'] ?? '',
                $data['phone'] ?? '',
                $passwordHash,
                $status // New registrations are approved by default (status='true')
            ]);
        } else {
            $st = $pdo->prepare("INSERT INTO customers (name, firm, address, email, phone, status, created_at)
                                 VALUES (?, ?, ?, ?, ?, ?, NOW())");
            $st->execute([
                $data['name'] ?? '',
                $data['firm'] ?? '',
                $data['address'] ?? '',
                $data['email'] ?? '',
                $data['phone'] ?? '',
                $status // New registrations are approved by default (status='true')
            ]);
        }
        
        $customerId = $pdo->lastInsertId();
        
        // Return customer data (without password)
        $st = $pdo->prepare("SELECT id, name, firm, email, phone, address, status FROM customers WHERE id = ?");
        $st->execute([$customerId]);
        $customer = $st->fetch(PDO::FETCH_ASSOC);
        
        respond(['success' => true, 'id' => $customerId, 'customer' => $customer]);
        break;

    // ✅ Update Customer
    case 'PUT':
        try {
            if (!isset($_GET['id'])) {
                respond(['error' => 'Missing id'], 400);
            }
            $id = (int)$_GET['id'];

            $data = json_decode(file_get_contents("php://input"), true);
            if (!$data) {
                respond(['error' => 'Invalid JSON'], 400);
            }
            
            $hasPasswordCol = hasPasswordColumn($pdo);
            
            // Update password if provided
            if ($hasPasswordCol && isset($data['password']) && !empty($data['password'])) {
                $passwordHash = password_hash($data['password'], PASSWORD_DEFAULT);
                $st = $pdo->prepare("UPDATE customers SET name=?, firm=?, address=?, email=?, phone=?, password_hash=?, status=? WHERE id=?");
                $st->execute([
                    $data['name'] ?? '',
                    $data['firm'] ?? '',
                    $data['address'] ?? '',
                    $data['email'] ?? '',
                    $data['phone'] ?? '',
                    $passwordHash,
                    $data['status'] ?? 'true',
                    $id
                ]);
            } else {
                // Only update status if only status is being updated
                if (isset($data['status']) && count($data) === 1) {
                    $st = $pdo->prepare("UPDATE customers SET status=? WHERE id=?");
                    $st->execute([$data['status'], $id]);
                } else {
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
                }
            }
            
            respond(['success' => true, 'message' => 'Customer updated successfully']);
        } catch (Exception $e) {
            respond(['error' => 'Failed to update customer: ' . $e->getMessage()], 500);
        }
        break;

    default:
        respond(['error' => 'Method not allowed'], 405);
}
