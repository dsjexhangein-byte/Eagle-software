import { GatewayAccount } from '../types.js';
import {
  CreatePaymentParams,
  CreatePaymentResult,
  GatewayCapabilities,
  PaymentGatewayInterface,
  QueryStatusResult,
  VerifyCallbackResult,
} from '../contracts/PaymentGatewayInterface.js';
import { SignatureService } from '../services/SignatureService.js';

/**
 * Mock / Sandbox Gateway Adapter
 * Used for safe automated testing, development, and checkout simulation
 * without triggering real financial movements.
 */
export class MockGatewayAdapter implements PaymentGatewayInterface {
  public readonly id = 'mock';
  public readonly name = 'Simulated Sandbox Gateway';

  private account: GatewayAccount | null = null;

  public configure(account: GatewayAccount): void {
    this.account = account;
  }

  public getCapabilities(): GatewayCapabilities {
    return {
      supportsPayin: true,
      supportsQueryStatus: true,
      supportsRefund: false,
      supportsSandbox: true,
      requiredCredentials: ['mchId', 'mchKey'],
    };
  }

  public validateConfiguration(config: Partial<GatewayAccount>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!config.mchId) errors.push('Merchant ID is required.');
    if (!config.mchKey) errors.push('Secret key is required.');
    return { isValid: errors.length === 0, errors };
  }

  public async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    const mockOrderNo = `SIM-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;

    // Build simulated checkout gateway return
    const rawResponse = {
      code: 0,
      msg: 'success',
      data: {
        orderNo: mockOrderNo,
        mchOrderNo: params.mchOrderNo,
        amount: params.amount,
        currency: 'INR',
        pay_url: `/__sandbox_gateway_simulator?orderNo=${mockOrderNo}&mchOrderNo=${params.mchOrderNo}&amount=${params.amount}`,
        status: 'pending',
        is_simulated: true,
      },
    };

    return {
      success: true,
      gatewayOrderNo: mockOrderNo,
      mchOrderNo: params.mchOrderNo,
      amount: params.amount,
      currency: 'INR',
      payUrl: rawResponse.data.pay_url,
      status: 'PENDING',
      rawResponse,
    };
  }

  public async verifyCallback(payload: Record<string, unknown>): Promise<VerifyCallbackResult> {
    const secret = this.account?.mchKey || 'sandbox_secret_key';
    const receivedSign = String(payload.sign || '');
    const { isValid, calculatedSign } = SignatureService.verifySignature(payload, receivedSign, secret);

    const mchOrderNo = String(payload.mchOrderNo || '');
    const rawStatus = String(payload.status || 'success').toLowerCase();

    return {
      isValid,
      mchOrderNo,
      gatewayOrderNo: String(payload.orderNo || `SIM-${Date.now()}`),
      amount: String(payload.amount || '0'),
      currency: 'INR',
      status: rawStatus === 'success' ? 'SUCCESS' : rawStatus === 'failed' ? 'FAILED' : 'PENDING',
      paidAt: String(payload.paidAt || new Date().toISOString()),
      signatureReceived: receivedSign,
      signatureCalculated: calculatedSign,
      rawPayload: payload,
    };
  }

  public async queryPaymentStatus(mchOrderNo: string): Promise<QueryStatusResult> {
    return {
      success: true,
      mchOrderNo,
      gatewayOrderNo: `SIM-QUERY-${Date.now()}`,
      status: 'PENDING',
      amount: '500.00',
      currency: 'INR',
      rawResponse: { code: 0, msg: 'success', status: 'pending', is_simulated: true },
    };
  }
}
