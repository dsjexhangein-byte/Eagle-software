/**
 * Core domain types and interfaces for the payment platform
 */

export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'manager'
  | 'link_creator'
  | 'template_designer'
  | 'operator'
  | 'read_only';

export interface NoticeTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  passwordHash: string; // bcrypt or sha256-salt
  salt: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  twoFactorEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  fullName: string;
  mobile: string;
  email: string;
  panNumber?: string;
  bankAccount?: string;
  executiveName?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  externalReference?: string;
  businessReference?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string; // e.g. "samvit" -> /samvit/PAY...
  logoUrl: string;
  primaryColor: string; // hex, e.g. "#6366f1"
  secondaryColor: string; // hex, e.g. "#818cf8"
  backgroundColor: string; // hex, e.g. "#f3f4f6"
  buttonColor: string; // hex
  buttonText?: string; // e.g. "PAY NOW"
  successTitle?: string;
  successMessage?: string;
  pendingTitle?: string;
  pendingMessage?: string;
  failedTitle?: string;
  failedMessage?: string;
  supportEmail: string;
  supportPhone: string;
  isActive: boolean;
  currentTemplateId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateVersion {
  id: string;
  templateId: string;
  versionNumber: number;
  htmlContent: string;
  changeNotes: string;
  createdAt: string;
  createdBy: string;
}

export interface BrandTemplate {
  id: string;
  brandId: string;
  name: string;
  htmlContent: string; // customizable template with dynamic variables
  status: 'draft' | 'published';
  activeVersionId: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentStatus =
  | 'CREATED'
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'REVIEW_REQUIRED';

export interface PaymentLink {
  id: string;
  token: string; // Cryptographically random, e.g. "PAY8F72K9"
  customerId: string;
  brandId: string;
  gatewayAccountId: string;
  templateVersionId?: string;
  merchantOrderNo: string; // e.g. "ORD-1718000000000-XYZ"
  amount: number; // e.g. 500.00
  amountFormatted: string; // "500.00"
  currency: 'INR';
  description: string;
  externalReference?: string;
  panNumber?: string;
  bankAccount?: string;
  executiveName?: string;
  loanOrderNumber?: string;
  repaymentDate?: string;
  itemBreakdownJson?: string;
  status: PaymentStatus;
  isEnabled: boolean;
  expiresAt: string; // ISO 8601
  createdAt: string;
  updatedAt: string;
  paidAt?: string | null;
  gatewayOrderNo?: string | null;
  gatewayPayUrl?: string | null;
  createdByAdminId: string;
}

export interface GatewayAccount {
  id: string;
  name: string; // e.g. "Eagle Pay Production", "Eagle Pay Sandbox"
  adapter: 'eaglepay' | 'mock';
  mchId: string;
  mchKey: string; // secret key for payin signing
  baseUrl: string; // https://xgxbscfgfhtiizzxipog.supabase.co/functions/v1
  isSandbox: boolean;
  tradeType: string; // "INRUPI"
  notifyUrl: string;
  returnUrl: string;
  isActive: boolean;
  lastTestedAt?: string | null;
  lastTestStatus?: 'SUCCESS' | 'FAILED' | null;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  paymentLinkId: string;
  merchantOrderNo: string;
  gatewayOrderNo?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  gatewayResponseRaw?: string;
  gatewayErrorCode?: string;
  gatewayErrorMessage?: string;
  callbackReceivedAt?: string;
  reconciledAt?: string;
  createdAt: string;
}

export interface PaymentStatusHistory {
  id: string;
  paymentLinkId: string;
  previousStatus: PaymentStatus;
  newStatus: PaymentStatus;
  source: 'INITIAL' | 'CHECKOUT_START' | 'GATEWAY_RESPONSE' | 'WEBHOOK' | 'MANUAL_RECHECK' | 'CRON_RECONCILE' | 'ADMIN_OVERRIDE';
  reason?: string;
  actor?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface WebhookLog {
  id: string;
  sourceGateway: string;
  endpoint: string;
  payload: Record<string, unknown>;
  rawBody: string;
  signatureReceived: string;
  signatureCalculated: string;
  isSignatureValid: boolean;
  processingStatus: 'SUCCESS' | 'FAILED' | 'IGNORED_DUPLICATE' | 'SIGNATURE_MISMATCH' | 'ORDER_NOT_FOUND';
  merchantOrderNo?: string;
  responseSent: string;
  httpStatusCode: number;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  adminId: string;
  adminUsername: string;
  action: string;
  entityType:
    | 'CUSTOMER'
    | 'PAYMENT_LINK'
    | 'BRAND'
    | 'TEMPLATE'
    | 'GATEWAY'
    | 'AUTH'
    | 'SYSTEM'
    | 'TEAM'
    | 'NOTICE_TEMPLATE';
  entityId?: string;
  details: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface SystemSettings {
  siteName: string;
  siteUrl: string;
  defaultCurrency: string;
  defaultExpiryHours: number;
  supportEmail: string;
  maintenanceMode: boolean;
  webhookSecretKey?: string;
  allowManualStatusOverride: boolean;
  reconciliationCronIntervalMinutes: number;
}
