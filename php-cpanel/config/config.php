<?php
declare(strict_types=1);

// Database configuration for cPanel MySQL
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('DB_NAME') ?: 'eaglepay_db');
define('DB_USER', getenv('DB_USER') ?: 'eaglepay_user');
define('DB_PASS', getenv('DB_PASS') ?: 'YourSecurePasswordHere123!');

// Application Configuration
define('APP_NAME', 'EaglePay Multi-Brand Platform');
define('APP_URL', getenv('APP_URL') ?: 'https://yourdomain.com');
define('APP_SECRET', getenv('APP_SECRET') ?: 'ChangeThisToA32ByteCryptographicSecretKey');
define('DEFAULT_CURRENCY', 'INR');
