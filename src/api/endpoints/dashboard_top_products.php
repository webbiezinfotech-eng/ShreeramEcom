<?php
// api-folder/endpoints/dashboard_top_products.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // dev only
header('Access-Control-Allow-Headers: Content-Type, X-API-Key');
header('Access-Control-Allow-Methods: GET, OPTIONS');

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../common.php';
require_once __DIR__ . '/../db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
require_api_key();

$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 5;
$days  = isset($_GET['days'])  ? (int)$_GET['days']  : 30;

if ($limit < 1 || $limit > 50)   $limit = 5;
if ($days  < 1 || $days  > 3650) $days  = 30;

try {
    $pdo = db(); // red underline VS Code ka linter hai; runtime me function present hai

    // Integers sanitized + bounded => safe to embed
    $sql = "
        SELECT 
            p.id AS product_id,
            p.name,
            COALESCE(c.name, '') AS category,
            SUM(oi.quantity) AS units,
            SUM(oi.quantity * oi.price) AS revenue
        FROM order_items oi
        INNER JOIN orders o   ON o.id = oi.order_id
        INNER JOIN products p ON p.id = oi.product_id
        LEFT  JOIN categories c ON c.id = p.category_id
        WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL $days DAY)
        GROUP BY oi.product_id, p.name, c.name
        ORDER BY units DESC, revenue DESC
        LIMIT $limit
    ";

    $rows = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['ok' => true, 'data' => $rows], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
