import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/authMiddleware.js';
import { Database } from '../db/database.js';
import { ExportService } from '../services/ExportService.js';

export const reportRouter = Router();

// GET /api/reports/summary
reportRouter.get('/summary', requireAuth('read_only'), (req: AuthenticatedRequest, res: Response): void => {
  const links = Database.getPaymentLinks();
  const brands = Database.getBrands();
  const gateways = Database.getGatewayAccounts();

  // Brand-wise aggregation
  const brandBreakdown = brands.map((b) => {
    const brandLinks = links.filter((l) => l.brandId === b.id);
    const paidLinks = brandLinks.filter((l) => l.status === 'SUCCESS');
    const totalAmount = paidLinks.reduce((sum, l) => sum + l.amount, 0);

    return {
      brandId: b.id,
      brandName: b.name,
      totalLinks: brandLinks.length,
      paidCount: paidLinks.length,
      totalCollected: Math.round(totalAmount * 100) / 100,
    };
  });

  // Gateway-wise aggregation
  const gatewayBreakdown = gateways.map((g) => {
    const gwLinks = links.filter((l) => l.gatewayAccountId === g.id);
    const paidLinks = gwLinks.filter((l) => l.status === 'SUCCESS');
    const totalAmount = paidLinks.reduce((sum, l) => sum + l.amount, 0);

    return {
      gatewayId: g.id,
      gatewayName: g.name,
      adapter: g.adapter,
      totalLinks: gwLinks.length,
      paidCount: paidLinks.length,
      totalCollected: Math.round(totalAmount * 100) / 100,
    };
  });

  // Daily collection breakdown (last 7 days)
  const now = Date.now();
  const dailyBreakdown: Array<{ date: string; collected: number; count: number }> = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const dEnd = dStart + 86400000;
    const dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const dayPaid = links.filter((l) => {
      if (l.status !== 'SUCCESS' || !l.paidAt) return false;
      const pt = new Date(l.paidAt).getTime();
      return pt >= dStart && pt < dEnd;
    });

    const daySum = dayPaid.reduce((acc, l) => acc + l.amount, 0);
    dailyBreakdown.push({
      date: dateLabel,
      collected: Math.round(daySum * 100) / 100,
      count: dayPaid.length,
    });
  }

  res.json({
    success: true,
    data: {
      brandBreakdown,
      gatewayBreakdown,
      dailyBreakdown,
    },
  });
});

// GET /api/reports/export/csv
reportRouter.get('/export/csv', requireAuth('read_only'), (req: AuthenticatedRequest, res: Response): void => {
  const { type = 'payments' } = req.query;
  const links = Database.getPaymentLinks();
  const customers = Database.getCustomers();
  const brands = Database.getBrands();

  if (type === 'payments') {
    const rows = links.map((l) => {
      const cust = customers.find((c) => c.id === l.customerId);
      const brand = brands.find((b) => b.id === l.brandId);
      return {
        token: l.token,
        orderNo: l.merchantOrderNo,
        customer: cust?.fullName || '',
        brand: brand?.name || '',
        amount: l.amountFormatted,
        currency: l.currency,
        status: l.status,
        createdAt: l.createdAt,
        paidAt: l.paidAt || '',
      };
    });

    const csv = ExportService.toCsv(rows, [
      { key: 'token', label: 'Token' },
      { key: 'orderNo', label: 'Merchant Order No' },
      { key: 'customer', label: 'Customer' },
      { key: 'brand', label: 'Brand' },
      { key: 'amount', label: 'Amount' },
      { key: 'currency', label: 'Currency' },
      { key: 'status', label: 'Status' },
      { key: 'createdAt', label: 'Created At' },
      { key: 'paidAt', label: 'Paid At' },
    ]);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="payments_report.csv"');
    res.send(csv);
    return;
  }

  res.status(400).json({ success: false, error: 'Unsupported report export type.' });
});
