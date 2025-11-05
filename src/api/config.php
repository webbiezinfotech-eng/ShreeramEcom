<?php
// api/config.php

// --- Global CORS headers (you can keep this for safety) ---
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Api-Key");

// --- Database Credentials ---
// LOCAL DEVELOPMENT
// const DB_HOST = '148.222.53.10';
// const DB_PORT = 3306;
// const DB_NAME = 'u723435472_shreeram_ecom';
// const DB_USER = 'u723435472_shreeram_ecom';
// const DB_PASS = 'shreeram@Store123';

// PRODUCTION SERVER - Update these with your server details
const DB_HOST = 'localhost';           // Server database host
const DB_PORT = 3306;                  // Server database port
const DB_NAME = 'u723435472_shreeram_ecom';      // Server database name
const DB_USER = 'root';        // Server database username
const DB_PASS = '';    // Server database password

// --- CORS and Security ---
// LOCAL DEVELOPMENT
// const CORS_ALLOW_ORIGINS = 'http://localhost:5173,http://localhost:5174,http://localhost:3000,http://localhost:5175,https://shreeram.webbiezinfotech.in';

// PRODUCTION SERVER - Update with your domain
const CORS_ALLOW_ORIGINS = 'https://shreeram.webbiezinfotech.in/,http://shreeram.webbiezinfotech.in/';
const API_KEY = 'SHREERAMstore';

// --- Upload limit in MB ---
const MAX_UPLOAD_MB = 5;
?>
