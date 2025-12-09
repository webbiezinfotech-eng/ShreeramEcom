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
    // ✅ Login endpoint (GET with email/phone and password)
    case 'GET':
        // Check if this is a login request
        if (isset($_GET['email']) && isset($_GET['password'])) {
            $emailOrPhone = trim($_GET['email'] ?? '');
            $password = $_GET['password'] ?? '';
            
            if (empty($emailOrPhone) || empty($password)) {
                respond(['ok' => false, 'error' => 'Email/Phone and password required'], 400);
            }
            
            // Check if password_hash column exists
            $hasPasswordCol = hasPasswordColumn($pdo);
            
            if ($hasPasswordCol) {
                // Determine if input is email or phone
                // Remove spaces, dashes, parentheses from phone number
                $cleanedInput = preg_replace('/[\s\-\(\)]/', '', trim($emailOrPhone));
                $isEmail = filter_var($emailOrPhone, FILTER_VALIDATE_EMAIL);
                $isPhone = preg_match('/^[0-9]{10}$/', $cleanedInput);
                
                if (!$isEmail && !$isPhone) {
                    // Check if it's all digits but wrong length
                    if (preg_match('/^[0-9]+$/', $cleanedInput)) {
                        if (strlen($cleanedInput) < 10) {
                            respond(['ok' => false, 'error' => 'Phone number must be 10 digits'], 400);
                        } else if (strlen($cleanedInput) > 10) {
                            respond(['ok' => false, 'error' => 'Phone number must be exactly 10 digits'], 400);
                        }
                    }
                    respond(['ok' => false, 'error' => 'Please enter a valid email address or 10-digit phone number'], 400);
                }
                
                // Use cleaned input for phone lookup
                $lookupValue = $isPhone ? $cleanedInput : $emailOrPhone;
                
                // Find customer by email OR phone
                $customer = null;
                
                if ($isEmail) {
                    // Try exact match first
                    $st = $pdo->prepare("SELECT id, name, firm, email, phone, address, status, password_hash FROM customers WHERE email = ? LIMIT 1");
                    $st->execute([$emailOrPhone]);
                    $customer = $st->fetch(PDO::FETCH_ASSOC);
                    
                    // If not found, try case-insensitive match
                    if (!$customer) {
                        $st = $pdo->prepare("SELECT id, name, firm, email, phone, address, status, password_hash FROM customers WHERE LOWER(email) = LOWER(?) LIMIT 1");
                        $st->execute([$emailOrPhone]);
                        $customer = $st->fetch(PDO::FETCH_ASSOC);
                    }
                } else {
                    // For phone: try exact match first
                    $st = $pdo->prepare("SELECT id, name, firm, email, phone, address, status, password_hash FROM customers WHERE phone = ? LIMIT 1");
                    $st->execute([$lookupValue]);
                    $customer = $st->fetch(PDO::FETCH_ASSOC);
                    
                    // If not found, try TRIM match
                    if (!$customer) {
                        $st = $pdo->prepare("SELECT id, name, firm, email, phone, address, status, password_hash FROM customers WHERE TRIM(phone) = ? LIMIT 1");
                        $st->execute([$lookupValue]);
                        $customer = $st->fetch(PDO::FETCH_ASSOC);
                    }
                    
                    // If still not found, try cleaned match (remove all non-digits from DB phone)
                    if (!$customer) {
                        $st = $pdo->prepare("SELECT id, name, firm, email, phone, address, status, password_hash FROM customers WHERE REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', '') = ? LIMIT 1");
                        $st->execute([$lookupValue]);
                        $customer = $st->fetch(PDO::FETCH_ASSOC);
                    }
                    
                    // Final fallback: get all and check manually
                    if (!$customer) {
                        $allStmt = $pdo->prepare("SELECT id, name, firm, email, phone, address, status, password_hash FROM customers");
                        $allStmt->execute();
                        $allCustomers = $allStmt->fetchAll(PDO::FETCH_ASSOC);
                        
                        foreach ($allCustomers as $cust) {
                            $dbPhone = preg_replace('/[\s\-\(\)]/', '', trim($cust['phone'] ?? ''));
                            if ($dbPhone === $lookupValue) {
                                $customer = $cust;
                                break;
                            }
                        }
                    }
                }
                
                if (!$customer) {
                    // Provide more specific error message
                    if ($isPhone) {
                        respond(['ok' => false, 'error' => 'Phone number not found. Please check your phone number or register first.'], 401);
                    } else {
                        respond(['ok' => false, 'error' => 'Email not found. Please check your email or register first.'], 401);
                    }
                }
                
                // Check if account is active (status must be 'true', true, '1', or 1)
                $status = $customer['status'];
                $isInactive = ($status === 'false' || $status === false || $status === '0' || $status === 0 || $status === null || $status === '');
                if ($isInactive) {
                    respond(['ok' => false, 'error' => 'Please contact Shreeram Store for view products', 'inactive' => true], 403);
                }
                
                // ✅ SECURITY: ALWAYS verify password if password_hash column exists
                if (empty($customer['password_hash']) || $customer['password_hash'] === null) {
                    // If password_hash is empty, reject login - user must set password first
                    respond(['ok' => false, 'error' => 'Password not set. Please contact admin or reset password.'], 401);
                }
                
                // Verify password - this is MANDATORY
                // Make sure password_hash is a string
                $passwordHash = (string)$customer['password_hash'];
                $passwordToVerify = (string)$password;
                
                if (!password_verify($passwordToVerify, $passwordHash)) {
                    // Provide more specific error message
                    if ($isPhone) {
                        respond(['ok' => false, 'error' => 'Password is incorrect. Please check your password and try again.'], 401);
                    } else {
                        respond(['ok' => false, 'error' => 'Password is incorrect. Please check your password and try again.'], 401);
                    }
                }
                
                // Remove password_hash from response
                unset($customer['password_hash']);
                
                respond(['ok' => true, 'customer' => $customer]);
            } else {
                // Fallback: if password column doesn't exist, just check email/phone and status
                $cleanedInput = preg_replace('/[\s\-\(\)]/', '', $emailOrPhone);
                $isEmail = filter_var($emailOrPhone, FILTER_VALIDATE_EMAIL);
                $isPhone = preg_match('/^[0-9]{10}$/', $cleanedInput);
                
                if (!$isEmail && !$isPhone) {
                    if (preg_match('/^[0-9]+$/', $cleanedInput)) {
                        if (strlen($cleanedInput) < 10) {
                            respond(['ok' => false, 'error' => 'Phone number must be 10 digits'], 400);
                        } else if (strlen($cleanedInput) > 10) {
                            respond(['ok' => false, 'error' => 'Phone number must be exactly 10 digits'], 400);
                        }
                    }
                    respond(['ok' => false, 'error' => 'Please enter a valid email address or 10-digit phone number'], 400);
                }
                
                $lookupValue = $isPhone ? $cleanedInput : $emailOrPhone;
                
                if ($isEmail) {
                    $st = $pdo->prepare("SELECT id, name, firm, email, phone, address, status FROM customers WHERE email = ? LIMIT 1");
                    $st->execute([$emailOrPhone]);
                } else {
                    // For phone: try exact match first, then try with cleaned phone
                    $st = $pdo->prepare("SELECT id, name, firm, email, phone, address, status FROM customers WHERE phone = ? OR REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', '') = ? LIMIT 1");
                    $st->execute([$lookupValue, $lookupValue]);
                }
                $customer = $st->fetch(PDO::FETCH_ASSOC);
                
                if (!$customer) {
                    // Provide more specific error message
                    if ($isPhone) {
                        respond(['ok' => false, 'error' => 'Phone number not found'], 401);
                    } else {
                        respond(['ok' => false, 'error' => 'Email not found'], 401);
                    }
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
        if (!$data || !isset($data['name'])) {
            respond(['error' => 'Name is required'], 400);
        }
        
        // Phone is required
        if (empty($data['phone'])) {
            respond(['error' => 'Phone number is required'], 400);
        }
        
        // Clean phone number: remove spaces, dashes, parentheses
        $cleanedPhone = preg_replace('/[\s\-\(\)]/', '', trim($data['phone']));
        if (!preg_match('/^[0-9]{10}$/', $cleanedPhone)) {
            respond(['error' => 'Phone number must be exactly 10 digits'], 400);
        }
        
        // Check if phone already exists
        $checkPhone = $pdo->prepare("SELECT id FROM customers WHERE phone = ? OR REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', '') = ? LIMIT 1");
        $checkPhone->execute([$cleanedPhone, $cleanedPhone]);
        if ($checkPhone->fetch()) {
            respond(['error' => 'Phone number already registered'], 409);
        }
        
        // Check if email already exists (only if email is provided)
        if (!empty($data['email'])) {
            $checkEmail = $pdo->prepare("SELECT id FROM customers WHERE email = ? AND email != '' LIMIT 1");
            $checkEmail->execute([$data['email']]);
            if ($checkEmail->fetch()) {
                respond(['error' => 'Email already registered'], 409);
            }
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
        
        // Email is optional - use NULL if empty
        $email = !empty($data['email']) ? $data['email'] : null;
        
        if ($hasPasswordCol) {
            $st = $pdo->prepare("INSERT INTO customers (name, firm, address, email, phone, password_hash, status, created_at)
                                 VALUES (?, ?, ?, ?, ?, ?, ?, NOW())");
            $st->execute([
                $data['name'] ?? '',
                $data['firm'] ?? '',
                $data['address'] ?? '',
                $email,
                $cleanedPhone, // Store cleaned phone number
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
                $email,
                $cleanedPhone, // Store cleaned phone number
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
