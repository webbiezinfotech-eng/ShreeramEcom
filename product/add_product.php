<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../common.php';

header('Content-Type: application/json');

try {
    $pdo = db();

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(["error" => "Method Not Allowed"]);
        exit;
    }

    $name           = $_POST['name'] ?? null;
    $sku            = $_POST['sku'] ?? null;
    $brand          = $_POST['brand'] ?? null;
    $dimensions     = $_POST['dimensions'] ?? null;
    $mrp            = $_POST['mrp'] ?? null;
    $wholesale_rate = $_POST['wholesale_rate'] ?? null;
    $stock          = $_POST['stock'] ?? 0;
    $description    = $_POST['description'] ?? null;
    $category_id    = $_POST['category_id'] ?? null;
    $status         = $_POST['status'] ?? 'active';
    $currency       = 'INR';

    if (!$name || !$mrp || !$wholesale_rate || !$category_id) {
        http_response_code(400);
        echo json_encode(["error" => "Missing required fields"]);
        exit;
    }

    // check sku duplicate
    if ($sku) {
        $stmt = $pdo->prepare("SELECT id FROM products WHERE sku = ?");
        $stmt->execute([$sku]);
        if ($stmt->fetch()) {
            http_response_code(400);
            echo json_encode(["error" => "SKU already exists"]);
            exit;
        }
    }

    // image upload
    $imagePath = null;
    if (!empty($_FILES['image']['tmp_name'])) {
        $uploadDir = __DIR__ . '/../../uploads/products/';
        if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);

        $ext = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
        $filename = uniqid('prod_', true) . "." . $ext;
        $target = $uploadDir . $filename;

        if (move_uploaded_file($_FILES['image']['tmp_name'], $target)) {
            $imagePath = "uploads/products/" . $filename;
        }
    }

    $stmt = $pdo->prepare("
        INSERT INTO products
        (category_id, name, sku, brand, dimensions, mrp, wholesale_rate, stock, image, description, currency, status)
        VALUES
        (:category_id, :name, :sku, :brand, :dimensions, :mrp, :wholesale_rate, :stock, :image, :description, :currency, :status)
    ");

    $stmt->execute([
        ':category_id'    => $category_id,
        ':name'           => $name,
        ':sku'            => $sku,
        ':brand'          => $brand,
        ':dimensions'     => $dimensions,
        ':mrp'            => $mrp,
        ':wholesale_rate' => $wholesale_rate,
        ':stock'          => $stock,
        ':image'          => $imagePath,
        ':description'    => $description,
        ':currency'       => $currency,
        ':status'         => $status
    ]);

    echo json_encode([
        "success" => true,
        "message" => "Product added successfully",
        "product_id" => $pdo->lastInsertId()
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
