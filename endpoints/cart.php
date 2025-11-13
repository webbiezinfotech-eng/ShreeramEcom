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

try {
    $pdo = pdo_conn();
    $method = $_SERVER['REQUEST_METHOD'];
    
    // Get customer ID from session or request
    $customer_id = $_GET['customer_id'] ?? $_POST['customer_id'] ?? null;
    $session_id = $_GET['session_id'] ?? $_POST['session_id'] ?? null;

    /* ----------------- GET CART ITEMS ----------------- */
    if ($method === 'GET') {
        if ($customer_id) {
            // Get cart for logged in customer
            $stmt = $pdo->prepare("
                SELECT c.*, p.name, p.sku, p.image, p.stock, p.status,
                       cat.name as category_name
                FROM cart c
                LEFT JOIN products p ON p.id = c.product_id
                LEFT JOIN categories cat ON cat.id = p.category_id
                WHERE c.customer_id = ?
                ORDER BY c.created_at DESC
            ");
            $stmt->execute([$customer_id]);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } else if ($session_id) {
            // Get cart for session (non-logged in user)
            $stmt = $pdo->prepare("
                SELECT cs.*, p.name, p.sku, p.image, p.stock, p.status,
                       cat.name as category_name
                FROM cart_sessions cs
                LEFT JOIN products p ON p.id = cs.product_id
                LEFT JOIN categories cat ON cat.id = p.category_id
                WHERE cs.session_id = ?
                ORDER BY cs.created_at DESC
            ");
            $stmt->execute([$session_id]);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } else {
            $items = [];
        }

        echo json_encode(['ok' => true, 'items' => $items], JSON_UNESCAPED_UNICODE);
        exit;
    }

    /* ----------------- ADD TO CART ----------------- */
    if ($method === 'POST') {
        $data = read_json_body();
        
        $product_id = (int)($data['product_id'] ?? 0);
        $quantity = (int)($data['quantity'] ?? 1);
        
        if (!$product_id) {
            echo json_encode(['ok' => false, 'error' => 'Product ID required'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // Get product details
        $stmt = $pdo->prepare("SELECT * FROM products WHERE id = ? AND status = 'active'");
        $stmt->execute([$product_id]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$product) {
            echo json_encode(['ok' => false, 'error' => 'Product not found'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        if ($customer_id) {
            // Add to customer cart
            $stmt = $pdo->prepare("
                INSERT INTO cart (customer_id, product_id, quantity, price)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                quantity = quantity + VALUES(quantity),
                updated_at = CURRENT_TIMESTAMP
            ");
            $stmt->execute([$customer_id, $product_id, $quantity, $product['price']]);
        } else if ($session_id) {
            // Add to session cart
            $stmt = $pdo->prepare("
                INSERT INTO cart_sessions (session_id, product_id, quantity, price)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                quantity = quantity + VALUES(quantity),
                updated_at = CURRENT_TIMESTAMP
            ");
            $stmt->execute([$session_id, $product_id, $quantity, $product['price']]);
        } else {
            echo json_encode(['ok' => false, 'error' => 'Customer ID or Session ID required'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        echo json_encode(['ok' => true, 'message' => 'Added to cart'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    /* ----------------- UPDATE CART ITEM ----------------- */
    if ($method === 'PUT') {
        $data = read_json_body();
        
        $item_id = (int)($data['item_id'] ?? 0);
        $quantity = (int)($data['quantity'] ?? 1);
        
        if (!$item_id || $quantity < 0) {
            echo json_encode(['ok' => false, 'error' => 'Invalid data'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        if ($customer_id) {
            if ($quantity === 0) {
                // Remove item
                $stmt = $pdo->prepare("DELETE FROM cart WHERE id = ? AND customer_id = ?");
                $stmt->execute([$item_id, $customer_id]);
            } else {
                // Update quantity
                $stmt = $pdo->prepare("UPDATE cart SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND customer_id = ?");
                $stmt->execute([$quantity, $item_id, $customer_id]);
            }
        } else if ($session_id) {
            if ($quantity === 0) {
                // Remove item
                $stmt = $pdo->prepare("DELETE FROM cart_sessions WHERE id = ? AND session_id = ?");
                $stmt->execute([$item_id, $session_id]);
            } else {
                // Update quantity
                $stmt = $pdo->prepare("UPDATE cart_sessions SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND session_id = ?");
                $stmt->execute([$quantity, $item_id, $session_id]);
            }
        }

        echo json_encode(['ok' => true, 'message' => 'Cart updated'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    /* ----------------- CLEAR CART ----------------- */
    if ($method === 'DELETE') {
        if ($customer_id) {
            $stmt = $pdo->prepare("DELETE FROM cart WHERE customer_id = ?");
            $stmt->execute([$customer_id]);
        } else if ($session_id) {
            $stmt = $pdo->prepare("DELETE FROM cart_sessions WHERE session_id = ?");
            $stmt->execute([$session_id]);
        }

        echo json_encode(['ok' => true, 'message' => 'Cart cleared'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    echo json_encode(['ok' => false, 'error' => 'Method not allowed'], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    echo json_encode(['ok' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}