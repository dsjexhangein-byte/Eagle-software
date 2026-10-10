import { GatewayAccount } from '../types.js';

export interface CreatePaymentParams {
  mchOrderNo: string;
  amount: string; // e.g. "500.00"
  notifyUrl: string;
  returnUrl?: string;
  tradeType?: string; // Default: "INRUPI"
  extra?: string;
  customerName?: string;
  customerMobile?: string;
  customerEmail?: string;
}

export interface CreatePaymentResult {
  success: boolean;
  gatewayOrderNo?: string;
  mchOrderNo: string;
  amount: string;
  currency: string;
  payUrl?: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  rawResponse: Record<string, unknown>;
  errorCode?: string;
  errorMessage?: string;
}

export interface QueryStatusResult {
  success: boolean;
  mchOrderNo: string;
  gatewayOrderNo?: string;
  amount?: string;
  currency?: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'UNKNOWN';
  rawResponse: Record<string, unknown>;
  errorMessage?: string;
}

export interface VerifyCallbackResult {
  isValid: boolean;
  mchOrderNo: string;
  gatewayOrderNo?: string;
  amount: string;
  currency: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'UNKNOWN';
  paidAt?: string;
  signatureReceived: string;
  signatureCalculated: string;
  rawPayload: Record<string, unknown>;
  failureReason?: string;
}

export interface GatewayCapabilities {
  supportsPayin: boolean;
  supportsQueryStatus: boolean;
  supportsRefund: boolean;
  supportsSandbox: boolean;
  requiredCredentials: string[];
}

export interface PaymentGatewayInterface {
  readonly id: string;
  readonly name: string;

  /**
   * Initialize adapter with specific gateway account configuration
   */
  configure(account: GatewayAccount): void;

  /**
   * Initiate a pay-in transaction
   */
  createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult>;

  /**
   * Verify an incoming webhook / callback request
   */
  verifyCallback(payload: Record<string, unknown>): Promise<VerifyCallbackResult>;

  /**
   * Actively query transaction status from the gateway
   */
  queryPaymentStatus(mchOrderNo: string): Promise<QueryStatusResult>;

  /**
   * Validate credentials & configuration
   */
  validateConfiguration(config: Partial<GatewayAccount>): { isValid: boolean; errors: string[] };

  /**
   * Get supported capabilities
   */
  getCapabilities(): GatewayCapabilities;
}
