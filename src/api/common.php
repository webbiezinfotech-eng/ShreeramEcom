<?php
// api/common.php
declare(strict_types=1);
require_once __DIR__ . '/config.php';

// CORS Headers - Set these first before any output
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Api-Key, x-api-key, Origin, Accept');
header('Access-Control-Allow-Credentials: true');
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
