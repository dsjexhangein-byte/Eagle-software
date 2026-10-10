<?php
declare(strict_types=1);

/**
 * CLI Cron Job Script for Payment Reconciliation
 * Scheduled via cPanel Cron Jobs, e.g.:
 * *\/15 * * * * /usr/local/bin/php -q /home/USER/public_html/cron/reconcile.php >> /home/USER/cron.log 2>&1
 */

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    die('Forbidden: CLI only.');
}

// Universal Base Path for cron execution
$baseDir = file_exists(__DIR__ . '/../config/config.php') ? dirname(__DIR__) : (file_exists(__DIR__ . '/config/config.php') ? __DIR__ : dirname(__DIR__));

if (!file_exists($baseDir . '/config/config.php')) {
    echo "EaglePay configuration not found. Please install the application first.\n";
    exit(1);
}

require_once $baseDir . '/config/config.php';
require_once $baseDir . '/src/Services/SignatureService.php';
require_once $baseDir . '/src/Contracts/PaymentGatewayInterface.php';
require_once $baseDir . '/src/Gateways/EaglePayAdapter.php';

$pdo = new PDO(
    "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
    DB_USER,
    DB_PASS,
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
);

echo "[" . date('Y-m-d H:i:s') . "] Starting Payment Reconciliation Cron Run...\n";

// Find links pending for over 3 minutes and under 72 hours
$stmt = $pdo->prepare("
    SELECT pl.*, ga.mch_id, ga.mch_key, ga.base_url, ga.trade_type
    FROM payment_links pl
    JOIN gateway_accounts ga ON pl.gateway_account_id = ga.id
    WHERE pl.status = 'PENDING'
      AND pl.created_at >= DATE_SUB(NOW(), INTERVAL 72 HOUR)
    LIMIT 50
");
$stmt->execute();
$pendingLinks = $stmt->fetchAll();

echo "Found " . count($pendingLinks) . " pending links to reconcile.\n";

$adapter = new \App\Gateways\EaglePayAdapter();

foreach ($pendingLinks as $link) {
    $adapter->configure([
        'mch_id' => $link['mch_id'],
        'mch_key' => $link['mch_key'],
        'base_url' => $link['base_url'],
        'trade_type' => $link['trade_type'],
    ]);

    $query = $adapter->queryPaymentStatus($link['merchant_order_no']);

    if ($query['success'] && in_array($query['status'], ['SUCCESS', 'FAILED'])) {
        $newStatus = $query['status'];
        echo "Updating link {$link['token']} to {$newStatus}...\n";

        $up = $pdo->prepare("
            UPDATE payment_links
            SET status = :status,
                paid_at = :paid_at,
                updated_at = NOW()
            WHERE id = :id AND status = 'PENDING'
        ");
        $up->execute([
            ':status' => $newStatus,
            ':paid_at' => ($newStatus === 'SUCCESS') ? date('Y-m-d H:i:s') : null,
            ':id' => $link['id'],
        ]);

        // Insert history
        $hist = $pdo->prepare("
            INSERT INTO payment_status_history (id, payment_link_id, previous_status, new_status, source, reason, actor)
            VALUES (:id, :link_id, 'PENDING', :new_status, 'CRON_RECONCILE', 'Cron reconciliation checked gateway', 'cPanel Cron')
        ");
        $hist->execute([
            ':id' => bin2hex(random_bytes(16)),
            ':link_id' => $link['id'],
            ':new_status' => $newStatus,
        ]);
    }
}

echo "[" . date('Y-m-d H:i:s') . "] Reconciliation complete.\n";
