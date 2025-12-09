<?php
// order_items.php — Manage order items (create + fetch)
require_once __DIR__ . '/../common.php';
require_once __DIR__ . '/../db.php';
require_api_key();

$pdo = db();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// 🔹 POST: Create order items (when an order is placed)
if ($method === 'POST') {
    $input = body_json();

    $order_id   = intval($input['order_id'] ?? 0);
    $items      = $input['items'] ?? []; // [{product_id, category_id, quantity, price}]

    if ($order_id <= 0 || empty($items)) {
        json_out(["status" => false, "message" => "Missing order_id or items"], 422);
    }

    $stmt = $pdo->prepare("
        INSERT INTO order_items (order_id, product_id, category_id, quantity, price)
        VALUES (?, ?, ?, ?, ?)
    ");

    $successCount = 0;
    foreach ($items as $it) {
        $product_id  = intval($it['product_id'] ?? 0);
        $category_id = isset($it['category_id']) ? intval($it['category_id']) : null;
        $quantity    = intval($it['quantity'] ?? 1);
        $price       = floatval($it['price'] ?? 0);

        if ($product_id > 0) {
            if ($stmt->execute([$order_id, $product_id, $category_id, $quantity, $price])) {
                $successCount++;
            }
        }
    }

    json_out([
        "status" => true,
        "message" => "Order items added successfully",
        "items_added" => $successCount
    ], 201);
}

// 🔹 GET: Fetch items for a specific order
if ($method === 'GET') {
    $order_id = intval($_GET['order_id'] ?? 0);

    if ($order_id <= 0) {
        json_out(["status" => false, "message" => "Missing order_id"], 422);
    }

    $sql = "
        SELECT 
            oi.id,
            oi.order_id,
            oi.product_id,
            p.name AS product_name,
            p.brand,
            p.sku,
            p.mrp,
            p.wholesale_rate,
            oi.quantity,
            oi.price,
            c.name AS category_name
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE oi.order_id = ?
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([$order_id]);
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

    json_out([
        "status" => true,
        "order_id" => $order_id,
        "total_items" => count($items),
        "data" => $items
    ]);
}

json_out(["status" => false, "message" => "Invalid request method"], 405);
?>
