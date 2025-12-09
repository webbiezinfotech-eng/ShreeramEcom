<?php
// api/common.php
declare(strict_types=1);
require_once __DIR__ . '/config.php';

// CORS Headers - Set these first before any output
// Get the origin from the request
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';

// List of allowed origins for local development
$allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://localhost:5175',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:3000',
    'http://192.168.1.6:5173',
    'http://192.168.1.6:5174',
    'http://192.168.1.6:3000',
    'https://shreeram.webbiezinfotech.in',
    'http://shreeram.webbiezinfotech.in'
];

// Set allowed origin
if (in_array($origin, $allowedOrigins)) {
    header('Access-Control-Allow-Origin: ' . $origin);
} else {
    header('Access-Control-Allow-Origin: *');
}

header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Api-Key, x-api-key, Origin, Accept, Cache-Control, Pragma, Expires');
header('Access-Control-Allow-Credentials: false');
header('Access-Control-Max-Age: 86400');
header('Content-Type: application/json; charset=utf-8');

// Handle preflight OPTIONS request
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { 
    http_response_code(200); 
    exit; 
}

function json_out($data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
    exit;
}

// API key check (skip for public endpoints if you add any later)
function require_api_key(): void {
    // Check multiple sources: Header, GET params, POST data (for FormData)
    $key = $_SERVER['HTTP_X_API_KEY'] ?? ($_GET['api_key'] ?? ($_POST['api_key'] ?? ''));
    if (!$key || !hash_equals(API_KEY, $key)) {
        json_out(['error' => 'unauthorized'], 401);
    }
}

function body_json(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function require_fields(array $arr, array $fields): void {
    foreach ($fields as $f) {
        if (!isset($arr[$f]) || $arr[$f] === '') json_out(['error'=>"missing_field:$f"], 422);
    }
}
