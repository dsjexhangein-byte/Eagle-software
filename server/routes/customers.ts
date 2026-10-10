import { Router, Response } from 'express';
import crypto from 'node:crypto';
import { AuthenticatedRequest, requireAuth } from '../middleware/authMiddleware.js';
import { Database } from '../db/database.js';
import { Customer } from '../types.js';
import { ExportService } from '../services/ExportService.js';

export const customerRouter = Router();

// GET /api/customers
customerRouter.get('/', requireAuth('read_only'), (req: AuthenticatedRequest, res: Response): void => {
  const { search } = req.query;
  let customers = Database.getCustomers();

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    customers = customers.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.mobile.includes(q) ||
        (c.externalReference && c.externalReference.toLowerCase().includes(q))
    );
  }

  // Count payment links per customer
  const links = Database.getPaymentLinks();
  const enhanced = customers.map((c) => {
    const custLinks = links.filter((l) => l.customerId === c.id);
    const paidLinks = custLinks.filter((l) => l.status === 'SUCCESS');
    const totalPaid = paidLinks.reduce((sum, l) => sum + l.amount, 0);

    return {
      ...c,
      totalLinks: custLinks.length,
      paidLinks: paidLinks.length,
      totalPaidAmount: Math.round(totalPaid * 100) / 100,
    };
  });

  res.json({ success: true, customers: enhanced });
});

// GET /api/customers/:id
customerRouter.get('/:id', requireAuth('read_only'), (req: AuthenticatedRequest, res: Response): void => {
  const customer = Database.getCustomers().find((c) => c.id === req.params.id);
  if (!customer) {
    res.status(404).json({ success: false, error: 'Customer not found.' });
    return;
  }

  const links = Database.getPaymentLinks().filter((l) => l.customerId === customer.id);
  res.json({ success: true, customer, links });
});

// POST /api/customers
customerRouter.post('/', requireAuth('operator'), (req: AuthenticatedRequest, res: Response): void => {
  const { fullName, mobile, email, externalReference, businessReference, notes } = req.body;

  if (!fullName || !mobile || !email) {
    res.status(400).json({ success: false, error: 'Full name, mobile number, and email are required.' });
    return;
  }

  // Mobile validation
  const cleanMobile = mobile.replace(/[^0-9+]/g, '');
  if (cleanMobile.length < 10) {
    res.status(400).json({ success: false, error: 'A valid mobile number is required.' });
    return;
  }

  const customers = Database.getCustomers();
  // Check duplicate email or mobile
  const duplicate = customers.find(
    (c) => c.email.toLowerCase() === email.toLowerCase() || c.mobile === cleanMobile
  );
  if (duplicate) {
    res.status(409).json({ success: false, error: 'A customer with this email or mobile number already exists.' });
    return;
  }

  const newCustomer: Customer = {
    id: 'cust_' + crypto.randomBytes(6).toString('hex'),
    fullName: fullName.trim(),
    mobile: cleanMobile,
    email: email.trim().toLowerCase(),
    externalReference: externalReference?.trim() || undefined,
    businessReference: businessReference?.trim() || undefined,
    notes: notes?.trim() || undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  customers.unshift(newCustomer);
  Database.saveCustomers(customers);

  Database.appendAuditLog({
    adminId: req.adminUser!.id,
    adminUsername: req.adminUser!.username,
    action: 'CUSTOMER_CREATED',
    entityType: 'CUSTOMER',
    entityId: newCustomer.id,
    details: `Added customer ${newCustomer.fullName} (${newCustomer.mobile})`,
  });

  res.status(201).json({ success: true, customer: newCustomer });
});

// PUT /api/customers/:id
customerRouter.put('/:id', requireAuth('operator'), (req: AuthenticatedRequest, res: Response): void => {
  const { fullName, mobile, email, externalReference, businessReference, notes } = req.body;
  const customers = Database.getCustomers();
  const customer = customers.find((c) => c.id === req.params.id);

  if (!customer) {
    res.status(404).json({ success: false, error: 'Customer not found.' });
    return;
  }

  if (fullName) customer.fullName = fullName.trim();
  if (mobile) customer.mobile = mobile.replace(/[^0-9+]/g, '');
  if (email) customer.email = email.trim().toLowerCase();
  if (externalReference !== undefined) customer.externalReference = externalReference?.trim() || undefined;
  if (businessReference !== undefined) customer.businessReference = businessReference?.trim() || undefined;
  if (notes !== undefined) customer.notes = notes?.trim() || undefined;
  customer.updatedAt = new Date().toISOString();

  Database.saveCustomers(customers);

  Database.appendAuditLog({
    adminId: req.adminUser!.id,
    adminUsername: req.adminUser!.username,
    action: 'CUSTOMER_UPDATED',
    entityType: 'CUSTOMER',
    entityId: customer.id,
    details: `Updated details for customer ${customer.fullName}`,
  });

  res.json({ success: true, customer });
});

// GET /api/customers/export/csv
customerRouter.get('/export/csv', requireAuth('read_only'), (req: AuthenticatedRequest, res: Response): void => {
  const customers = Database.getCustomers();
  const csvData = ExportService.toCsv(
    customers.map((c) => ({
      id: c.id,
      fullName: c.fullName,
      mobile: c.mobile,
      email: c.email,
      externalReference: c.externalReference || '',
      businessReference: c.businessReference || '',
      createdAt: c.createdAt,
    })),
    [
      { key: 'id', label: 'Customer ID' },
      { key: 'fullName', label: 'Full Name' },
      { key: 'mobile', label: 'Mobile' },
      { key: 'email', label: 'Email' },
      { key: 'externalReference', label: 'External Ref' },
      { key: 'businessReference', label: 'Business Ref' },
      { key: 'createdAt', label: 'Created At' },
    ]
  );

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="customers_export.csv"');
  res.send(csvData);
});
