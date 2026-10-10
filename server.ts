import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'node:fs';
import { Database } from './server/db/database.js';
import { authRouter } from './server/routes/auth.js';
import { dashboardRouter } from './server/routes/dashboard.js';
import { customerRouter } from './server/routes/customers.js';
import { paymentLinkRouter } from './server/routes/paymentLinks.js';
import { brandRouter } from './server/routes/brands.js';
import { gatewayRouter } from './server/routes/gatewayAccounts.js';
import { webhookRouter } from './server/routes/webhooks.js';
import { reportRouter } from './server/routes/reports.js';
import { auditLogRouter } from './server/routes/auditLogs.js';
import { testRouter } from './server/routes/tests.js';
import { systemRouter } from './server/routes/system.js';
import { publicCheckoutRouter } from './server/routes/publicCheckout.js';
import { SignatureService } from './server/services/SignatureService.js';
import { PaymentOrchestrator } from './server/services/PaymentOrchestrator.js';

const app = express();
const PORT = 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Initialize Database schema and seeds
Database.initialize();

// Parse JSON bodies with raw body capture for webhooks
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);
app.use(express.urlencoded({ extended: true }));

// Security Headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Dedicated Webhook Router: /webhooks/eaglepay
app.use('/webhooks', webhookRouter);

// API Routers
app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/customers', customerRouter);
app.use('/api/payment-links', paymentLinkRouter);
app.use('/api/brands', brandRouter);
app.use('/api/gateway-accounts', gatewayRouter);
app.use('/api/webhooks', webhookRouter);
app.use('/api/reports', reportRouter);
app.use('/api/audit-logs', auditLogRouter);
app.use('/api/tests', testRouter);
app.use('/api/system', systemRouter);
app.use('/api/public', publicCheckoutRouter);

// Sandbox Gateway Simulator Page
// Provides realistic browser checkout redirect experience during testing
app.get('/__sandbox_gateway_simulator', (req: Request, res: Response) => {
  const { orderNo, mchOrderNo, amount } = req.query;
  const links = Database.getPaymentLinks();
  const link = links.find((l) => l.merchantOrderNo === mchOrderNo);
  const brand = Database.getBrands().find((b) => b.id === link?.brandId);

  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Eagle Pay Sandbox Gateway Simulator</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen flex items-center justify-center p-4">
  <div class="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl">
    <div class="flex items-center justify-between pb-4 border-b border-slate-700">
      <div class="flex items-center gap-2">
        <div class="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
        <span class="font-bold text-sm tracking-wide text-emerald-400">EAGLE PAY SANDBOX SIMULATOR</span>
      </div>
      <span class="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">SIMULATION</span>
    </div>

    <div class="my-6 space-y-3">
      <div class="bg-slate-900/60 p-4 rounded-xl space-y-1.5 border border-slate-700/50">
        <div class="text-xs text-slate-400">Merchant Reference</div>
        <div class="font-mono text-sm font-semibold text-slate-200">${mchOrderNo || 'N/A'}</div>
        <div class="text-xs text-slate-400 mt-2">Gateway Order No</div>
        <div class="font-mono text-xs text-slate-400">${orderNo || 'N/A'}</div>
        <div class="text-xs text-slate-400 mt-2">Amount Payable</div>
        <div class="text-3xl font-extrabold text-emerald-400 font-mono">₹${amount || '0.00'}</div>
      </div>

      <div class="text-xs text-slate-400 p-3 bg-slate-800/80 rounded-lg border border-slate-700">
        This is a safe sandbox simulator for development. In production, this redirects to the real Eagle Pay hosted page.
      </div>
    </div>

    <form method="POST" action="/__sandbox_gateway_simulator/complete" class="space-y-3">
      <input type="hidden" name="orderNo" value="${orderNo || ''}">
      <input type="hidden" name="mchOrderNo" value="${mchOrderNo || ''}">
      <input type="hidden" name="amount" value="${amount || '0.00'}">
      <input type="hidden" name="returnUrl" value="/${brand?.slug || 'pay'}/${link?.token || ''}">

      <button type="submit" name="action" value="success" class="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition shadow-lg flex items-center justify-center gap-2">
        Simulate Successful Payment
      </button>

      <button type="submit" name="action" value="fail" class="w-full py-2.5 px-4 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-medium transition text-sm">
        Simulate Payment Failure
      </button>
    </form>
  </div>
</body>
</html>
  `);
});

// Handle sandbox payment simulation action
app.post('/__sandbox_gateway_simulator/complete', async (req: Request, res: Response) => {
  const { orderNo, mchOrderNo, amount, returnUrl, action } = req.body;
  const links = Database.getPaymentLinks();
  const link = links.find((l) => l.merchantOrderNo === mchOrderNo);

  if (link) {
    const accounts = Database.getGatewayAccounts();
    const account = accounts.find((a) => a.id === link.gatewayAccountId);
    const secret = account?.mchKey || 'MCH_SANDBOX_SECRET_KEY_99';

    const payload: Record<string, unknown> = {
      mchId: account?.mchId || 'MCH_EAGLE_SANDBOX_001',
      orderNo: orderNo || `SIM-${Date.now()}`,
      mchOrderNo: link.merchantOrderNo,
      amount: amount || link.amountFormatted,
      status: action === 'success' ? 'success' : 'failed',
      currency: 'INR',
      paidAt: new Date().toISOString(),
    };

    const { signature } = SignatureService.generateSignature(payload, secret);
    payload.sign = signature;

    // Trigger internal webhook processing
    await PaymentOrchestrator.processWebhook(payload, JSON.stringify(payload), 'mock');
  }

  res.redirect(returnUrl || '/');
});

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[EaglePay Server] Running on http://0.0.0.0:${PORT}`);
    console.log(`[EaglePay Server] Webhook listener mounted at /webhooks/eaglepay`);
    console.log(`[EaglePay Server] cPanel PHP package ready in /php-cpanel/`);
  });
}

startServer();
