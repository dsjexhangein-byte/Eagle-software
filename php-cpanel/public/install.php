<?php
declare(strict_types=1);

/**
 * CodeCanyon-Style 1-Click Web Installer for EaglePay Multi-Brand System
 * Accessible at https://yourdomain.com/install
 */

session_start();

// Universal Base Directory Resolver
// Supports /home/bhar315841/public_html/ (where files are at root of public_html)
// as well as nested subdirectory setups
function resolveInstallerBasePath(): string {
    if (file_exists(__DIR__ . '/config') || file_exists(__DIR__ . '/database/schema.sql')) {
        return __DIR__;
    }
    if (file_exists(__DIR__ . '/../config') || file_exists(__DIR__ . '/../database/schema.sql')) {
        return dirname(__DIR__);
    }
    return __DIR__;
}

$baseDir = resolveInstallerBasePath();
$step = (int)($_GET['step'] ?? 1);
$configFile = $baseDir . '/config/config.php';
$installedLock = $baseDir . '/config/installed.lock';

// If already installed and not forced
$alreadyInstalled = file_exists($installedLock);

// Handle installation POST action
$error = null;
$success = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    if ($_POST['action'] === 'install') {
        $dbHost = trim($_POST['db_host'] ?? 'localhost');
        $dbName = trim($_POST['db_name'] ?? '');
        $dbUser = trim($_POST['db_user'] ?? '');
        $dbPass = (string)($_POST['db_pass'] ?? '');
        $appUrl = rtrim(trim($_POST['app_url'] ?? ''), '/');
        $adminUser = trim($_POST['admin_user'] ?? 'admin');
        $adminPass = trim($_POST['admin_pass'] ?? 'admin123');
        $adminEmail = trim($_POST['admin_email'] ?? 'admin@eaglepay.local');
        $adminName = trim($_POST['admin_name'] ?? 'Super Administrator');

        if (empty($dbName) || empty($dbUser)) {
            $error = 'MySQL Database Name and Database Username are required.';
        } elseif (empty($adminUser) || empty($adminPass)) {
            $error = 'Admin Username and Password are required.';
        } else {
            try {
                // Test PDO connection
                $dsn = "mysql:host={$dbHost};dbname={$dbName};charset=utf8mb4";
                $pdo = new PDO($dsn, $dbUser, $dbPass, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                ]);

                // Read and execute schema.sql
                $schemaFile = $baseDir . '/database/schema.sql';
                if (!file_exists($schemaFile)) {
                    throw new Exception("schema.sql not found at " . $schemaFile);
                }

                $sql = file_get_contents($schemaFile);
                
                // Execute schema statements
                $pdo->exec($sql);

                // Add or update super admin
                // Check if admins table has this user
                $salt = bin2hex(random_bytes(16));
                $hash = hash_pbkdf2('sha512', $adminPass, $salt, 10000, 128);
                $adminId = 'adm_' . bin2hex(random_bytes(6));

                // Delete previous admin with same username if any
                $del = $pdo->prepare("DELETE FROM admins WHERE username = :u OR email = :e");
                $del->execute([':u' => $adminUser, ':e' => $adminEmail]);

                $ins = $pdo->prepare("
                    INSERT INTO admins (id, username, email, password_hash, salt, name, role, is_active, created_at, updated_at)
                    VALUES (:id, :u, :e, :hash, :salt, :name, 'super_admin', 1, NOW(), NOW())
                ");
                $ins->execute([
                    ':id' => $adminId,
                    ':u' => $adminUser,
                    ':e' => $adminEmail,
                    ':hash' => $hash,
                    ':salt' => $salt,
                    ':name' => $adminName,
                ]);

                // Create or update notice_templates table if not created
                $pdo->exec("
                    CREATE TABLE IF NOT EXISTS `notice_templates` (
                      `id` VARCHAR(36) NOT NULL,
                      `name` VARCHAR(100) NOT NULL,
                      `category` VARCHAR(50) NOT NULL DEFAULT 'SETTLEMENT',
                      `body` TEXT NOT NULL,
                      `is_default` TINYINT(1) NOT NULL DEFAULT 0,
                      `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                      `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                      PRIMARY KEY (`id`)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                ");

                // Create system_settings table if not created
                $pdo->exec("
                    CREATE TABLE IF NOT EXISTS `system_settings` (
                      `key_name` VARCHAR(60) NOT NULL,
                      `value_json` MEDIUMTEXT NOT NULL,
                      `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                      PRIMARY KEY (`key_name`)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                ");

                // Ensure columns exist on payment_links and customers
                $alterCols = [
                    "ALTER TABLE `payment_links` ADD COLUMN `loan_order_number` VARCHAR(100) NULL",
                    "ALTER TABLE `payment_links` ADD COLUMN `repayment_date` VARCHAR(60) NULL",
                    "ALTER TABLE `payment_links` ADD COLUMN `pan_number` VARCHAR(30) NULL",
                    "ALTER TABLE `payment_links` ADD COLUMN `bank_account` VARCHAR(60) NULL",
                    "ALTER TABLE `payment_links` ADD COLUMN `executive_name` VARCHAR(100) NULL",
                    "ALTER TABLE `customers` ADD COLUMN `pan_number` VARCHAR(30) NULL",
                    "ALTER TABLE `customers` ADD COLUMN `bank_account` VARCHAR(60) NULL",
                    "ALTER TABLE `customers` ADD COLUMN `executive_name` VARCHAR(100) NULL",
                ];
                foreach ($alterCols as $alterSql) {
                    try { $pdo->exec($alterSql); } catch (\Throwable $e) {}
                }

                // Seed default notice template if empty
                $cnt = $pdo->query("SELECT COUNT(*) FROM notice_templates")->fetchColumn();
                if ($cnt == 0) {
                    $defaultNotice = "BAIJAYANTI CHHURA,\n\nTo stop the field agents and clear your record, pay your ONE-TIME SETTLEMENT of INR {{amount}}/- immediately using this link:\n👉 {{payment_link}}\n\nYour ArspLoan account (Order NO: {{order_no}}) is severely overdue. We have approved a final settlement amount of INR {{amount}}/- for today only.\n\nIf this settlement is not cleared in the next 1 hour, the offer will be cancelled and the following actions will begin:\n\nCIBIL Defaulter Entry: Your PAN (DOJPC3710R) and [Aadhaar Redacted] details will be permanently reported as a defaulter, blocking your access to any future loans or credit cards.\nField Recovery Visit: Our collection agents will be dispatched directly to your registered home address for physical cash collection of the full original penalty amount.\n\nClear your settlement dues right now to permanently close this account and receive your NOC.\n\nRecovery Department\nArspLoan Financial Services";
                    $tplStmt = $pdo->prepare("INSERT INTO notice_templates (id, name, category, body, is_default) VALUES ('tpl_settlement_default', 'Urgent Field Settlement Notice', 'SETTLEMENT', :body, 1)");
                    $tplStmt->execute([':body' => $defaultNotice]);
                }

                // Seed default gateway account if empty
                $cntGw = $pdo->query("SELECT COUNT(*) FROM gateway_accounts")->fetchColumn();
                if ($cntGw == 0) {
                    $pdo->exec("
                        INSERT INTO gateway_accounts (id, name, adapter, mch_id, mch_key, base_url, is_sandbox, trade_type, notify_url, return_url, is_active, created_at, updated_at)
                        VALUES ('gw_eaglepay_live', 'Eagle Pay Live Primary', 'eaglepay', 'MCH1008291', '7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f', 'https://xgxbscfgfhtiizzxipog.supabase.co/functions/v1', 0, 'INRUPI', 'https://example.com/webhooks/eaglepay', 'https://example.com/status', 1, NOW(), NOW())
                    ");
                }

                // Write config/config.php
                $appSecret = bin2hex(random_bytes(32));
                $configContent = "<?php\ndeclare(strict_types=1);\n\n// Database configuration generated by Web Installer\ndefine('DB_HOST', " . var_export($dbHost, true) . ");\ndefine('DB_NAME', " . var_export($dbName, true) . ");\ndefine('DB_USER', " . var_export($dbUser, true) . ");\ndefine('DB_PASS', " . var_export($dbPass, true) . ");\n\n// Application Settings\ndefine('APP_NAME', 'EaglePay Multi-Brand Platform');\ndefine('APP_URL', " . var_export($appUrl ?: 'https://' . ($_SERVER['HTTP_HOST'] ?? 'localhost'), true) . ");\ndefine('APP_SECRET', " . var_export($appSecret, true) . ");\ndefine('DEFAULT_CURRENCY', 'INR');\n";

                if (!is_dir(dirname($configFile))) {
                    mkdir(dirname($configFile), 0755, true);
                }
                file_put_contents($configFile, $configContent);

                // Create installed.lock
                file_put_contents($installedLock, json_encode([
                    'installed_at' => date('c'),
                    'app_url' => $appUrl,
                    'db_name' => $dbName,
                    'admin_user' => $adminUser,
                ], JSON_PRETTY_PRINT));

                // Redirect to success step
                header('Location: /install?step=4');
                exit;
            } catch (\Throwable $e) {
                $error = 'Database Setup Error: ' . $e->getMessage();
            }
        }
    }
}

// System Requirements checks
$requirements = [
    'PHP Version >= 8.1' => [
        'status' => version_compare(PHP_VERSION, '8.1.0', '>='),
        'current' => PHP_VERSION,
        'required' => '>= 8.1.0',
    ],
    'PDO Extension' => [
        'status' => extension_loaded('pdo'),
        'current' => extension_loaded('pdo') ? 'Enabled' : 'Missing',
        'required' => 'Enabled',
    ],
    'PDO MySQL Extension' => [
        'status' => extension_loaded('pdo_mysql'),
        'current' => extension_loaded('pdo_mysql') ? 'Enabled' : 'Missing',
        'required' => 'Enabled',
    ],
    'cURL Extension' => [
        'status' => extension_loaded('curl'),
        'current' => extension_loaded('curl') ? 'Enabled' : 'Missing',
        'required' => 'Enabled',
    ],
    'OpenSSL Extension' => [
        'status' => extension_loaded('openssl'),
        'current' => extension_loaded('openssl') ? 'Enabled' : 'Missing',
        'required' => 'Enabled',
    ],
    'JSON Extension' => [
        'status' => extension_loaded('json'),
        'current' => extension_loaded('json') ? 'Enabled' : 'Missing',
        'required' => 'Enabled',
    ],
    'mbstring Extension' => [
        'status' => extension_loaded('mbstring'),
        'current' => extension_loaded('mbstring') ? 'Enabled' : 'Missing',
        'required' => 'Enabled',
    ],
];

// Check permissions
$permissions = [
    'config/ Directory' => [
        'status' => is_writable($baseDir . '/config') || is_writable($baseDir),
        'current' => (is_writable($baseDir . '/config') || is_writable($baseDir)) ? 'Writable (0755/0777)' : 'Not Writable',
        'required' => 'Writable',
    ],
    'Current Web Directory' => [
        'status' => is_writable(__DIR__),
        'current' => is_writable(__DIR__) ? 'Writable' : 'Not Writable',
        'required' => 'Writable',
    ],
];

$allReqsPassed = true;
foreach ($requirements as $r) {
    if (!$r['status']) { $allReqsPassed = false; break; }
}
foreach ($permissions as $p) {
    if (!$p['status']) { $allReqsPassed = false; break; }
}

$detectedUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost');
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EaglePay - 1-Click CodeCanyon Web Installation Wizard</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col justify-between">
  <!-- Header Bar -->
  <header class="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
    <div class="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-teal-500/20">
          <i class="fa-solid fa-bolt"></i>
        </div>
        <div>
          <h1 class="text-base font-bold text-white flex items-center gap-2">
            EaglePay System
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 font-mono uppercase">
              1-Click Installer
            </span>
          </h1>
          <p class="text-xs text-slate-400">cPanel Production Web Setup Wizard</p>
        </div>
      </div>
      <div class="text-xs text-slate-400 hidden sm:block font-mono">
        PHP <?= PHP_VERSION ?>
      </div>
    </div>
  </header>

  <!-- Main Container -->
  <main class="max-w-4xl w-full mx-auto px-4 py-8 flex-1">
    
    <!-- Steps Navigation Tracker -->
    <div class="mb-8 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
      <div class="grid grid-cols-4 gap-2 sm:gap-4 text-center">
        <a href="?step=1" class="flex flex-col sm:flex-row items-center justify-center gap-2 p-2 rounded-xl text-xs font-semibold <?= $step === 1 ? 'bg-teal-500/10 text-teal-400 border border-teal-500/30' : ($step > 1 ? 'text-teal-400' : 'text-slate-500') ?>">
          <span class="w-6 h-6 rounded-full flex items-center justify-center text-[11px] <?= $step >= 1 ? 'bg-teal-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400' ?>">1</span>
          <span>Requirements</span>
        </a>
        <a href="<?= $allReqsPassed ? '?step=2' : '#' ?>" class="flex flex-col sm:flex-row items-center justify-center gap-2 p-2 rounded-xl text-xs font-semibold <?= $step === 2 ? 'bg-teal-500/10 text-teal-400 border border-teal-500/30' : ($step > 2 ? 'text-teal-400' : 'text-slate-500') ?>">
          <span class="w-6 h-6 rounded-full flex items-center justify-center text-[11px] <?= $step >= 2 ? 'bg-teal-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400' ?>">2</span>
          <span>Permissions</span>
        </a>
        <a href="<?= $allReqsPassed ? '?step=3' : '#' ?>" class="flex flex-col sm:flex-row items-center justify-center gap-2 p-2 rounded-xl text-xs font-semibold <?= $step === 3 ? 'bg-teal-500/10 text-teal-400 border border-teal-500/30' : ($step > 3 ? 'text-teal-400' : 'text-slate-500') ?>">
          <span class="w-6 h-6 rounded-full flex items-center justify-center text-[11px] <?= $step >= 3 ? 'bg-teal-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400' ?>">3</span>
          <span>Database &amp; Admin</span>
        </a>
        <span class="flex flex-col sm:flex-row items-center justify-center gap-2 p-2 rounded-xl text-xs font-semibold <?= $step === 4 ? 'bg-teal-500/10 text-teal-400 border border-teal-500/30' : 'text-slate-500' ?>">
          <span class="w-6 h-6 rounded-full flex items-center justify-center text-[11px] <?= $step === 4 ? 'bg-teal-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400' ?>">4</span>
          <span>Complete</span>
        </span>
      </div>
    </div>

    <?php if ($alreadyInstalled && $step !== 4): ?>
      <div class="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start gap-3">
        <i class="fa-solid fa-triangle-exclamation text-lg mt-0.5"></i>
        <div class="text-xs">
          <strong>Notice: System Already Installed!</strong>
          <p class="mt-1 text-slate-300">If you want to re-install or reconfigure, you can still submit the form below or go directly to <a href="/" class="text-teal-400 underline font-semibold">Your Main Dashboard</a>.</p>
        </div>
      </div>
    <?php endif; ?>

    <?php if ($error): ?>
      <div class="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-3">
        <i class="fa-solid fa-circle-xmark text-lg mt-0.5"></i>
        <div class="text-xs">
          <strong>Installation Error</strong>
          <p class="mt-1"><?= htmlspecialchars($error) ?></p>
        </div>
      </div>
    <?php endif; ?>

    <!-- STEP 1: PHP REQUIREMENTS -->
    <?php if ($step === 1): ?>
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div>
          <h2 class="text-lg font-bold text-white flex items-center gap-2">
            <i class="fa-solid fa-server text-teal-400"></i> Step 1: Server Requirements Check
          </h2>
          <p class="text-xs text-slate-400 mt-1">
            Ye installer automatically check kar raha hai ki aapke cPanel hosting pe sari required PHP extensions enable hain ya nahi.
          </p>
        </div>

        <div class="divide-y divide-slate-800/80 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/50">
          <?php foreach ($requirements as $title => $r): ?>
            <div class="p-3.5 flex items-center justify-between text-xs">
              <div class="flex items-center gap-3">
                <?php if ($r['status']): ?>
                  <span class="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs">
                    <i class="fa-solid fa-check"></i>
                  </span>
                <?php else: ?>
                  <span class="w-6 h-6 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center text-xs">
                    <i class="fa-solid fa-xmark"></i>
                  </span>
                <?php endif; ?>
                <div>
                  <div class="font-medium text-slate-200"><?= htmlspecialchars($title) ?></div>
                  <div class="text-[11px] text-slate-500">Required: <?= htmlspecialchars($r['required']) ?></div>
                </div>
              </div>
              <div class="text-right">
                <span class="px-2.5 py-1 rounded-md text-[11px] font-mono <?= $r['status'] ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20' ?>">
                  <?= htmlspecialchars((string)$r['current']) ?>
                </span>
              </div>
            </div>
          <?php endforeach; ?>
        </div>

        <div class="flex items-center justify-between pt-4 border-t border-slate-800">
          <div class="text-xs text-slate-400">
            <?php if ($allReqsPassed): ?>
              <span class="text-emerald-400 font-semibold"><i class="fa-solid fa-circle-check"></i> Sabhi PHP requirements pass ho chuki hain!</span>
            <?php else: ?>
              <span class="text-rose-400 font-semibold"><i class="fa-solid fa-circle-xmark"></i> Kripya red extensions ko cPanel "Select PHP Version" me tick karein.</span>
            <?php endif; ?>
          </div>
          <a href="?step=2" class="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-teal-500/20">
            <span>Next: Permissions Check</span>
            <i class="fa-solid fa-arrow-right"></i>
          </a>
        </div>
      </div>

    <!-- STEP 2: FILE PERMISSIONS -->
    <?php elseif ($step === 2): ?>
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div>
          <h2 class="text-lg font-bold text-white flex items-center gap-2">
            <i class="fa-solid fa-folder-tree text-teal-400"></i> Step 2: Directory &amp; Permissions Check
          </h2>
          <p class="text-xs text-slate-400 mt-1">
            Config file save karne ke liye write permissions verify ki jaa rahi hain.
          </p>
        </div>

        <div class="divide-y divide-slate-800/80 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/50">
          <?php foreach ($permissions as $title => $p): ?>
            <div class="p-3.5 flex items-center justify-between text-xs">
              <div class="flex items-center gap-3">
                <?php if ($p['status']): ?>
                  <span class="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs">
                    <i class="fa-solid fa-check"></i>
                  </span>
                <?php else: ?>
                  <span class="w-6 h-6 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center text-xs">
                    <i class="fa-solid fa-xmark"></i>
                  </span>
                <?php endif; ?>
                <div>
                  <div class="font-medium text-slate-200"><?= htmlspecialchars($title) ?></div>
                  <div class="text-[11px] text-slate-500">Requirement: <?= htmlspecialchars($p['required']) ?></div>
                </div>
              </div>
              <div class="text-right">
                <span class="px-2.5 py-1 rounded-md text-[11px] font-mono <?= $p['status'] ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20' ?>">
                  <?= htmlspecialchars((string)$p['current']) ?>
                </span>
              </div>
            </div>
          <?php endforeach; ?>
        </div>

        <div class="flex items-center justify-between pt-4 border-t border-slate-800">
          <a href="?step=1" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-2">
            <i class="fa-solid fa-arrow-left"></i> Previous
          </a>
          <a href="?step=3" class="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-teal-500/20">
            <span>Next: Database &amp; Admin Config</span>
            <i class="fa-solid fa-arrow-right"></i>
          </a>
        </div>
      </div>

    <!-- STEP 3: DATABASE & ADMIN CONFIGURATION -->
    <?php elseif ($step === 3): ?>
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div>
          <h2 class="text-lg font-bold text-white flex items-center gap-2">
            <i class="fa-solid fa-database text-teal-400"></i> Step 3: Database &amp; Admin Setup
          </h2>
          <p class="text-xs text-slate-400 mt-1">
            Apne cPanel MySQL Database ke credentials aur Super Admin login yahan enter karein. Ye installer automatically tables create karke sab connect kar dega.
          </p>
        </div>

        <form method="POST" action="?step=3" class="space-y-6">
          <input type="hidden" name="action" value="install">

          <!-- Database Section -->
          <div class="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-4">
            <h3 class="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-2">
              <i class="fa-solid fa-server"></i> MySQL Database Connection
            </h3>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Database Host</label>
                <input type="text" name="db_host" value="localhost" required class="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:border-teal-500 focus:outline-none font-mono">
                <span class="text-[10px] text-slate-500">Usually 'localhost' in cPanel</span>
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Database Name *</label>
                <input type="text" name="db_name" placeholder="cpaneluser_eaglepay" required class="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:border-teal-500 focus:outline-none font-mono">
                <span class="text-[10px] text-slate-500">cPanel me banayi gayi database</span>
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Database Username *</label>
                <input type="text" name="db_user" placeholder="cpaneluser_eagleusr" required class="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:border-teal-500 focus:outline-none font-mono">
                <span class="text-[10px] text-slate-500">MySQL user with ALL PRIVILEGES</span>
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Database Password</label>
                <input type="password" name="db_pass" placeholder="••••••••••••" class="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:border-teal-500 focus:outline-none font-mono">
                <span class="text-[10px] text-slate-500">Database user password</span>
              </div>
            </div>

            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Platform URL</label>
              <input type="url" name="app_url" value="<?= htmlspecialchars($detectedUrl) ?>" required class="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:border-teal-500 focus:outline-none font-mono">
              <span class="text-[10px] text-slate-500">Domain URL jahan EaglePay run hoga</span>
            </div>
          </div>

          <!-- Admin Credentials Section -->
          <div class="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-4">
            <h3 class="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-2">
              <i class="fa-solid fa-user-shield"></i> Administrator Account (Dashboard Login)
            </h3>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Super Admin Name</label>
                <input type="text" name="admin_name" value="Super Administrator" required class="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:border-teal-500 focus:outline-none">
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Admin Email</label>
                <input type="email" name="admin_email" value="admin@vardanloan.eu.cc" required class="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:border-teal-500 focus:outline-none">
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Login Username *</label>
                <input type="text" name="admin_user" value="admin" required class="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:border-teal-500 focus:outline-none font-mono">
                <span class="text-[10px] text-teal-400 font-semibold">Dashboard me login karne ka username</span>
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Login Password *</label>
                <input type="text" name="admin_pass" value="admin123" required class="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:border-teal-500 focus:outline-none font-mono">
                <span class="text-[10px] text-teal-400 font-semibold">Dashboard me login karne ka password</span>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between pt-4 border-t border-slate-800">
            <a href="?step=2" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-2">
              <i class="fa-solid fa-arrow-left"></i> Previous
            </a>
            <button type="submit" class="px-6 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-black text-xs flex items-center gap-2 transition shadow-xl shadow-teal-500/20 active:scale-95">
              <i class="fa-solid fa-bolt"></i>
              <span>Install &amp; Run Complete Platform Now</span>
            </button>
          </div>
        </form>
      </div>

    <!-- STEP 4: INSTALLATION COMPLETED -->
    <?php elseif ($step === 4): ?>
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl text-center space-y-6">
        <div class="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-3xl mx-auto border border-emerald-500/20 shadow-xl shadow-emerald-500/10">
          <i class="fa-solid fa-circle-check"></i>
        </div>

        <div>
          <h2 class="text-2xl font-bold text-white">Installation Successful! 🎉</h2>
          <p class="text-xs text-slate-400 mt-2 max-w-lg mx-auto leading-relaxed">
            Aapka complete EaglePay platform, database tables, notice templates, payment gateways aur dashboard successfully configure ho chuke hain!
          </p>
        </div>

        <!-- Credentials Card -->
        <div class="max-w-md mx-auto p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-left space-y-3">
          <div class="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-2">
            <i class="fa-solid fa-key"></i> Aapke Login Credentials:
          </div>
          <div class="text-xs space-y-1.5 font-mono">
            <div class="flex justify-between py-1 border-b border-slate-800/80">
              <span class="text-slate-400">Dashboard URL:</span>
              <a href="/" class="text-teal-400 underline font-semibold"><?= htmlspecialchars($detectedUrl) ?>/</a>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-800/80">
              <span class="text-slate-400">Username:</span>
              <span class="text-white font-bold bg-slate-800 px-2 py-0.5 rounded">admin</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-800/80">
              <span class="text-slate-400">Password:</span>
              <span class="text-white font-bold bg-slate-800 px-2 py-0.5 rounded">admin123</span>
            </div>
            <div class="flex justify-between py-1">
              <span class="text-slate-400">EaglePay Webhook:</span>
              <span class="text-teal-400"><?= htmlspecialchars($detectedUrl) ?>/webhooks/eaglepay</span>
            </div>
          </div>
        </div>

        <!-- Cron Instructions -->
        <div class="max-w-md mx-auto p-4 rounded-xl bg-slate-950 border border-slate-800 text-left text-xs space-y-2">
          <div class="font-bold text-amber-400 flex items-center gap-2">
            <i class="fa-solid fa-clock"></i> cPanel Cron Job Command (Every 15 Minutes):
          </div>
          <div class="font-mono text-[11px] bg-slate-900 p-2 rounded border border-slate-800 text-slate-300 break-all select-all">
            */15 * * * * /usr/bin/php <?= htmlspecialchars(realpath($baseDir . '/cron/reconcile.php') ?: $baseDir . '/cron/reconcile.php') ?> &gt; /dev/null 2&gt;&amp;1
          </div>
        </div>

        <div class="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="/" class="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition shadow-xl shadow-teal-500/20">
            <i class="fa-solid fa-arrow-right-to-bracket"></i>
            <span>Go to Admin Login &amp; Dashboard</span>
          </a>
        </div>
      </div>
    <?php endif; ?>

  </main>

  <!-- Footer -->
  <footer class="border-t border-slate-800/80 bg-slate-900/50 py-4 text-center text-xs text-slate-500">
    EaglePay Multi-Brand Payment Platform &bull; CodeCanyon Compatible 1-Click Installer
  </footer>
</body>
</html>
