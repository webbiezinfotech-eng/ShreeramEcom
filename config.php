<?php
// api/config.php

// --- Global CORS headers (you can keep this for safety) ---
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Api-Key, x-api-key, Origin, Accept");

// --- Database Credentials ---
// PRODUCTION SERVER
// const DB_HOST = '148.222.53.10';
// const DB_PORT = 3306;
// const DB_NAME = 'u723435472_shreeram_ecom';
// const DB_USER = 'u723435472_shreeram_ecom';
// const DB_PASS = 'shreeram@Store123';

// LOCAL DEVELOPMENT (XAMPP - use 127.0.0.1 to force TCP/IP connection)
const DB_HOST = '127.0.0.1';
const DB_PORT = 3306;
const DB_NAME = 'u723435472_shreeram_ecom';
const DB_USER = 'root';
const DB_PASS = '';

// --- CORS and Security ---
// PRODUCTION SERVER
// const CORS_ALLOW_ORIGINS = 'https://shreeram.webbiezinfotech.in,http://shreeram.webbiezinfotech.in';

// LOCAL DEVELOPMENT
const CORS_ALLOW_ORIGINS = 'http://localhost:5173,http://localhost:5174,http://localhost:3000,http://localhost:5175,https://shreeram.webbiezinfotech.in';
const API_KEY = 'SHREERAMstore';

// --- Upload limit in MB ---
const MAX_UPLOAD_MB = 5;
?>
