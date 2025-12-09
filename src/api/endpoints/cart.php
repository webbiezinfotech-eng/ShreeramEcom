<?php
// api-folder/endpoints/cart.php
require_once __DIR__ . '/../common.php';
require_once __DIR__ . '/../db.php';
require_api_key();

function pdo_conn() {
    if (function_exists('db')) return db();
    throw new Exception('No DB connection function');
}

function read_json_body() {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

// Helper function to get or create cart session
function getOrCreateCartSession($pdo, $session_token) {
    if (empty($session_token)) {
        // Generate a new session token
        $session_token = bin2hex(random_bytes(16));
    }
    
    // Try to find existing session
    $stmt = $pdo->prepare("SELECT id FROM cart_sessions WHERE session_token = ? LIMIT 1");
    $stmt->execute([$session_token]);
    $session = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($session) {
        return ['id' => $session['id'], 'token' => $session_token];
    }
    
    // Create new session
    $stmt = $pdo->prepare("INSERT INTO cart_sessions (session_token, created_at) VALUES (?, NOW())");
    $stmt->execute([$session_token]);
    return ['id' => $pdo->lastInsertId(), 'token' => $session_token];
}

// Helper to get session data from request
function getSessionFromRequest($pdo, $method) {
    // Check Content-Type for FormData
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    $isMultipart = strpos($contentType, 'multipart/form-data') !== false || !empty($_POST);
    
    // Get customer ID or session ID from request (support both GET params and POST body)
    $customer_id = $_GET['customer_id'] ?? null;
    $session_token = $_GET['session_id'] ?? null;
    
    // For POST/PUT, also check POST data (FormData or JSON body)
    if ($method === 'POST' || $method === 'PUT') {
        if ($isMultipart) {
            // FormData - check $_POST
            $customer_id = $customer_id ?? ($_POST['customer_id'] ?? null);
            $session_token = $session_token ?? ($_POST['session_id'] ?? null);
        } else {
            // JSON body
            $jsonData = json_decode(file_get_contents('php://input'), true);
            if (is_array($jsonData)) {
                $customer_id = $customer_id ?? ($jsonData['customer_id'] ?? null);
                $session_token = $session_token ?? ($jsonData['session_id'] ?? null);
            }
        }
    }
    
    // Create session data
    $session_data = null;
    if ($session_token) {
        $session_data = getOrCreateCartSession($pdo, $session_token);
    } elseif ($customer_id) {
        // For logged-in users, create a session based on customer_id
        $session_token = 'customer_' . $customer_id;
        $session_data = getOrCreateCartSession($pdo, $session_token);
    }
    
    return $session_data;
}

try {
    $pdo = pdo_conn();
    $method = $_SERVER['REQUEST_METHOD'];
    
    // Get session data (will be used by all methods)
    $session_data = getSessionFromRequest($pdo, $method);

    /* ----------------- GET CART ITEMS ----------------- */
    if ($method === 'GET') {
        $items = [];
        
        if ($session_data) {
            $session_db_id = $session_data['id'];
            $stmt = $pdo->prepare("
                SELECT c.id, c.product_id, c.quantity, c.created_at,
                       p.name, p.sku, p.stock, p.status, p.mrp, p.wholesale_rate,
                       COALESCE(p.wholesale_rate, p.mrp, 0) as price,
                       COALESCE(p.items_per_pack, 1) as items_per_pack,
                       cat.name as category_name,
                       COALESCE((SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY created_at DESC LIMIT 1), '') as image,
                       COALESCE((SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY created_at DESC LIMIT 1), '') as image_url
                FROM cart c
                LEFT JOIN products p ON p.id = c.product_id
                LEFT JOIN categories cat ON cat.id = p.category_id
                WHERE c.session_id = ? 
                  AND c.quantity > 0
                  AND (p.id IS NOT NULL AND p.status != 'inactive')
                ORDER BY c.created_at DESC
            ");
            $stmt->execute([$session_db_id]);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        echo json_encode(['ok' => true, 'items' => $items, 'session_id' => $session_data['token'] ?? null], JSON_UNESCAPED_UNICODE);
        exit;
    }

    /* ----------------- ADD TO CART ----------------- */
    if ($method === 'POST') {
        // Handle both FormData and JSON
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        $isMultipart = strpos($contentType, 'multipart/form-data') !== false || !empty($_POST);
        
        if ($isMultipart) {
            $data = $_POST ?: [];
        } else {
            $data = read_json_body();
        }
        
        // Refresh session data in case it wasn't set properly
        if (!$session_data) {
            $session_data = getSessionFromRequest($pdo, $method);
        }
        
        $product_id = (int)($data['product_id'] ?? 0);
        $quantity = (int)($data['quantity'] ?? 1);
        
        if (!$product_id) {
            echo json_encode(['ok' => false, 'error' => 'Product ID required'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        
        if (!$session_data) {
            echo json_encode(['ok' => false, 'error' => 'Session required. Please ensure you have a valid session.'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // Get product details
        $stmt = $pdo->prepare("SELECT id, name, sku, mrp, wholesale_rate, stock, status FROM products WHERE id = ? AND status = 'active'");
        $stmt->execute([$product_id]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$product) {
            echo json_encode(['ok' => false, 'error' => 'Product not found'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // Check if item already exists in cart
        $session_db_id = $session_data['id'];
        $stmt = $pdo->prepare("SELECT id, quantity FROM cart WHERE session_id = ? AND product_id = ? LIMIT 1");
        $stmt->execute([$session_db_id, $product_id]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($existing) {
            // Update quantity
            $newQuantity = $existing['quantity'] + $quantity;
            $stmt = $pdo->prepare("UPDATE cart SET quantity = ? WHERE id = ?");
            $stmt->execute([$newQuantity, $existing['id']]);
        } else {
            // Insert new item
            $stmt = $pdo->prepare("INSERT INTO cart (session_id, product_id, quantity, created_at) VALUES (?, ?, ?, NOW())");
            $stmt->execute([$session_db_id, $product_id, $quantity]);
        }

        echo json_encode(['ok' => true, 'message' => 'Added to cart', 'session_id' => $session_data['token']], JSON_UNESCAPED_UNICODE);
        exit;
    }

    /* ----------------- UPDATE CART ITEM ----------------- */
    if ($method === 'PUT') {
        // Handle both FormData and JSON
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        $isMultipart = strpos($contentType, 'multipart/form-data') !== false || !empty($_POST);
        
        if ($isMultipart) {
            $data = $_POST ?: [];
        } else {
            $data = read_json_body();
        }
        
        // Refresh session data in case it wasn't set properly
        if (!$session_data) {
            $session_data = getSessionFromRequest($pdo, $method);
        }
        
        $item_id = (int)($data['item_id'] ?? 0);
        $quantity = (int)($data['quantity'] ?? 1);
        
        if (!$item_id || $quantity < 0 || !$session_data) {
            echo json_encode(['ok' => false, 'error' => 'Invalid data'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $session_db_id = $session_data['id'];
        
        if ($quantity === 0) {
            // Permanently remove item from cart - delete from database
            // First get the product_id before deleting
            $stmt = $pdo->prepare("SELECT product_id FROM cart WHERE id = ? AND session_id = ? LIMIT 1");
            $stmt->execute([$item_id, $session_db_id]);
            $itemToDelete = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Delete the specific cart item
            $stmt = $pdo->prepare("DELETE FROM cart WHERE id = ? AND session_id = ?");
            $stmt->execute([$item_id, $session_db_id]);
            
            // Also delete any other cart entries with quantity 0 for this session (cleanup)
            $stmt = $pdo->prepare("DELETE FROM cart WHERE session_id = ? AND quantity <= 0");
            $stmt->execute([$session_db_id]);
        } else {
            // Update quantity
            $stmt = $pdo->prepare("UPDATE cart SET quantity = ? WHERE id = ? AND session_id = ?");
            $stmt->execute([$quantity, $item_id, $session_db_id]);
        }

        echo json_encode(['ok' => true, 'message' => 'Cart updated'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    /* ----------------- CLEAR CART ----------------- */
    if ($method === 'DELETE') {
        if (!$session_data) {
            echo json_encode(['ok' => false, 'error' => 'Session required'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        
        $session_db_id = $session_data['id'];
        $stmt = $pdo->prepare("DELETE FROM cart WHERE session_id = ?");
        $stmt->execute([$session_db_id]);

        echo json_encode(['ok' => true, 'message' => 'Cart cleared'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    echo json_encode(['ok' => false, 'error' => 'Method not allowed'], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    echo json_encode(['ok' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
