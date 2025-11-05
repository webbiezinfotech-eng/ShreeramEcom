<?php
// api/index.php - Main API router
$request_uri = $_SERVER['REQUEST_URI'] ?? '';
$path = parse_url($request_uri, PHP_URL_PATH);

// Remove leading slash
$path = ltrim($path, '/');

// Remove 'api/' prefix if present
if (strpos($path, 'api/') === 0) {
    $path = substr($path, 4);
}

// Handle empty path or root
if (empty($path) || $path === 'index.php') {
    require_once __DIR__ . '/common.php';
    json_out(['message' => 'Shreeram API Server', 'version' => '1.0'], 200);
    exit;
}

// Handle uploads folder requests (serve images and files)
if (strpos($path, 'uploads/') === 0) {
    $filePath = __DIR__ . '/' . $path;
    if (file_exists($filePath) && is_file($filePath)) {
        $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
        $mimeTypes = [
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'webp' => 'image/webp'
        ];
        
        if (isset($mimeTypes[$ext])) {
            header('Content-Type: ' . $mimeTypes[$ext]);
            header('Content-Length: ' . filesize($filePath));
            readfile($filePath);
            exit;
        }
    }
}

// Handle direct file requests (like product/get_products.php, endpoints/cart.php)
if (file_exists(__DIR__ . '/' . $path) && $path !== 'index.php') {
    require_once __DIR__ . '/' . $path;
    exit;
}

// Route to appropriate endpoint
switch ($path) {
    case 'endpoints/products.php':
    case 'products':
        require_once __DIR__ . '/endpoints/products.php';
        break;
        
    case 'endpoints/orders.php':
    case 'orders':
        require_once __DIR__ . '/endpoints/orders.php';
        break;
        
    case 'endpoints/categories.php':
    case 'categories':
        require_once __DIR__ . '/endpoints/categories.php';
        break;
        
    case 'endpoints/customers.php':
    case 'customers':
        require_once __DIR__ . '/endpoints/customers.php';
        break;
        
    case 'endpoints/cart.php':
    case 'cart':
        require_once __DIR__ . '/endpoints/cart.php';
        break;
        
    case 'endpoints/upload.php':
    case 'upload':
        require_once __DIR__ . '/endpoints/upload.php';
        break;
        
    case 'endpoints/dashboard_recent_customers.php':
    case 'dashboard_recent_customers':
        require_once __DIR__ . '/endpoints/dashboard_recent_customers.php';
        break;
        
    case 'endpoints/dashboard_top_products.php':
    case 'dashboard_top_products':
        require_once __DIR__ . '/endpoints/dashboard_top_products.php';
        break;
        
    default:
        // If still not found, try to load common.php and show error
        if (file_exists(__DIR__ . '/common.php')) {
            require_once __DIR__ . '/common.php';
            json_out(['error' => 'Endpoint not found: ' . $path], 404);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Endpoint not found: ' . $path]);
        }
}
?> 