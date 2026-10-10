import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/authMiddleware.js';
import { Database } from '../db/database.js';
import { PaymentOrchestrator } from '../services/PaymentOrchestrator.js';
import { ExportService } from '../services/ExportService.js';

export const paymentLinkRouter = Router();

// GET /api/payment-links
paymentLinkRouter.get('/', requireAuth('read_only'), (req: AuthenticatedRequest, res: Response): void => {
  const { status, brandId, customerId, search } = req.query;
  let links = Database.getPaymentLinks();

  if (status && typeof status === 'string' && status !== 'ALL') {
    links = links.filter((l) => l.status === status);
  }
  if (brandId && typeof brandId === 'string' && brandId !== 'ALL') {
    links = links.filter((l) => l.brandId === brandId);
  }
  if (customerId && typeof customerId === 'string') {
    links = links.filter((l) => l.customerId === customerId);
  }
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    const customers = Database.getCustomers();
    links = links.filter((l) => {
      const cust = customers.find((c) => c.id === l.customerId);
      return (
        l.token.toLowerCase().includes(q) ||
        l.merchantOrderNo.toLowerCase().includes(q) ||
        (l.externalReference && l.externalReference.toLowerCase().includes(q)) ||
        (cust && cust.fullName.toLowerCase().includes(q))
      );
    });
  }

  const customers = Database.getCustomers();
  const brands = Database.getBrands();
  const gateways = Database.getGatewayAccounts();

  const enriched = links.map((l) => {
    const customer = customers.find((c) => c.id === l.customerId);
    const brand = brands.find((b) => b.id === l.brandId);
    const gateway = gateways.find((g) => g.id === l.gatewayAccountId);
    const isExpired = new Date(l.expiresAt).getTime() < Date.now();

    return {
      ...l,
      customerName: customer?.fullName || 'N/A',
      customerMobile: customer?.mobile || 'N/A',
      customerEmail: customer?.email || 'N/A',
      brandName: brand?.name || 'N/A',
      brandSlug: brand?.slug || 'pay',
      brandLogo: brand?.logoUrl,
      gatewayName: gateway?.name || 'N/A',
      isExpired,
      publicUrl: `/${brand?.slug || 'pay'}/${l.token}`,
    };
  });

  res.json({ success: true, links: enriched });
});

// GET /api/payment-links/:id
paymentLinkRouter.get('/:id', requireAuth('read_only'), (req: AuthenticatedRequest, res: Response): void => {
  const links = Database.getPaymentLinks();
  const link = links.find((l) => l.id === req.params.id || l.token === req.params.id);

  if (!link) {
    res.status(404).json({ success: false, error: 'Payment link not found.' });
    return;
  }

  const customer = Database.getCustomers().find((c) => c.id === link.customerId);
  const brand = Database.getBrands().find((b) => b.id === link.brandId);
  const gateway = Database.getGatewayAccounts().find((g) => g.id === link.gatewayAccountId);
  const history = Database.getPaymentStatusHistory().filter((h) => h.paymentLinkId === link.id);
  const transactions = Database.getTransactions().filter((t) => t.paymentLinkId === link.id);

  res.json({
    success: true,
    link: {
      ...link,
      customer,
      brand,
      gateway,
      history,
      transactions,
      publicUrl: `/${brand?.slug || 'pay'}/${link.token}`,
    },
  });
});

// POST /api/payment-links
paymentLinkRouter.post('/', requireAuth(['operator', 'link_creator']), (req: AuthenticatedRequest, res: Response): void => {
  const {
    customerId,
    customerName,
    customerMobile,
    customerEmail,
    panNumber,
    bankAccount,
    executiveName,
    loanOrderNumber,
    repaymentDate,
    brandId,
    gatewayAccountId,
    amount,
    description,
    externalReference,
    expiresInHours,
  } = req.body;

  const result = PaymentOrchestrator.createPaymentLink({
    customerId,
    customerName,
    customerMobile,
    customerEmail,
    panNumber,
    bankAccount,
    executiveName,
    loanOrderNumber,
    repaymentDate,
    brandId,
    gatewayAccountId,
    amount: parseFloat(amount),
    description,
    externalReference,
    expiresInHours: expiresInHours ? parseInt(expiresInHours, 10) : undefined,
    adminId: req.adminUser!.id,
  });

  if (!result.success) {
    res.status(400).json({ success: false, error: result.error });
    return;
  }

  res.status(201).json({ success: true, link: result.link });
});

// PATCH /api/payment-links/:id/toggle
paymentLinkRouter.patch('/:id/toggle', requireAuth('operator'), (req: AuthenticatedRequest, res: Response): void => {
  const links = Database.getPaymentLinks();
  const link = links.find((l) => l.id === req.params.id);

  if (!link) {
    res.status(404).json({ success: false, error: 'Payment link not found.' });
    return;
  }

  link.isEnabled = !link.isEnabled;
  link.updatedAt = new Date().toISOString();
  Database.savePaymentLinks(links);

  Database.appendAuditLog({
    adminId: req.adminUser!.id,
    adminUsername: req.adminUser!.username,
    action: link.isEnabled ? 'PAYMENT_LINK_ENABLED' : 'PAYMENT_LINK_DISABLED',
    entityType: 'PAYMENT_LINK',
    entityId: link.id,
    details: `${link.isEnabled ? 'Enabled' : 'Disabled'} payment link ${link.token}`,
  });

  res.json({ success: true, isEnabled: link.isEnabled });
});

// POST /api/payment-links/:id/recheck
paymentLinkRouter.post('/:id/recheck', requireAuth('operator'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const result = await PaymentOrchestrator.queryAndUpdateStatus(req.params.id, req.adminUser!.username);
  res.json(result);
});

// GET /api/payment-links/export/csv
paymentLinkRouter.get('/export/csv', requireAuth('read_only'), (req: AuthenticatedRequest, res: Response): void => {
  const links = Database.getPaymentLinks();
  const customers = Database.getCustomers();
  const brands = Database.getBrands();

  const rows = links.map((l) => {
    const cust = customers.find((c) => c.id === l.customerId);
    const brand = brands.find((b) => b.id === l.brandId);
    return {
      token: l.token,
      merchantOrderNo: l.merchantOrderNo,
      customer: cust?.fullName || '',
      mobile: cust?.mobile || '',
      brand: brand?.name || '',
      amount: l.amountFormatted,
      currency: l.currency,
      status: l.status,
      isEnabled: l.isEnabled ? 'Yes' : 'No',
      createdAt: l.createdAt,
      expiresAt: l.expiresAt,
      paidAt: l.paidAt || '',
    };
  });

  const csv = ExportService.toCsv(rows, [
    { key: 'token', label: 'Link Token' },
    { key: 'merchantOrderNo', label: 'Merchant Order No' },
    { key: 'customer', label: 'Customer Name' },
    { key: 'mobile', label: 'Customer Mobile' },
    { key: 'brand', label: 'Brand' },
    { key: 'amount', label: 'Amount (INR)' },
    { key: 'currency', label: 'Currency' },
    { key: 'status', label: 'Status' },
    { key: 'isEnabled', label: 'Enabled' },
    { key: 'createdAt', label: 'Created At' },
    { key: 'expiresAt', label: 'Expires At' },
    { key: 'paidAt', label: 'Paid At' },
  ]);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="payment_links_export.csv"');
  res.send(csv);
});
