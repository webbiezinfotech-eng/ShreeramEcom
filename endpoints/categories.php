<?php
// api/endpoints/categories.php
declare(strict_types=1);
require_once __DIR__ . '/../common.php';
require_once __DIR__ . '/../db.php';
require_api_key();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$pdo = db();

if ($method === 'GET') {
    if (isset($_GET['id'])) {
        $stmt = $pdo->prepare('SELECT * FROM categories WHERE id=?');
        $stmt->execute([(int)$_GET['id']]);
        $row = $stmt->fetch();
        if (!$row) json_out(['error'=>'not_found'], 404);
        json_out($row);
    } else {
        $stmt = $pdo->query('SELECT * FROM categories ORDER BY name ASC');
        json_out(['items'=>$stmt->fetchAll()]);
    }
} elseif ($method === 'POST') {
    $data = body_json();
    require_fields($data, ['name']);
    
    // Generate unique slug if not provided or if duplicate
    $slug = $data['slug'] ?? null;
    if (!$slug) {
        $slug = strtolower(trim(preg_replace('/[^a-zA-Z0-9\s-]/', '', $data['name'])));
        $slug = preg_replace('/\s+/', '-', $slug);
        $slug = trim($slug, '-');
    }
    
    // Check for duplicate slug and make it unique
    $originalSlug = $slug;
    $counter = 1;
    while (true) {
        $checkStmt = $pdo->prepare('SELECT id FROM categories WHERE slug = ?');
        $checkStmt->execute([$slug]);
        if (!$checkStmt->fetch()) {
            break; // Slug is unique
        }
        $slug = $originalSlug . '-' . $counter;
        $counter++;
    }
    
    $stmt = $pdo->prepare('INSERT INTO categories (name, slug) VALUES (?,?)');
    $stmt->execute([trim($data['name']), $slug]);
    json_out(['id'=>$pdo->lastInsertId(), 'slug'=>$slug], 201);
} elseif ($method === 'PUT') {
    if (!isset($_GET['id'])) json_out(['error'=>'missing_id'], 422);
    $id = (int)$_GET['id'];
    $data = body_json();
    
    // Generate unique slug if not provided or if duplicate
    $slug = $data['slug'] ?? null;
    if (!$slug) {
        $slug = strtolower(trim(preg_replace('/[^a-zA-Z0-9\s-]/', '', $data['name'])));
        $slug = preg_replace('/\s+/', '-', $slug);
        $slug = trim($slug, '-');
    }
    
    // Check for duplicate slug and make it unique (excluding current record)
    $originalSlug = $slug;
    $counter = 1;
    while (true) {
        $checkStmt = $pdo->prepare('SELECT id FROM categories WHERE slug = ? AND id != ?');
        $checkStmt->execute([$slug, $id]);
        if (!$checkStmt->fetch()) {
            break; // Slug is unique
        }
        $slug = $originalSlug . '-' . $counter;
        $counter++;
    }
    
    $stmt = $pdo->prepare('UPDATE categories SET name=?, slug=? WHERE id=?');
    $stmt->execute([trim($data['name'] ?? ''), $slug, $id]);
    json_out(['ok'=>true, 'slug'=>$slug]);
} elseif ($method === 'DELETE') {
    if (!isset($_GET['id'])) json_out(['error'=>'missing_id'], 422);
    $pdo->prepare('DELETE FROM categories WHERE id=?')->execute([(int)$_GET['id']]);
    json_out(['ok'=>true]);
} else {
    json_out(['error'=>'method_not_allowed'], 405);
}
