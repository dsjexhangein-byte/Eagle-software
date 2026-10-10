# EaglePay Multi-Brand Payment Platform - cPanel Deployment Guide

This package provides a standalone, production-ready PHP 8.2+ and MySQL implementation of the multi-brand payment collection platform with native Eagle Pay Pay-in integration.

---

## 1. Hosting Requirements

- **PHP**: Version 8.2 or higher
- **Extensions**: `pdo_mysql`, `curl`, `json`, `mbstring`, `openssl`, `hash`
- **Database**: MySQL 5.7+ / 8.0+ or MariaDB 10.3+
- **Web Server**: Apache with `mod_rewrite` enabled
- **SSL**: Active HTTPS certificate (Let's Encrypt / cPanel AutoSSL)

---

## 2. Step-by-Step Installation

### Step 1: Create Database in cPanel
1. Log into your cPanel account.
2. Under the **Databases** section, click **MySQL Databases**.
3. Create a new database, e.g., `username_eaglepay`.
4. Create a new MySQL user and assign a strong 20+ character password.
5. Add the user to the database and grant **ALL PRIVILEGES**.

### Step 2: Import Database Schema
1. Open **phpMyAdmin** in cPanel.
2. Select your newly created database.
3. Click the **Import** tab.
4. Select `database/schema.sql` from this package and click **Go**.

### Step 3: Upload Files
1. In cPanel **File Manager**, upload all files.
2. Recommended structure:
   - Put `src`, `config`, `cron`, and `database` **OUTSIDE** the public web root (e.g., `/home/username/eaglepay_app/`).
   - Copy contents of `public/` into your domain's document root (e.g., `/home/username/public_html/`).
   - If placing in document root directly, the included `.htaccess` automatically denies access to `config/`, `src/`, and `database/`.

### Step 4: Configure Database Credentials
Edit `config/config.php`:
```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'your_cpanel_db_name');
define('DB_USER', 'your_cpanel_db_user');
define('DB_PASS', 'YourSecurePasswordHere123!');
define('APP_URL', 'https://yourdomain.com');
```

### Step 5: Configure cPanel Cron Job for Reconciliation
1. In cPanel, navigate to **Cron Jobs**.
2. Select **Once every 15 minutes** (`*/15 * * * *`).
3. Enter the following command (replace `username` with your cPanel username):
```bash
/usr/local/bin/php -q /home/username/public_html/cron/reconcile.php >> /home/username/cron.log 2>&1
```

---

## 3. Eagle Pay Production Setup Checklist

1. **Merchant Credentials**:
   Obtain your `mchId` and `mchKey` from the Eagle Pay Merchant Portal.
2. **Callback URL**:
   Register your live callback URL with Eagle Pay:
   `https://yourdomain.com/webhooks/eaglepay`
3. **Trade Type**:
   Use `INRUPI` for Indian UPI/NetBanking payins.
4. **Endpoint**:
   Eagle Pay Supabase API Base URL:
   `https://xgxbscfgfhtiizzxipog.supabase.co/functions/v1`

---

## 4. Verification and Security

- **Timing-Safe Signatures**: Webhook signatures are checked using `hash_equals` to prevent timing attacks.
- **Strict Decimal Precision**: Handled using `DECIMAL(12,2)` and `bcmath`/safe rounding.
- **Idempotent Webhooks**: Repeated or out-of-order callbacks will never downgrade or double-credit an already paid order.
