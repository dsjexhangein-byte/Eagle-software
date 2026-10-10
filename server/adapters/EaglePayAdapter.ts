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

export class EaglePayAdapter implements PaymentGatewayInterface {
  public readonly id = 'eaglepay';
  public readonly name = 'Eagle Pay';

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
    if (!config.mchId || config.mchId.trim() === '') {
      errors.push('Merchant ID (mchId) is required.');
    }
    if (!config.mchKey || config.mchKey.trim() === '') {
      errors.push('Merchant Secret Key (mchKey) is required for Pay-in signing.');
    }
    if (!config.baseUrl || !config.baseUrl.startsWith('http')) {
      errors.push('A valid Base URL (starting with http/https) is required.');
    }
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Initiate payin with Eagle Pay
   */
  public async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    if (!this.account) {
      throw new Error('EaglePayAdapter not configured with gateway account.');
    }

    const { mchId, mchKey, baseUrl, tradeType = 'INRUPI' } = this.account;

    // 1. Build payload per Eagle Pay contract
    const requestPayload: Record<string, unknown> = {
      mchId,
      mchOrderNo: params.mchOrderNo,
      amount: params.amount,
      notifyUrl: params.notifyUrl,
      tradeType: params.tradeType || tradeType,
    };

    if (params.returnUrl) {
      requestPayload.returnUrl = params.returnUrl;
    }
    if (params.extra) {
      requestPayload.extra = params.extra;
    }

    // 2. Generate signature
    const { signature, rawString } = SignatureService.generateSignature(requestPayload, mchKey);
    requestPayload.sign = signature;

    const endpoint = `${baseUrl.replace(/\/+$/, '')}/payin`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const jsonText = await response.text();
      let responseData: Record<string, unknown> = {};

      try {
        responseData = JSON.parse(jsonText);
      } catch {
        return {
          success: false,
          mchOrderNo: params.mchOrderNo,
          amount: params.amount,
          currency: 'INR',
          status: 'FAILED',
          errorCode: 'INVALID_JSON_RESPONSE',
          errorMessage: `Eagle Pay returned non-JSON response (HTTP ${response.status}): ${jsonText.slice(0, 150)}`,
          rawResponse: { httpStatus: response.status, body: jsonText },
        };
      }

      // Check Eagle Pay response: support standard { code: 0, msg: "success" }, Supabase { code: 200, message: "Success", success: true, data: { ... } }, etc.
      const code = responseData.code;
      const data = (responseData.data as Record<string, unknown>) || {};
      const isSuccess =
        responseData.success === true ||
        code === 0 ||
        code === '0' ||
        code === 200 ||
        code === '200' ||
        String(responseData.msg || '').toLowerCase() === 'success' ||
        String(responseData.message || '').toLowerCase() === 'success';

      // Comprehensive payUrl resolution across all gateway response structures
      let resolvedPayUrl = '';
      if (typeof responseData.data === 'string' && (responseData.data.startsWith('http') || responseData.data.startsWith('upi:'))) {
        resolvedPayUrl = responseData.data;
      } else if (typeof data === 'object' && data !== null) {
        resolvedPayUrl = String(
          data.pay_url ||
          data.payUrl ||
          data.payment_url ||
          data.url ||
          data.cashier_url ||
          data.cashierUrl ||
          data.checkout_url ||
          data.checkoutUrl ||
          data.redirect_url ||
          data.redirectUrl ||
          data.pay_info ||
          data.payInfo ||
          data.link ||
          data.payment_link ||
          data.paymentLink ||
          data.qrcode ||
          data.qr_code ||
          data.qrCode ||
          ''
        );
      }

      if (!resolvedPayUrl) {
        resolvedPayUrl = String(
          responseData.pay_url ||
          responseData.payUrl ||
          responseData.payment_url ||
          responseData.url ||
          responseData.cashier_url ||
          responseData.cashierUrl ||
          responseData.checkout_url ||
          responseData.redirect_url ||
          responseData.pay_info ||
          responseData.link ||
          ''
        );
      }

      const orderNo = String(
        data.order_no ||
        data.orderNo ||
        data.orderNumber ||
        data.plat_order_no ||
        data.platOrderNo ||
        data.trade_no ||
        data.tradeNo ||
        data.sys_order_no ||
        responseData.order_no ||
        responseData.orderNo ||
        responseData.order_id ||
        responseData.plat_order_no ||
        responseData.trade_no ||
        ''
      );

      // Deep scan object for any URL starting with http://, https://, or upi://
      if (!resolvedPayUrl && typeof data === 'object' && data !== null) {
        for (const val of Object.values(data)) {
          if (typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://') || val.startsWith('upi://'))) {
            resolvedPayUrl = val;
            break;
          }
        }
      }

      // If the gateway accepted the order but didn't provide a direct redirect URL, construct cashier URL from baseUrl
      if (isSuccess && !resolvedPayUrl && orderNo) {
        resolvedPayUrl = `${baseUrl.replace(/\/+$/, '')}/cashier?orderNo=${encodeURIComponent(orderNo)}&mchOrderNo=${encodeURIComponent(params.mchOrderNo)}`;
      }

      if (isSuccess && (resolvedPayUrl || orderNo)) {
        const mchOrder = String(data.merchant_order_no || data.mchOrderNo || params.mchOrderNo);
        const statusStr = String(data.status || 'pending').toLowerCase();

        return {
          success: true,
          gatewayOrderNo: orderNo || `EAGLE_${Date.now()}`,
          mchOrderNo: mchOrder,
          amount: String(data.amount || params.amount),
          currency: String(data.currency || 'INR'),
          payUrl: resolvedPayUrl || undefined,
          status: statusStr === 'success' ? 'SUCCESS' : 'PENDING',
          rawResponse: responseData,
        };
      }

      const errorMessage = String(
        responseData.message ||
        responseData.msg ||
        responseData.error ||
        responseData.err_msg ||
        'Eagle Pay rejected payment request'
      );

      return {
        success: false,
        mchOrderNo: params.mchOrderNo,
        amount: params.amount,
        currency: 'INR',
        status: 'FAILED',
        errorCode: String(code ?? 'GATEWAY_ERROR'),
        errorMessage,
        rawResponse: responseData,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        mchOrderNo: params.mchOrderNo,
        amount: params.amount,
        currency: 'INR',
        status: 'FAILED',
        errorCode: 'NETWORK_TIMEOUT_OR_ERROR',
        errorMessage: `Failed to connect to Eagle Pay API: ${errorMsg}`,
        rawResponse: { error: errorMsg, rawString },
      };
    }
  }

  /**
   * Verify an incoming callback/webhook from Eagle Pay
   */
  public async verifyCallback(payload: Record<string, unknown>): Promise<VerifyCallbackResult> {
    if (!this.account) {
      throw new Error('EaglePayAdapter not configured with gateway account.');
    }

    const { mchKey, mchId } = this.account;
    const receivedMchId = String(payload.mchId || '');

    // Basic merchant ID sanity check
    if (receivedMchId && receivedMchId !== mchId) {
      return {
        isValid: false,
        mchOrderNo: String(payload.mchOrderNo || ''),
        amount: String(payload.amount || '0'),
        currency: String(payload.currency || 'INR'),
        status: 'FAILED',
        signatureReceived: String(payload.sign || ''),
        signatureCalculated: '',
        rawPayload: payload,
        failureReason: `Merchant ID mismatch: expected ${mchId}, received ${receivedMchId}`,
      };
    }

    const receivedSign = String(payload.sign || '');
    const { isValid, calculatedSign } = SignatureService.verifySignature(payload, receivedSign, mchKey);

    const mchOrderNo = String(payload.mchOrderNo || '');
    const gatewayOrderNo = payload.orderNo ? String(payload.orderNo) : undefined;
    const amount = String(payload.amount || '0');
    const currency = String(payload.currency || 'INR');
    const rawStatus = String(payload.status || '').toLowerCase();

    let status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'UNKNOWN' = 'UNKNOWN';
    if (rawStatus === 'success' || rawStatus === '1') {
      status = 'SUCCESS';
    } else if (rawStatus === 'pending' || rawStatus === '0') {
      status = 'PENDING';
    } else if (rawStatus === 'failed' || rawStatus === '2') {
      status = 'FAILED';
    }

    return {
      isValid,
      mchOrderNo,
      gatewayOrderNo,
      amount,
      currency,
      status,
      paidAt: payload.paidAt ? String(payload.paidAt) : undefined,
      signatureReceived: receivedSign,
      signatureCalculated: calculatedSign,
      rawPayload: payload,
      failureReason: isValid ? undefined : 'Signature verification failed (MD5 mismatch)',
    };
  }

  /**
   * Query status of an order: POST /check-order-status
   */
  public async queryPaymentStatus(mchOrderNo: string): Promise<QueryStatusResult> {
    if (!this.account) {
      throw new Error('EaglePayAdapter not configured with gateway account.');
    }

    const { mchId, mchKey, baseUrl } = this.account;

    const queryPayload: Record<string, unknown> = {
      mchId,
      mchOrderNo,
    };

    const { signature } = SignatureService.generateSignature(queryPayload, mchKey);
    queryPayload.sign = signature;

    const endpoint = `${baseUrl.replace(/\/+$/, '')}/check-order-status`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(queryPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const jsonText = await response.text();
      let responseData: Record<string, unknown> = {};

      try {
        responseData = JSON.parse(jsonText);
      } catch {
        return {
          success: false,
          mchOrderNo,
          status: 'UNKNOWN',
          errorMessage: `Non-JSON response from status query: ${jsonText.slice(0, 100)}`,
          rawResponse: { httpStatus: response.status, body: jsonText },
        };
      }

      const code = responseData.code;
      const data = (responseData.data as Record<string, unknown>) || responseData;
      const isSuccess =
        responseData.success === true ||
        code === 0 ||
        code === '0' ||
        code === 200 ||
        code === '200' ||
        String(responseData.msg || '').toLowerCase() === 'success' ||
        String(responseData.message || '').toLowerCase() === 'success';

      if (isSuccess) {
        // Extract status from our_status, data.status, or gateway_response
        const gwResp = (responseData.gateway_response as Record<string, unknown>) || {};
        const gwData = (gwResp.data as Record<string, unknown>) || {};

        const rawStatus = String(
          responseData.our_status ||
          data.status ||
          gwData.payStatus ||
          data.pay_status ||
          ''
        ).toLowerCase();

        let status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'UNKNOWN' = 'PENDING';

        if (rawStatus === 'success' || rawStatus === '1' || rawStatus === 'paid') {
          status = 'SUCCESS';
        } else if (rawStatus === 'failed' || rawStatus === '2' || rawStatus === 'fail') {
          status = 'FAILED';
        } else if (rawStatus === 'pending' || rawStatus === '0') {
          status = 'PENDING';
        }

        const gatewayOrderNo = String(
          data.orderNo ||
          data.order_no ||
          gwData.orderNo ||
          gwData.mchOrderId ||
          responseData.order_no ||
          ''
        );

        return {
          success: true,
          mchOrderNo,
          gatewayOrderNo: gatewayOrderNo || undefined,
          amount: data.amount ? String(data.amount) : responseData.amount ? String(responseData.amount) : undefined,
          currency: String(data.currency || responseData.currency || 'INR'),
          status,
          rawResponse: responseData,
        };
      }

      return {
        success: false,
        mchOrderNo,
        status: 'UNKNOWN',
        errorMessage: String(
          responseData.message ||
          responseData.msg ||
          responseData.error ||
          'Eagle Pay status query failed'
        ),
        rawResponse: responseData,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        mchOrderNo,
        status: 'UNKNOWN',
        errorMessage: `Status check network error: ${errorMsg}`,
        rawResponse: { error: errorMsg },
      };
    }
  }
}
