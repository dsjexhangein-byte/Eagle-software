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
  name: string;
  role: UserRole;
  isActive?: boolean;
  lastLoginAt: string | null;
  createdAt?: string;
  updatedAt?: string;
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
  totalLinks?: number;
  paidLinks?: number;
  totalPaidAmount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  buttonColor: string;
  buttonText?: string;
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
  htmlContent: string;
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
  token: string;
  customerId: string;
  customerName?: string;
  customerMobile?: string;
  customerEmail?: string;
  brandId: string;
  brandName?: string;
  brandSlug?: string;
  brandLogo?: string;
  gatewayAccountId: string;
  gatewayName?: string;
  merchantOrderNo: string;
  amount: number;
  amountFormatted: string;
  currency: string;
  description: string;
  externalReference?: string;
  panNumber?: string;
  bankAccount?: string;
  executiveName?: string;
  loanOrderNumber?: string;
  repaymentDate?: string;
  status: PaymentStatus;
  isEnabled: boolean;
  expiresAt: string;
  createdAt: string;
  paidAt?: string | null;
  gatewayOrderNo?: string | null;
  gatewayPayUrl?: string | null;
  publicUrl?: string;
  isExpired?: boolean;
}

export interface GatewayAccount {
  id: string;
  name: string;
  adapter: 'eaglepay' | 'mock';
  mchId: string;
  mchKeyMasked?: string;
  baseUrl: string;
  isSandbox: boolean;
  tradeType: string;
  notifyUrl: string;
  returnUrl: string;
  isActive: boolean;
  lastTestedAt?: string | null;
  lastTestStatus?: 'SUCCESS' | 'FAILED' | null;
}

export interface Transaction {
  id: string;
  merchantOrderNo: string;
  gatewayOrderNo?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  customerName?: string;
  customerMobile?: string;
  brandName?: string;
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
  processingStatus: string;
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
  entityType: string;
  details: string;
  ipAddress?: string;
  createdAt: string;
}

export interface TestResultItem {
  id: string;
  name: string;
  category: string;
  passed: boolean;
  durationMs: number;
  assertion: string;
  details?: string;
}
