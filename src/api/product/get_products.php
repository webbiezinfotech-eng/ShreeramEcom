<?php
// api-folder/product/get_products.php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../common.php';

try {
    $pdo = db(); 
    
    $sql = "SELECT * FROM products ORDER BY created_at DESC";
    $stmt = $pdo->query($sql);
    $rows = $stmt->fetchAll();

    $products = [];
    foreach ($rows as $row) {
        $products[] = [
            "id" => (int)$row["id"],
            "title" => $row["name"], 
            "price" => (float)($row["price"] ?? 0),
            "oldPrice" => (float)($row["price"] ?? 0) + rand(20,100), // dummy discount
            "rating" => round(mt_rand(35, 50) / 10, 1), // random 3.5–5 rating
            "category" => "Category " . $row["category_id"], // agar category table join karna ho to kar sakte ho
            // PRODUCTION SERVER
            "image" => "https://shreeram.webbiezinfotech.in/api/uploads/products/" . ($row["sku"] ?? "default.png"),
            // LOCAL DEVELOPMENT - Use Mac IP for phone testing
            // "image" => "http://192.168.1.6:8000/api/uploads/products/" . ($row["sku"] ?? "default.png"),
            // For Mac browser testing, you can also use: "http://localhost:8000/api/uploads/products/" . ($row["sku"] ?? "default.png")
            "description" => $row["description"],
            "inStock" => ($row["stock"] > 0 && $row["status"] === "active"),
            "brand" => "Generic"
        ];
    }

    echo json_encode($products, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

} catch (Exception $e) {
    echo json_encode([
        "error" => "Database query failed",
        "details" => $e->getMessage()
    ]);
}
