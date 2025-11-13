<?php
// order_items.php — Manage order items (create + fetch)
require_once '../cors.php';
require_once '../db.php';

header('Content-Type: application/json');

function respond($data) {
    echo json_encode($data);
    exit;
}

// 🔹 POST: Create order items (when an order is placed)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    $order_id   = intval($input['order_id'] ?? 0);
    $items      = $input['items'] ?? []; // [{product_id, category_id, quantity, price}]

    if ($order_id <= 0 || empty($items)) {
        respond(["status" => false, "message" => "Missing order_id or items"]);
    }

    $insertQuery = $conn->prepare("
        INSERT INTO order_items (order_id, product_id, category_id, quantity, price)
        VALUES (?, ?, ?, ?, ?)
    ");

    $successCount = 0;
    foreach ($items as $it) {
        $product_id  = intval($it['product_id'] ?? 0);
        $category_id = intval($it['category_id'] ?? null);
        $quantity    = intval($it['quantity'] ?? 1);
        $price       = floatval($it['price'] ?? 0);

        if ($product_id > 0) {
            $insertQuery->bind_param("iiiid", $order_id, $product_id, $category_id, $quantity, $price);
            if ($insertQuery->execute()) {
                $successCount++;
            }
        }
    }
    $insertQuery->close();

    respond([
        "status" => true,
        "message" => "Order items added successfully",
        "items_added" => $successCount
    ]);
}


// 🔹 GET: Fetch items for a specific order
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $order_id = intval($_GET['order_id'] ?? 0);

    if ($order_id <= 0) {
        respond(["status" => false, "message" => "Missing order_id"]);
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

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $order_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $items = [];
    while ($row = $result->fetch_assoc()) {
        $items[] = $row;
    }
    $stmt->close();

    respond([
        "status" => true,
        "order_id" => $order_id,
        "total_items" => count($items),
        "data" => $items
    ]);
}

respond(["status" => false, "message" => "Invalid request method"]);
?>
