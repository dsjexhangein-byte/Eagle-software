import { Router, Request, Response } from 'express';
import { PaymentOrchestrator } from '../services/PaymentOrchestrator.js';
import { Database } from '../db/database.js';
import { AuthenticatedRequest, requireAuth } from '../middleware/authMiddleware.js';
import { SignatureService } from '../services/SignatureService.js';

export const webhookRouter = Router();

// Dedicated Eagle Pay Callback Endpoint: POST /webhooks/eaglepay
webhookRouter.post('/eaglepay', async (req: Request, res: Response): Promise<void> => {
  const payload = req.body || {};
  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

  const result = await PaymentOrchestrator.processWebhook(payload, rawBody, 'eaglepay');

  res.status(result.httpCode);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(result.responseBody);
});

// Admin Inspection: GET /api/webhooks/logs
webhookRouter.get('/logs', requireAuth('read_only'), (req: AuthenticatedRequest, res: Response): void => {
  const logs = Database.getWebhookLogs();
  res.json({ success: true, logs });
});

// Admin Simulator: POST /api/webhooks/simulate
// Allows testing callback delivery, signature calculation, and state updates safely
webhookRouter.post('/simulate', requireAuth('operator'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { paymentLinkId, simulatedStatus, orderNo, tamperedSignature } = req.body;

  const links = Database.getPaymentLinks();
  const link = links.find((l) => l.id === paymentLinkId);

  if (!link) {
    res.status(404).json({ success: false, error: 'Payment link not found.' });
    return;
  }

  const accounts = Database.getGatewayAccounts();
  const account = accounts.find((a) => a.id === link.gatewayAccountId);

  if (!account) {
    res.status(400).json({ success: false, error: 'Gateway account not configured for this link.' });
    return;
  }

  const payload: Record<string, unknown> = {
    mchId: account.mchId,
    orderNo: orderNo || `SIM-CALLBACK-${Date.now()}`,
    mchOrderNo: link.merchantOrderNo,
    amount: link.amountFormatted,
    currency: link.currency,
    status: simulatedStatus || 'success',
    tradeType: account.tradeType || 'INRUPI',
    paidAt: new Date().toISOString(),
  };

  // Generate legitimate signature using secret key
  const { signature, rawString } = SignatureService.generateSignature(payload, account.mchKey);

  if (tamperedSignature) {
    payload.sign = 'TAMPERED_BAD_SIGNATURE_999999999';
  } else {
    payload.sign = signature;
  }

  const rawJson = JSON.stringify(payload, null, 2);
  const result = await PaymentOrchestrator.processWebhook(payload, rawJson, account.adapter);

  const recentLogs = Database.getWebhookLogs();
  const createdLog = recentLogs.find((l) => l.id === result.logId);

  res.json({
    success: true,
    simulationResult: {
      httpCode: result.httpCode,
      responseBody: result.responseBody,
      status: result.status,
      rawString,
      generatedSign: signature,
      payloadSent: payload,
      logEntry: createdLog,
    },
  });
});
