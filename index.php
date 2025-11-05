<?php
// api/index.php - Main API entry point
require_once __DIR__ . '/common.php';
require_once __DIR__ . '/db.php';

// Get the requested endpoint
$request_uri = $_SERVER['REQUEST_URI'] ?? '';
$path = parse_url($request_uri, PHP_URL_PATH);

// Remove leading slash and 'api' if present
$path = ltrim($path, '/');
if (strpos($path, 'api/') === 0) {
    $path = substr($path, 4);
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
        json_out(['error' => 'Endpoint not found: ' . $path], 404);
}
?> 