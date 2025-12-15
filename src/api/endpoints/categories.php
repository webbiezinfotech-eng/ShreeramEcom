<?php
// api/endpoints/categories.php
declare(strict_types=1);
require_once __DIR__ . '/../common.php';
require_once __DIR__ . '/../db.php';
require_api_key();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
// Handle FormData with _method override (for PUT via POST)
if ($method === 'POST' && isset($_POST['_method'])) {
    $method = strtoupper($_POST['_method']);
}
$pdo = db();

// Handle file upload for category image
function handleCategoryImageUpload($categoryId = null) {
    if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
        return null;
    }
    
    $file = $_FILES['image'];
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, ['jpg','jpeg','png','webp'])) {
        return null;
    }
    if ($file['size'] > (MAX_UPLOAD_MB*1024*1024)) {
        return null;
    }
    
    $safe = bin2hex(random_bytes(12)) . '.' . $ext;
    $dest = __DIR__ . '/../uploads/' . $safe;
    
    if (move_uploaded_file($file['tmp_name'], $dest)) {
        return $safe;
    }
    return null;
}

if ($method === 'GET') {
    if (isset($_GET['id'])) {
        $stmt = $pdo->prepare('SELECT * FROM categories WHERE id=?');
        $stmt->execute([(int)$_GET['id']]);
        $row = $stmt->fetch();
        if (!$row) json_out(['error'=>'not_found'], 404);
        json_out($row);
    } else {
        // Filter: Only show active categories for website, show all for admin
        $includeInactive = isset($_GET['include_inactive']) && $_GET['include_inactive'] === '1';
        if ($includeInactive) {
            // Admin panel - show all categories
            $stmt = $pdo->query('SELECT * FROM categories ORDER BY name ASC');
        } else {
            // Website - only show active categories
            $stmt = $pdo->query("SELECT * FROM categories WHERE status = 'active' ORDER BY name ASC");
        }
        json_out(['items'=>$stmt->fetchAll()]);
    }
} elseif ($method === 'POST') {
    // Handle both FormData and JSON
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    $isMultipart = strpos($contentType, 'multipart/form-data') !== false || !empty($_POST);
    
    if ($isMultipart) {
        $data = $_POST ?: [];
        $imageFilename = handleCategoryImageUpload();
    } else {
        $data = body_json();
        $imageFilename = null;
    }
    
    require_fields($data, ['name']);
    
    $categoryName = trim($data['name']);
    
    // Check if category with same name already exists
    $checkNameStmt = $pdo->prepare('SELECT id, slug, image FROM categories WHERE name = ? LIMIT 1');
    $checkNameStmt->execute([$categoryName]);
    $existingCategory = $checkNameStmt->fetch();
    
    if ($existingCategory) {
        // Category exists - UPDATE it instead of creating duplicate
        $existingId = $existingCategory['id'];
        $existingSlug = $existingCategory['slug'];
        $existingImage = $existingCategory['image'];
        
        // Generate slug if not provided
        $slug = $data['slug'] ?? null;
        if (!$slug) {
            $slug = $existingSlug; // Keep existing slug if not provided
        }
        
        // Build update query
        $updateFields = [];
        $updateValues = [];
        
        $updateFields[] = 'name = ?';
        $updateValues[] = $categoryName;
        
        if ($slug && $slug !== $existingSlug) {
            // Check for duplicate slug (excluding current record)
            $originalSlug = $slug;
            $counter = 1;
            while (true) {
                $checkSlugStmt = $pdo->prepare('SELECT id FROM categories WHERE slug = ? AND id != ?');
                $checkSlugStmt->execute([$slug, $existingId]);
                if (!$checkSlugStmt->fetch()) {
                    break; // Slug is unique
                }
                $slug = $originalSlug . '-' . $counter;
                $counter++;
            }
            $updateFields[] = 'slug = ?';
            $updateValues[] = $slug;
        }
        
        // Update image if provided
        if ($imageFilename !== null) {
            // Delete old image file if exists
            if ($existingImage && file_exists(__DIR__ . '/../uploads/' . $existingImage)) {
                @unlink(__DIR__ . '/../uploads/' . $existingImage);
            }
            $updateFields[] = 'image = ?';
            $updateValues[] = $imageFilename;
        }
        
        // Update status if provided (always update status if provided in request)
        if (isset($data['status']) && in_array($data['status'], ['active', 'inactive'])) {
            $updateFields[] = 'status = ?';
            $updateValues[] = $data['status'];
        }
        
        // If no fields to update, return error
        if (empty($updateFields)) {
            json_out(['error'=>'no_fields_to_update'], 422);
            exit;
        }
        
        $updateValues[] = $existingId;
        $sql = 'UPDATE categories SET ' . implode(', ', $updateFields) . ' WHERE id=?';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($updateValues);
        
        // Fetch updated category to return complete data
        $fetchStmt = $pdo->prepare('SELECT * FROM categories WHERE id=?');
        $fetchStmt->execute([$existingId]);
        $updatedCategory = $fetchStmt->fetch();
        
        json_out(['id'=>$existingId, 'slug'=>$slug ?? $existingSlug, 'image'=>$imageFilename ?? $existingImage, 'status'=>$updatedCategory['status'] ?? 'active', 'updated'=>true], 200);
    } else {
        // Category doesn't exist - CREATE new one
        // Generate unique slug if not provided
        $slug = $data['slug'] ?? null;
        if (!$slug) {
            $slug = strtolower(trim(preg_replace('/[^a-zA-Z0-9\s-]/', '', $categoryName)));
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
        
        // Default status is 'active'
        $status = isset($data['status']) && in_array($data['status'], ['active', 'inactive']) ? $data['status'] : 'active';
        $stmt = $pdo->prepare('INSERT INTO categories (name, slug, image, status) VALUES (?,?,?,?)');
        $stmt->execute([$categoryName, $slug, $imageFilename, $status]);
        json_out(['id'=>$pdo->lastInsertId(), 'slug'=>$slug, 'image'=>$imageFilename, 'status'=>$status, 'created'=>true], 201);
    }
} elseif ($method === 'PUT') {
    if (!isset($_GET['id'])) json_out(['error'=>'missing_id'], 422);
    $id = (int)$_GET['id'];
    
    // Handle both FormData and JSON
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    $isMultipart = strpos($contentType, 'multipart/form-data') !== false || !empty($_POST);
    
    if ($isMultipart) {
        $data = $_POST ?: [];
        // Remove _method from data if present
        if (isset($data['_method'])) {
            unset($data['_method']);
        }
        $imageFilename = handleCategoryImageUpload($id);
    } else {
        $data = body_json();
        $imageFilename = null;
    }
    
    // Generate unique slug if not provided or if duplicate
    $slug = $data['slug'] ?? null;
    if (!$slug && isset($data['name'])) {
        $slug = strtolower(trim(preg_replace('/[^a-zA-Z0-9\s-]/', '', $data['name'])));
        $slug = preg_replace('/\s+/', '-', $slug);
        $slug = trim($slug, '-');
    }
    
    // Check for duplicate slug and make it unique (excluding current record)
    if ($slug) {
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
    }
    
    // Build update query dynamically
    $updateFields = [];
    $updateValues = [];
    
    if (isset($data['name'])) {
        $updateFields[] = 'name = ?';
        $updateValues[] = trim($data['name']);
    }
    if ($slug) {
        $updateFields[] = 'slug = ?';
        $updateValues[] = $slug;
    }
    if ($imageFilename !== null) {
        $updateFields[] = 'image = ?';
        $updateValues[] = $imageFilename;
    }
    // Always update status if provided
    if (isset($data['status']) && in_array($data['status'], ['active', 'inactive'])) {
        $updateFields[] = 'status = ?';
        $updateValues[] = $data['status'];
    }
    
    if (empty($updateFields)) {
        json_out(['error'=>'no_fields_to_update'], 422);
        exit;
    }
    
    $updateValues[] = $id;
    $sql = 'UPDATE categories SET ' . implode(', ', $updateFields) . ' WHERE id=?';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($updateValues);
    
    // Fetch updated category to return complete data
    $fetchStmt = $pdo->prepare('SELECT * FROM categories WHERE id=?');
    $fetchStmt->execute([$id]);
    $updatedCategory = $fetchStmt->fetch();
    
    json_out(['ok'=>true, 'slug'=>$slug ?? null, 'image'=>$imageFilename, 'status'=>$updatedCategory['status'] ?? 'active']);
} elseif ($method === 'DELETE') {
    if (!isset($_GET['id'])) json_out(['error'=>'missing_id'], 422);
    $pdo->prepare('DELETE FROM categories WHERE id=?')->execute([(int)$_GET['id']]);
    json_out(['ok'=>true]);
} else {
    json_out(['error'=>'method_not_allowed'], 405);
}
