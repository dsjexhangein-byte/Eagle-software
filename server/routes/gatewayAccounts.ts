import { Router, Response } from 'express';
import crypto from 'node:crypto';
import { AuthenticatedRequest, requireAuth } from '../middleware/authMiddleware.js';
import { Database } from '../db/database.js';
import { GatewayAccount } from '../types.js';
import { GatewayFactory } from '../adapters/GatewayFactory.js';

export const gatewayRouter = Router();

function maskSecret(secret: string): string {
  if (!secret || secret.length < 6) return '••••••••';
  return secret.slice(0, 3) + '••••••••' + secret.slice(-3);
}

// GET /api/gateway-accounts
gatewayRouter.get('/', requireAuth('read_only'), (req: AuthenticatedRequest, res: Response): void => {
  const accounts = Database.getGatewayAccounts();
  const safeAccounts = accounts.map((a) => ({
    ...a,
    mchKeyMasked: maskSecret(a.mchKey),
    mchKey: undefined, // Never expose raw key in list
  }));

  res.json({ success: true, accounts: safeAccounts });
});

// POST /api/gateway-accounts
gatewayRouter.post('/', requireAuth('super_admin'), (req: AuthenticatedRequest, res: Response): void => {
  const { name, adapter, mchId, mchKey, baseUrl, isSandbox, tradeType, notifyUrl, returnUrl } = req.body;

  if (!name || !mchId || !mchKey) {
    res.status(400).json({ success: false, error: 'Name, Merchant ID (mchId), and Secret Key (mchKey) are required.' });
    return;
  }

  const newAccount: GatewayAccount = {
    id: 'gw_' + crypto.randomBytes(6).toString('hex'),
    name: name.trim(),
    adapter: (adapter || 'eaglepay') as 'eaglepay' | 'mock',
    mchId: mchId.trim(),
    mchKey: mchKey.trim(),
    baseUrl: baseUrl?.trim() || 'https://xgxbscfgfhtiizzxipog.supabase.co/functions/v1',
    isSandbox: Boolean(isSandbox),
    tradeType: tradeType?.trim() || 'INRUPI',
    notifyUrl: notifyUrl?.trim() || 'https://example.com/webhooks/eaglepay',
    returnUrl: returnUrl?.trim() || 'https://example.com/status',
    isActive: true,
    lastTestedAt: null,
    lastTestStatus: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const accounts = Database.getGatewayAccounts();
  accounts.push(newAccount);
  Database.saveGatewayAccounts(accounts);

  Database.appendAuditLog({
    adminId: req.adminUser!.id,
    adminUsername: req.adminUser!.username,
    action: 'GATEWAY_ACCOUNT_CREATED',
    entityType: 'GATEWAY',
    entityId: newAccount.id,
    details: `Added gateway account "${newAccount.name}" (${newAccount.adapter})`,
  });

  res.status(201).json({
    success: true,
    account: { ...newAccount, mchKeyMasked: maskSecret(newAccount.mchKey), mchKey: undefined },
  });
});

// PUT /api/gateway-accounts/:id
gatewayRouter.put('/:id', requireAuth('super_admin'), (req: AuthenticatedRequest, res: Response): void => {
  const { name, mchId, mchKey, baseUrl, isSandbox, tradeType, notifyUrl, returnUrl, isActive } = req.body;
  const accounts = Database.getGatewayAccounts();
  const account = accounts.find((a) => a.id === req.params.id);

  if (!account) {
    res.status(404).json({ success: false, error: 'Gateway account not found.' });
    return;
  }

  if (name) account.name = name.trim();
  if (mchId) account.mchId = mchId.trim();
  // Only update secret key if provided and not masked
  if (mchKey && !mchKey.includes('••••')) {
    account.mchKey = mchKey.trim();
  }
  if (baseUrl) account.baseUrl = baseUrl.trim();
  if (isSandbox !== undefined) account.isSandbox = Boolean(isSandbox);
  if (tradeType) account.tradeType = tradeType.trim();
  if (notifyUrl) account.notifyUrl = notifyUrl.trim();
  if (returnUrl) account.returnUrl = returnUrl.trim();
  if (isActive !== undefined) account.isActive = Boolean(isActive);
  account.updatedAt = new Date().toISOString();

  Database.saveGatewayAccounts(accounts);

  Database.appendAuditLog({
    adminId: req.adminUser!.id,
    adminUsername: req.adminUser!.username,
    action: 'GATEWAY_ACCOUNT_UPDATED',
    entityType: 'GATEWAY',
    entityId: account.id,
    details: `Updated gateway account settings for "${account.name}"`,
  });

  res.json({
    success: true,
    account: { ...account, mchKeyMasked: maskSecret(account.mchKey), mchKey: undefined },
  });
});

// POST /api/gateway-accounts/:id/test
gatewayRouter.post('/:id/test', requireAuth('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const account = Database.getGatewayAccounts().find((a) => a.id === req.params.id);
  if (!account) {
    res.status(404).json({ success: false, error: 'Gateway account not found.' });
    return;
  }

  try {
    const adapter = GatewayFactory.create(account);
    const testResult = await adapter.queryPaymentStatus('TEST_PROBE_CONN_' + Date.now());

    account.lastTestedAt = new Date().toISOString();
    // In live or sandbox, if endpoint responded without network error, consider reachable
    account.lastTestStatus = 'SUCCESS';
    Database.saveGatewayAccounts(Database.getGatewayAccounts());

    res.json({
      success: true,
      message: account.isSandbox
        ? 'Sandbox simulator connection verified.'
        : 'Eagle Pay Supabase API responded successfully.',
      details: testResult,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    account.lastTestedAt = new Date().toISOString();
    account.lastTestStatus = 'FAILED';
    Database.saveGatewayAccounts(Database.getGatewayAccounts());

    res.status(500).json({
      success: false,
      error: `Gateway test failed: ${msg}`,
    });
  }
});
