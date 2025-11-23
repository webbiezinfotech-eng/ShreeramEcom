<?php
// api/endpoints/admins.php
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
    // ✅ Admin Login
    case 'GET':
        // Check if this is a login request
        if (isset($_GET['email']) && isset($_GET['password'])) {
            $email = trim($_GET['email'] ?? '');
            $password = $_GET['password'] ?? '';
            
            if (empty($email) || empty($password)) {
                respond(['ok' => false, 'error' => 'Email and password required'], 400);
            }
            
            // Find admin by email
            $st = $pdo->prepare("SELECT id, name, email, password_hash FROM admins WHERE email = ? LIMIT 1");
            $st->execute([$email]);
            $admin = $st->fetch(PDO::FETCH_ASSOC);
            
            if (!$admin) {
                respond(['ok' => false, 'error' => 'Invalid email or password'], 401);
            }
            
            // Verify password
            if (!password_verify($password, $admin['password_hash'])) {
                respond(['ok' => false, 'error' => 'Invalid email or password'], 401);
            }
            
            // Remove password_hash from response
            unset($admin['password_hash']);
            
            respond(['ok' => true, 'admin' => $admin]);
            exit;
        }
        
        // ✅ Get Admin by ID
        if (isset($_GET['id'])) {
            $st = $pdo->prepare("SELECT id, name, email, created_at FROM admins WHERE id=?");
            $st->execute([(int)$_GET['id']]);
            $row = $st->fetch(PDO::FETCH_ASSOC);
            if (!$row) respond(['error' => 'not_found'], 404);
            respond($row);
        }
        
        // ✅ Get All Admins
        $st = $pdo->query("SELECT id, name, email, created_at FROM admins ORDER BY id DESC");
        respond(['items' => $st->fetchAll(PDO::FETCH_ASSOC)]);
        break;

    // ✅ Create Admin (Only allow one admin)
    case 'POST':
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data || !isset($data['name'], $data['email'], $data['password'])) {
            respond(['error' => 'Name, Email & Password required'], 400);
        }
        
        // Check if admin already exists - only allow ONE admin
        $checkAdmin = $pdo->query("SELECT COUNT(*) as count FROM admins");
        $countResult = $checkAdmin->fetch(PDO::FETCH_ASSOC);
        if ($countResult && (int)$countResult['count'] > 0) {
            respond(['error' => 'Only one admin account is allowed. Admin already exists.'], 403);
        }
        
        // Check if email already exists
        $checkEmail = $pdo->prepare("SELECT id FROM admins WHERE email = ? LIMIT 1");
        $checkEmail->execute([$data['email']]);
        if ($checkEmail->fetch()) {
            respond(['error' => 'Email already registered'], 409);
        }
        
        // Hash password
        $passwordHash = password_hash($data['password'], PASSWORD_DEFAULT);
        
        $st = $pdo->prepare("INSERT INTO admins (name, email, password_hash, created_at) VALUES (?, ?, ?, NOW())");
        $st->execute([
            trim($data['name']),
            trim($data['email']),
            $passwordHash
        ]);
        
        $adminId = $pdo->lastInsertId();
        
        // Return admin data (without password)
        $st = $pdo->prepare("SELECT id, name, email, created_at FROM admins WHERE id = ?");
        $st->execute([$adminId]);
        $admin = $st->fetch(PDO::FETCH_ASSOC);
        
        respond(['success' => true, 'id' => $adminId, 'admin' => $admin], 201);
        break;

    // ✅ Update Admin
    case 'PUT':
        if (!isset($_GET['id'])) respond(['error' => 'Missing id'], 400);
        $id = (int)$_GET['id'];
        
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data) respond(['error' => 'Invalid JSON'], 400);
        
        $updates = [];
        $params = [];
        
        if (isset($data['name'])) {
            $updates[] = "name = ?";
            $params[] = trim($data['name']);
        }
        
        if (isset($data['email'])) {
            // Check if email already exists (excluding current admin)
            $checkEmail = $pdo->prepare("SELECT id FROM admins WHERE email = ? AND id != ? LIMIT 1");
            $checkEmail->execute([$data['email'], $id]);
            if ($checkEmail->fetch()) {
                respond(['error' => 'Email already in use'], 409);
            }
            $updates[] = "email = ?";
            $params[] = trim($data['email']);
        }
        
        if (isset($data['password']) && !empty($data['password'])) {
            $updates[] = "password_hash = ?";
            $params[] = password_hash($data['password'], PASSWORD_DEFAULT);
        }
        
        if (empty($updates)) {
            respond(['error' => 'No fields to update'], 400);
        }
        
        $params[] = $id;
        $sql = "UPDATE admins SET " . implode(", ", $updates) . " WHERE id = ?";
        $st = $pdo->prepare($sql);
        $st->execute($params);
        
        respond(['success' => true]);
        break;

    // ✅ Delete Admin
    case 'DELETE':
        if (!isset($_GET['id'])) respond(['error' => 'Missing id'], 400);
        $id = (int)$_GET['id'];
        
        $st = $pdo->prepare("DELETE FROM admins WHERE id = ?");
        $st->execute([$id]);
        
        respond(['success' => true]);
        break;

    default:
        respond(['error' => 'Method not allowed'], 405);
}

