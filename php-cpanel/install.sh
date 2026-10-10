#!/bin/bash
# ==============================================================================
# 🚀 EaglePay Multi-Brand Platform - 1-Click cPanel Automated Installer
# ==============================================================================
# Usage:
#   bash install.sh
# ==============================================================================

set -e

echo ""
echo "=========================================================="
echo " EaglePay Multi-Brand Platform: 1-Click cPanel Setup"
echo "=========================================================="
echo ""

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$APP_DIR/config/config.php"
SCHEMA_FILE="$APP_DIR/database/schema.sql"

# Check prerequisites
if ! command -v php &> /dev/null; then
    echo "❌ Error: PHP is not installed or not in PATH."
    exit 1
fi

PHP_VER=$(php -r "echo PHP_VERSION;")
echo "✅ Detected PHP Version: $PHP_VER"

echo ""
echo "--- Step 1: Database Setup ---"
read -p "Enter MySQL Database Host [localhost]: " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "Enter MySQL Database Name (e.g. cpaneluser_eaglepay): " DB_NAME
while [ -z "$DB_NAME" ]; do
    echo "Database name cannot be empty."
    read -p "Enter MySQL Database Name: " DB_NAME
done

read -p "Enter MySQL Database Username: " DB_USER
while [ -z "$DB_USER" ]; do
    echo "Database user cannot be empty."
    read -p "Enter MySQL Database Username: " DB_USER
done

read -s -p "Enter MySQL Database Password: " DB_PASS
echo ""

read -p "Enter App Public URL (e.g. https://yourdomain.com): " APP_URL
while [ -z "$APP_URL" ]; do
    echo "App URL cannot be empty."
    read -p "Enter App Public URL: " APP_URL
done

# Test Database Connection and import schema
echo ""
echo "--- Step 2: Testing Connection & Importing Schema ---"
if command -v mysql &> /dev/null; then
    mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$SCHEMA_FILE" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "✅ Database schema imported successfully via mysql CLI!"
    else
        echo "⚠️  Direct mysql import skipped. Running PHP PDO fallback importer..."
        php -r "
        try {
            \$pdo = new PDO('mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4', '$DB_USER', '$DB_PASS');
            \$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            \$sql = file_get_contents('$SCHEMA_FILE');
            \$pdo->exec(\$sql);
            echo '✅ Database schema imported successfully via PDO!\n';
        } catch (Exception \$e) {
            echo '❌ Database Error: ' . \$e->getMessage() . '\n';
            exit(1);
        }
        "
    fi
else
    php -r "
    try {
        \$pdo = new PDO('mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4', '$DB_USER', '$DB_PASS');
        \$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        \$sql = file_get_contents('$SCHEMA_FILE');
        \$pdo->exec(\$sql);
        echo '✅ Database schema imported successfully via PDO!\n';
    } catch (Exception \$e) {
        echo '❌ Database Error: ' . \$e->getMessage() . '\n';
        exit(1);
    }
    "
fi

# Step 3: Generate config.php
echo ""
echo "--- Step 3: Writing Configuration ---"
APP_KEY=$(php -r "echo bin2hex(random_bytes(32));")

cat <<EOF > "$CONFIG_FILE"
<?php
/**
 * EaglePay Multi-Brand Platform Configuration
 * Generated automatically by install.sh on $(date)
 */

define('DB_HOST', '$DB_HOST');
define('DB_NAME', '$DB_NAME');
define('DB_USER', '$DB_USER');
define('DB_PASS', '$DB_PASS');

define('APP_URL', rtrim('$APP_URL', '/'));
define('APP_KEY', '$APP_KEY');
define('APP_ENV', 'production');
define('DEBUG_MODE', false);

// Default Platform Preferences
define('DEFAULT_CURRENCY', 'INR');
define('DEFAULT_EXPIRY_HOURS', 72);
EOF

chmod 600 "$CONFIG_FILE"
echo "✅ config/config.php created and permissions locked (chmod 600)."

# Step 4: Permissions and .htaccess check
echo ""
echo "--- Step 4: Securing File Permissions ---"
find "$APP_DIR" -type d -exec chmod 755 {} \; 2>/dev/null || true
find "$APP_DIR" -type f -exec chmod 644 {} \; 2>/dev/null || true
chmod 600 "$CONFIG_FILE"

# Step 5: Finished
echo ""
echo "=========================================================="
echo " 🎉 1-Click Installation Completed Successfully!"
echo "=========================================================="
echo ""
echo "Your platform is ready at: $APP_URL"
echo ""
echo "CRON JOB SETUP (Every 15 minutes):"
echo "In cPanel -> Cron Jobs, add this command:"
echo "*/15 * * * * /usr/local/bin/php -q $APP_DIR/cron/reconcile.php >> $APP_DIR/cron.log 2>&1"
echo ""
echo "Admin Access:"
echo "Username: admin"
echo "Default Password: Admin@Password2026!"
echo "(Change this password immediately in Settings!)"
echo "=========================================================="
echo ""
