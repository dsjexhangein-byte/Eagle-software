import crypto from 'node:crypto';
import { Database } from '../db/database.js';
import { GatewayFactory } from '../adapters/GatewayFactory.js';
import { PaymentLink, PaymentStatus, Transaction, WebhookLog } from '../types.js';

export interface CreatePaymentLinkDTO {
  customerId?: string;
  customerName?: string;
  customerMobile?: string;
  customerEmail?: string;
  panNumber?: string;
  bankAccount?: string;
  executiveName?: string;
  loanOrderNumber?: string;
  repaymentDate?: string;
  brandId: string;
  gatewayAccountId: string;
  amount: number;
  description?: string;
  externalReference?: string;
  expiresInHours?: number;
  adminId: string;
}

export class PaymentOrchestrator {
  /**
   * Generate an unpredictable, cryptographically random public token
   * Format: PAY + 6-8 uppercase alphanumeric chars, e.g. "PAY8F72K9"
   */
  public static generateSecureToken(): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // exclude easily confused chars (0, 1, I, O)
    let token = 'PAY';
    const bytes = crypto.randomBytes(6);
    for (let i = 0; i < 6; i++) {
      token += chars[bytes[i] % chars.length];
    }
    return token;
  }

  /**
   * Create a new payment link (with optional inline customer creation)
   */
  public static createPaymentLink(dto: CreatePaymentLinkDTO): { success: boolean; link?: PaymentLink; error?: string } {
    // 1. Amount validation
    if (!dto.amount || isNaN(dto.amount) || dto.amount <= 0) {
      return { success: false, error: 'Amount must be a positive number greater than zero.' };
    }

    const safeAmount = Math.round(dto.amount * 100) / 100;
    const amountFormatted = safeAmount.toFixed(2);

    // 2. Resolve or create customer inline
    const customers = Database.getCustomers();
    let customer = dto.customerId ? customers.find((c) => c.id === dto.customerId) : undefined;

    if (!customer) {
      if (!dto.customerName || !dto.customerMobile) {
        return { success: false, error: 'Customer Name and Mobile Number are required.' };
      }

      const cleanMobile = dto.customerMobile.replace(/[^0-9+]/g, '');
      const cleanEmail = (dto.customerEmail || `${cleanMobile}@customer.portal`).toLowerCase().trim();

      // Find existing by mobile or create new
      customer = customers.find((c) => c.mobile === cleanMobile);
      if (!customer) {
        customer = {
          id: 'cust_' + crypto.randomBytes(6).toString('hex'),
          fullName: dto.customerName.trim(),
          mobile: cleanMobile,
          email: cleanEmail,
          panNumber: dto.panNumber?.trim() || undefined,
          bankAccount: dto.bankAccount?.trim() || undefined,
          executiveName: dto.executiveName?.trim() || undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        customers.unshift(customer);
        Database.saveCustomers(customers);
      } else {
        // Update customer details if provided
        if (dto.panNumber) customer.panNumber = dto.panNumber.trim();
        if (dto.bankAccount) customer.bankAccount = dto.bankAccount.trim();
        if (dto.executiveName) customer.executiveName = dto.executiveName.trim();
        customer.updatedAt = new Date().toISOString();
        Database.saveCustomers(customers);
      }
    }

    // 3. Validate brand
    const brands = Database.getBrands();
    const brand = brands.find((b) => b.id === dto.brandId && b.isActive);
    if (!brand) {
      return { success: false, error: 'Specified brand does not exist or is inactive.' };
    }

    // 4. Validate gateway account
    const accounts = Database.getGatewayAccounts();
    const account = accounts.find((a) => a.id === dto.gatewayAccountId && a.isActive);
    if (!account) {
      return { success: false, error: 'Specified gateway account does not exist or is inactive.' };
    }

    // 5. Generate unique token & unique order reference
    let token = this.generateSecureToken();
    const links = Database.getPaymentLinks();
    while (links.some((l) => l.token === token)) {
      token = this.generateSecureToken();
    }

    const merchantOrderNo = `ORD-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const hours = dto.expiresInHours && dto.expiresInHours > 0 ? dto.expiresInHours : 72;
    const expiresAt = new Date(Date.now() + hours * 3600 * 1000).toISOString();

    // Default repayment date formatted DD/MM/YYYY
    const repDate = dto.repaymentDate?.trim() || new Date(Date.now() + hours * 3600 * 1000).toLocaleDateString('en-GB');

    const newLink: PaymentLink = {
      id: 'plink_' + crypto.randomBytes(6).toString('hex'),
      token,
      customerId: customer.id,
      brandId: brand.id,
      gatewayAccountId: account.id,
      merchantOrderNo,
      amount: safeAmount,
      amountFormatted,
      currency: 'INR',
      description: dto.description || `${brand.name} Repayment`,
      externalReference: dto.externalReference,
      panNumber: dto.panNumber || customer.panNumber,
      bankAccount: dto.bankAccount || customer.bankAccount,
      executiveName: dto.executiveName || customer.executiveName,
      loanOrderNumber: dto.loanOrderNumber || `${Math.floor(1000000 + Math.random() * 9000000)}`,
      repaymentDate: repDate,
      status: 'CREATED',
      isEnabled: true,
      expiresAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdByAdminId: dto.adminId,
    };

    links.unshift(newLink);
    Database.savePaymentLinks(links);

    // Record initial status history
    const history = Database.getPaymentStatusHistory();
    history.unshift({
      id: 'psh_' + crypto.randomBytes(6).toString('hex'),
      paymentLinkId: newLink.id,
      previousStatus: 'CREATED',
      newStatus: 'CREATED',
      source: 'INITIAL',
      reason: 'Payment link generated',
      actor: dto.adminId,
      createdAt: new Date().toISOString(),
    });
    Database.savePaymentStatusHistory(history);

    Database.appendAuditLog({
      adminId: dto.adminId,
      adminUsername: 'admin',
      action: 'PAYMENT_LINK_CREATED',
      entityType: 'PAYMENT_LINK',
      entityId: newLink.id,
      details: `Generated link ${newLink.token} for ₹${amountFormatted} (Customer: ${customer.fullName})`,
    });

    return { success: true, link: newLink };
  }

  /**
   * Initiate customer checkout when clicking "Pay Now" on the public page
   */
  public static async initiateCheckout(
    token: string,
    originUrl?: string
  ): Promise<{
    success: boolean;
    payUrl?: string;
    isSimulated?: boolean;
    status: PaymentStatus;
    error?: string;
  }> {
    const links = Database.getPaymentLinks();
    const link = links.find((l) => l.token === token);

    if (!link) {
      return { success: false, status: 'FAILED', error: 'Payment link not found.' };
    }

    if (!link.isEnabled) {
      return { success: false, status: 'FAILED', error: 'This payment link has been disabled by the administrator.' };
    }

    if (link.status === 'SUCCESS') {
      return { success: false, status: 'SUCCESS', error: 'This payment has already been completed.' };
    }

    const isExpired = new Date(link.expiresAt).getTime() < Date.now();
    if (isExpired) {
      if (link.status !== 'EXPIRED') {
        link.status = 'EXPIRED';
        Database.savePaymentLinks(links);
      }
      return { success: false, status: 'EXPIRED', error: 'This payment link has expired.' };
    }

    // Resolve gateway account
    const accounts = Database.getGatewayAccounts();
    const account = accounts.find((a) => a.id === link.gatewayAccountId);
    if (!account) {
      return { success: false, status: 'FAILED', error: 'Configured gateway account is not available.' };
    }

    const adapter = GatewayFactory.create(account);
    const customers = Database.getCustomers();
    const customer = customers.find((c) => c.id === link.customerId);
    const brands = Database.getBrands();
    const brand = brands.find((b) => b.id === link.brandId);

    // Track attempt count to ensure unique mchOrderNo for time-sensitive gateways like Eagle Pay
    const attemptIndex = (((link as any).attemptCount as number) || 0) + 1;
    (link as any).attemptCount = attemptIndex;
    const attemptMchOrderNo = attemptIndex === 1 ? link.merchantOrderNo : `${link.merchantOrderNo}_${attemptIndex}`;

    const baseUrl = originUrl || (Database.getSystemSettings().siteUrl || 'https://example.com');
    const notifyUrl = `${baseUrl.replace(/\/+$/, '')}/webhooks/eaglepay`;
    const returnUrl = `${baseUrl.replace(/\/+$/, '')}/${brand?.slug || 'pay'}/${link.token}`;

    const createResult = await adapter.createPayment({
      mchOrderNo: attemptMchOrderNo,
      amount: link.amountFormatted,
      notifyUrl,
      returnUrl,
      tradeType: account.tradeType || 'INRUPI',
      extra: JSON.stringify({ token: link.token, brandSlug: brand?.slug }),
      customerName: customer?.fullName,
      customerMobile: customer?.mobile,
      customerEmail: customer?.email,
    });

    if (createResult.success) {
      link.status = 'PENDING';
      link.gatewayOrderNo = createResult.gatewayOrderNo;
      link.gatewayPayUrl = createResult.payUrl;
      (link as any).currentGatewayMchOrderNo = attemptMchOrderNo;
      const currentAttempts = ((link as any).orderAttempts as string[]) || [];
      if (!currentAttempts.includes(attemptMchOrderNo)) {
        currentAttempts.push(attemptMchOrderNo);
      }
      (link as any).orderAttempts = currentAttempts;
      (link as any).lastInitiatedAt = new Date().toISOString();
      link.updatedAt = new Date().toISOString();
      Database.savePaymentLinks(links);

      // Record transaction entry
      const transactions = Database.getTransactions();
      transactions.unshift({
        id: 'tx_' + crypto.randomBytes(6).toString('hex'),
        paymentLinkId: link.id,
        merchantOrderNo: attemptMchOrderNo,
        gatewayOrderNo: createResult.gatewayOrderNo,
        amount: link.amount,
        currency: link.currency,
        status: 'PENDING',
        gatewayResponseRaw: JSON.stringify(createResult.rawResponse),
        createdAt: new Date().toISOString(),
      });
      Database.saveTransactions(transactions);

      // Update history
      const history = Database.getPaymentStatusHistory();
      history.unshift({
        id: 'psh_' + crypto.randomBytes(6).toString('hex'),
        paymentLinkId: link.id,
        previousStatus: 'CREATED',
        newStatus: 'PENDING',
        source: 'CHECKOUT_START',
        reason: `Payment gateway order initiated (attempt #${attemptIndex})`,
        actor: 'Customer Checkout',
        createdAt: new Date().toISOString(),
      });
      Database.savePaymentStatusHistory(history);

      return {
        success: true,
        payUrl: createResult.payUrl,
        status: 'PENDING',
        isSimulated: account.isSandbox,
      };
    }

    return {
      success: false,
      status: 'FAILED',
      error: createResult.errorMessage || 'Payment gateway failed to initialize checkout.',
    };
  }

  /**
   * Process incoming Webhook / Callback from gateway
   */
  public static async processWebhook(
    payload: Record<string, unknown>,
    rawBody: string,
    sourceGateway = 'eaglepay'
  ): Promise<{
    httpCode: number;
    responseBody: string;
    logId: string;
    status: 'SUCCESS' | 'FAILED' | 'IGNORED_DUPLICATE' | 'SIGNATURE_MISMATCH' | 'ORDER_NOT_FOUND';
  }> {
    const mchOrderNo = String(payload.mchOrderNo || '');
    const receivedSign = String(payload.sign || '');

    const links = Database.getPaymentLinks();
    const link = links.find((l) =>
      l.merchantOrderNo === mchOrderNo ||
      (l as any).currentGatewayMchOrderNo === mchOrderNo ||
      (((l as any).orderAttempts as string[]) || []).includes(mchOrderNo) ||
      mchOrderNo.startsWith(l.merchantOrderNo)
    );

    let processingStatus: 'SUCCESS' | 'FAILED' | 'IGNORED_DUPLICATE' | 'SIGNATURE_MISMATCH' | 'ORDER_NOT_FOUND' = 'SUCCESS';
    let calculatedSign = '';
    let isSignatureValid = false;

    if (!link) {
      processingStatus = 'ORDER_NOT_FOUND';
    } else {
      const accounts = Database.getGatewayAccounts();
      const account = accounts.find((a) => a.id === link.gatewayAccountId);

      if (!account) {
        processingStatus = 'FAILED';
      } else {
        const adapter = GatewayFactory.create(account);
        const verification = await adapter.verifyCallback(payload);

        isSignatureValid = verification.isValid;
        calculatedSign = verification.signatureCalculated;

        if (!isSignatureValid) {
          processingStatus = 'SIGNATURE_MISMATCH';
        } else {
          // Check idempotency: If payment is ALREADY SUCCESS, do not re-process or downgrade!
          if (link.status === 'SUCCESS') {
            processingStatus = 'IGNORED_DUPLICATE';
          } else {
            // Apply verified status transition
            const previousStatus = link.status;
            if (verification.status === 'SUCCESS') {
              link.status = 'SUCCESS';
              link.paidAt = verification.paidAt || new Date().toISOString();
              if (verification.gatewayOrderNo) {
                link.gatewayOrderNo = verification.gatewayOrderNo;
              }
              link.updatedAt = new Date().toISOString();
              Database.savePaymentLinks(links);

              // Record in transaction table
              const txs = Database.getTransactions();
              txs.unshift({
                id: 'tx_' + crypto.randomBytes(6).toString('hex'),
                paymentLinkId: link.id,
                merchantOrderNo: link.merchantOrderNo,
                gatewayOrderNo: verification.gatewayOrderNo,
                amount: parseFloat(verification.amount) || link.amount,
                currency: verification.currency,
                status: 'SUCCESS',
                callbackReceivedAt: new Date().toISOString(),
                gatewayResponseRaw: JSON.stringify(payload),
                createdAt: new Date().toISOString(),
              });
              Database.saveTransactions(txs);

              // Update history
              const history = Database.getPaymentStatusHistory();
              history.unshift({
                id: 'psh_' + crypto.randomBytes(6).toString('hex'),
                paymentLinkId: link.id,
                previousStatus,
                newStatus: 'SUCCESS',
                source: 'WEBHOOK',
                reason: 'Verified callback signature matched',
                actor: 'Gateway Callback',
                createdAt: new Date().toISOString(),
              });
              Database.savePaymentStatusHistory(history);
            } else if (verification.status === 'FAILED') {
              link.status = 'FAILED';
              link.updatedAt = new Date().toISOString();
              Database.savePaymentLinks(links);

              const history = Database.getPaymentStatusHistory();
              history.unshift({
                id: 'psh_' + crypto.randomBytes(6).toString('hex'),
                paymentLinkId: link.id,
                previousStatus,
                newStatus: 'FAILED',
                source: 'WEBHOOK',
                reason: 'Gateway reported payment failed',
                actor: 'Gateway Callback',
                createdAt: new Date().toISOString(),
              });
              Database.savePaymentStatusHistory(history);
            }
          }
        }
      }
    }

    const httpStatusCode = isSignatureValid ? 200 : 400;
    const responseSent = isSignatureValid ? 'success' : 'fail';

    // Store in webhook_logs table
    const logId = 'wh_log_' + crypto.randomBytes(6).toString('hex');
    const logEntry: WebhookLog = {
      id: logId,
      sourceGateway,
      endpoint: '/webhooks/eaglepay',
      payload,
      rawBody,
      signatureReceived: receivedSign,
      signatureCalculated: calculatedSign,
      isSignatureValid,
      processingStatus,
      merchantOrderNo: mchOrderNo,
      responseSent,
      httpStatusCode,
      createdAt: new Date().toISOString(),
    };

    const logs = Database.getWebhookLogs();
    logs.unshift(logEntry);
    Database.saveWebhookLogs(logs);

    return {
      httpCode: httpStatusCode,
      responseBody: responseSent,
      logId,
      status: processingStatus,
    };
  }

  /**
   * Actively query gateway status for a payment link and update internal state
   */
  public static async queryAndUpdateStatus(
    paymentLinkId: string,
    actor = 'admin'
  ): Promise<{ success: boolean; status: PaymentStatus; message: string }> {
    const links = Database.getPaymentLinks();
    const link = links.find((l) => l.id === paymentLinkId);

    if (!link) {
      return { success: false, status: 'FAILED', message: 'Payment link not found.' };
    }

    // Never downgrade an already verified SUCCESS payment
    if (link.status === 'SUCCESS') {
      return { success: true, status: 'SUCCESS', message: 'Payment is already confirmed and verified.' };
    }

    const accounts = Database.getGatewayAccounts();
    const account = accounts.find((a) => a.id === link.gatewayAccountId);
    if (!account) {
      return { success: false, status: link.status, message: 'Gateway account not found.' };
    }

    const adapter = GatewayFactory.create(account);
    const orderNoToQuery = (link as any).currentGatewayMchOrderNo || link.merchantOrderNo;
    const queryResult = await adapter.queryPaymentStatus(orderNoToQuery);

    if (!queryResult.success) {
      return { success: false, status: link.status, message: queryResult.errorMessage || 'Gateway status check failed' };
    }

    const previousStatus = link.status;
    let updated = false;

    if (queryResult.status === 'SUCCESS') {
      link.status = 'SUCCESS';
      link.paidAt = new Date().toISOString();
      if (queryResult.gatewayOrderNo) {
        link.gatewayOrderNo = queryResult.gatewayOrderNo;
      }
      updated = true;
    } else if (queryResult.status === 'FAILED') {
      link.status = 'FAILED';
      updated = true;
    }

    if (updated) {
      link.updatedAt = new Date().toISOString();
      Database.savePaymentLinks(links);

      const history = Database.getPaymentStatusHistory();
      history.unshift({
        id: 'psh_' + crypto.randomBytes(6).toString('hex'),
        paymentLinkId: link.id,
        previousStatus,
        newStatus: link.status,
        source: 'MANUAL_RECHECK',
        reason: 'Active query to gateway confirmed new status',
        actor,
        createdAt: new Date().toISOString(),
      });
      Database.savePaymentStatusHistory(history);
    }

    return {
      success: true,
      status: link.status,
      message: `Status checked: ${link.status}`,
    };
  }
}
