<?php
// api-folder/endpoints/dashboard_recent_customers.php
declare(strict_types=1);
require_once __DIR__ . '/../common.php';
require_once __DIR__ . '/../db.php';

require_api_key(); // Header X-API-Key ya ?api_key=... (dev test) se allow

$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 5;
if ($limit < 1 || $limit > 50) $limit = 5;

try {
    $pdo = db();
    // Har customer ka sabse recent order (firm optional)
    $sql = <<<SQL
    SELECT 
        o.customer_id,
        c.name,
        COALESCE(c.firm, '') AS firm,
        o.total_amount AS amount,
        o.status,
        o.created_at
    FROM orders o
    INNER JOIN (
        SELECT customer_id, MAX(created_at) AS max_created
        FROM orders
        GROUP BY customer_id
    ) m ON m.customer_id = o.customer_id AND m.max_created = o.created_at
    INNER JOIN customers c ON c.id = o.customer_id
    ORDER BY o.created_at DESC
    LIMIT :lim
    SQL;

    $stmt = $pdo->prepare($sql);
    $stmt->bindValue(':lim', $limit, \PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);

    json_out(['ok' => true, 'data' => $rows]);
} catch (\Throwable $e) {
    json_out(['ok' => false, 'error' => $e->getMessage()], 500);
}
