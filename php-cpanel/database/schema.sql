-- ============================================================
-- EaglePay Multi-Brand Payment Platform - MySQL / MariaDB Schema
-- Designed for shared cPanel hosting (MySQL 5.7+ / 8.0+ / MariaDB 10.3+)
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- Table: admins
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `admins` (
  `id` VARCHAR(36) NOT NULL,
  `username` VARCHAR(60) NOT NULL,
  `email` VARCHAR(120) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `salt` VARCHAR(64) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `role` ENUM('super_admin', 'admin', 'operator', 'read_only') NOT NULL DEFAULT 'admin',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `two_factor_enabled` TINYINT(1) NOT NULL DEFAULT 0,
  `last_login_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_admin_username` (`username`),
  UNIQUE KEY `uk_admin_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table: customers
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `customers` (
  `id` VARCHAR(36) NOT NULL,
  `full_name` VARCHAR(120) NOT NULL,
  `mobile` VARCHAR(20) NOT NULL,
  `email` VARCHAR(120) NOT NULL,
  `pan_number` VARCHAR(30) NULL,
  `bank_account` VARCHAR(60) NULL,
  `executive_name` VARCHAR(100) NULL,
  `address` VARCHAR(255) NULL,
  `city` VARCHAR(100) NULL,
  `state` VARCHAR(100) NULL,
  `pincode` VARCHAR(20) NULL,
  `external_reference` VARCHAR(100) NULL,
  `business_reference` VARCHAR(100) NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_customer_mobile` (`mobile`),
  KEY `idx_customer_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table: brands
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `brands` (
  `id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `slug` VARCHAR(60) NOT NULL,
  `logo_url` VARCHAR(255) NULL,
  `primary_color` VARCHAR(20) NOT NULL DEFAULT '#0f766e',
  `secondary_color` VARCHAR(20) NOT NULL DEFAULT '#0d9488',
  `background_color` VARCHAR(20) NOT NULL DEFAULT '#f8fafc',
  `button_color` VARCHAR(20) NOT NULL DEFAULT '#0f766e',
  `support_email` VARCHAR(120) NULL,
  `support_phone` VARCHAR(30) NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_brand_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table: templates
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `templates` (
  `id` VARCHAR(36) NOT NULL,
  `brand_id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `html_content` MEDIUMTEXT NOT NULL,
  `status` ENUM('draft', 'published') NOT NULL DEFAULT 'published',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tpl_brand` (`brand_id`),
  CONSTRAINT `fk_tpl_brand` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table: template_versions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `template_versions` (
  `id` VARCHAR(36) NOT NULL,
  `template_id` VARCHAR(36) NOT NULL,
  `version_number` INT NOT NULL DEFAULT 1,
  `html_content` MEDIUMTEXT NOT NULL,
  `change_notes` VARCHAR(255) NULL,
  `created_by` VARCHAR(60) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tpl_version` (`template_id`, `version_number`),
  CONSTRAINT `fk_ver_template` FOREIGN KEY (`template_id`) REFERENCES `templates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table: gateway_accounts
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `gateway_accounts` (
  `id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `adapter` VARCHAR(50) NOT NULL DEFAULT 'eaglepay',
  `mch_id` VARCHAR(100) NOT NULL,
  `mch_key` VARCHAR(255) NOT NULL,
  `base_url` VARCHAR(255) NOT NULL DEFAULT 'https://xgxbscfgfhtiizzxipog.supabase.co/functions/v1',
  `is_sandbox` TINYINT(1) NOT NULL DEFAULT 0,
  `trade_type` VARCHAR(50) NOT NULL DEFAULT 'INRUPI',
  `notify_url` VARCHAR(255) NOT NULL,
  `return_url` VARCHAR(255) NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `last_tested_at` DATETIME NULL,
  `last_test_status` VARCHAR(20) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table: payment_links
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payment_links` (
  `id` VARCHAR(36) NOT NULL,
  `token` VARCHAR(32) NOT NULL,
  `customer_id` VARCHAR(36) NOT NULL,
  `brand_id` VARCHAR(36) NOT NULL,
  `gateway_account_id` VARCHAR(36) NOT NULL,
  `template_version_id` VARCHAR(36) NULL,
  `merchant_order_no` VARCHAR(64) NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'INR',
  `description` VARCHAR(255) NOT NULL,
  `external_reference` VARCHAR(100) NULL,
  `loan_order_number` VARCHAR(100) NULL,
  `repayment_date` VARCHAR(60) NULL,
  `pan_number` VARCHAR(30) NULL,
  `bank_account` VARCHAR(60) NULL,
  `executive_name` VARCHAR(100) NULL,
  `status` ENUM('CREATED', 'PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'EXPIRED', 'CANCELLED', 'REVIEW_REQUIRED') NOT NULL DEFAULT 'CREATED',
  `is_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `expires_at` DATETIME NOT NULL,
  `paid_at` DATETIME NULL,
  `gateway_order_no` VARCHAR(100) NULL,
  `gateway_pay_url` TEXT NULL,
  `created_by_admin_id` VARCHAR(36) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_link_token` (`token`),
  UNIQUE KEY `uk_link_merchant_order` (`merchant_order_no`),
  KEY `idx_link_status` (`status`),
  KEY `idx_link_expires` (`expires_at`),
  KEY `idx_link_customer` (`customer_id`),
  CONSTRAINT `fk_link_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `fk_link_brand` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`),
  CONSTRAINT `fk_link_gateway` FOREIGN KEY (`gateway_account_id`) REFERENCES `gateway_accounts` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table: transactions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `transactions` (
  `id` VARCHAR(36) NOT NULL,
  `payment_link_id` VARCHAR(36) NOT NULL,
  `merchant_order_no` VARCHAR(64) NOT NULL,
  `gateway_order_no` VARCHAR(100) NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'INR',
  `status` VARCHAR(30) NOT NULL,
  `gateway_response_raw` MEDIUMTEXT NULL,
  `callback_received_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tx_payment_link` (`payment_link_id`),
  KEY `idx_tx_mch_order` (`merchant_order_no`),
  CONSTRAINT `fk_tx_payment_link` FOREIGN KEY (`payment_link_id`) REFERENCES `payment_links` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table: payment_status_history
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payment_status_history` (
  `id` VARCHAR(36) NOT NULL,
  `payment_link_id` VARCHAR(36) NOT NULL,
  `previous_status` VARCHAR(30) NOT NULL,
  `new_status` VARCHAR(30) NOT NULL,
  `source` VARCHAR(40) NOT NULL,
  `reason` VARCHAR(255) NULL,
  `actor` VARCHAR(100) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_hist_payment_link` (`payment_link_id`),
  CONSTRAINT `fk_hist_payment_link` FOREIGN KEY (`payment_link_id`) REFERENCES `payment_links` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table: webhook_logs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `webhook_logs` (
  `id` VARCHAR(36) NOT NULL,
  `source_gateway` VARCHAR(50) NOT NULL,
  `endpoint` VARCHAR(120) NOT NULL,
  `payload_json` MEDIUMTEXT NOT NULL,
  `signature_received` VARCHAR(100) NULL,
  `signature_calculated` VARCHAR(100) NULL,
  `is_signature_valid` TINYINT(1) NOT NULL DEFAULT 0,
  `processing_status` VARCHAR(50) NOT NULL,
  `merchant_order_no` VARCHAR(64) NULL,
  `response_sent` VARCHAR(50) NOT NULL,
  `http_status_code` INT NOT NULL DEFAULT 200,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_wh_mch_order` (`merchant_order_no`),
  KEY `idx_wh_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table: audit_logs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` VARCHAR(36) NOT NULL,
  `admin_id` VARCHAR(36) NOT NULL,
  `admin_username` VARCHAR(60) NOT NULL,
  `action` VARCHAR(60) NOT NULL,
  `entity_type` VARCHAR(40) NOT NULL,
  `entity_id` VARCHAR(36) NULL,
  `details` TEXT NOT NULL,
  `ip_address` VARCHAR(45) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_admin` (`admin_id`),
  KEY `idx_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table: notice_templates
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `notice_templates` (
  `id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `category` VARCHAR(50) NOT NULL DEFAULT 'SETTLEMENT',
  `body` TEXT NOT NULL,
  `is_default` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table: system_settings
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `system_settings` (
  `key_name` VARCHAR(60) NOT NULL,
  `value_json` MEDIUMTEXT NOT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
