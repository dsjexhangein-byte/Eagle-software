import { Router, Response } from 'express';
import crypto from 'node:crypto';
import { AuthenticatedRequest, requireAuth } from '../middleware/authMiddleware.js';
import { Database } from '../db/database.js';
import { NoticeTemplate } from '../types.js';
import { NoticeEngine } from '../services/NoticeEngine.js';

export const noticeTemplatesRouter = Router();

// GET /api/notice-templates
noticeTemplatesRouter.get('/', requireAuth('read_only'), (req: AuthenticatedRequest, res: Response): void => {
  const templates = Database.getNoticeTemplates();
  res.json({ success: true, templates });
});

// POST /api/notice-templates
noticeTemplatesRouter.post('/', requireAuth(['operator', 'template_designer']), (req: AuthenticatedRequest, res: Response): void => {
  const { name, description, content, isDefault } = req.body;

  if (!name || !content) {
    res.status(400).json({ success: false, error: 'Template name and content are required.' });
    return;
  }

  const templates = Database.getNoticeTemplates();
  const id = 'ntpl_' + crypto.randomBytes(6).toString('hex');

  // If new template is marked as default, unset others
  if (isDefault) {
    templates.forEach((t) => (t.isDefault = false));
  }

  const newTemplate: NoticeTemplate = {
    id,
    name: name.trim(),
    description: description?.trim() || '',
    content: content.trim(),
    isDefault: Boolean(isDefault),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  templates.push(newTemplate);
  Database.saveNoticeTemplates(templates);

  Database.appendAuditLog({
    adminId: req.adminUser!.id,
    adminUsername: req.adminUser!.username,
    action: 'NOTICE_TEMPLATE_CREATED',
    entityType: 'NOTICE_TEMPLATE',
    entityId: id,
    details: `Created notice template "${newTemplate.name}"`,
  });

  res.status(201).json({ success: true, template: newTemplate });
});

// PUT /api/notice-templates/:id
noticeTemplatesRouter.put('/:id', requireAuth(['operator', 'template_designer']), (req: AuthenticatedRequest, res: Response): void => {
  const { name, description, content, isDefault } = req.body;
  const templates = Database.getNoticeTemplates();
  const template = templates.find((t) => t.id === req.params.id);

  if (!template) {
    res.status(404).json({ success: false, error: 'Notice template not found.' });
    return;
  }

  if (isDefault) {
    templates.forEach((t) => (t.isDefault = false));
  }

  if (name !== undefined) template.name = name.trim();
  if (description !== undefined) template.description = description.trim();
  if (content !== undefined) template.content = content.trim();
  if (isDefault !== undefined) template.isDefault = Boolean(isDefault);
  template.updatedAt = new Date().toISOString();

  Database.saveNoticeTemplates(templates);

  Database.appendAuditLog({
    adminId: req.adminUser!.id,
    adminUsername: req.adminUser!.username,
    action: 'NOTICE_TEMPLATE_UPDATED',
    entityType: 'NOTICE_TEMPLATE',
    entityId: template.id,
    details: `Updated notice template "${template.name}"`,
  });

  res.json({ success: true, template });
});

// DELETE /api/notice-templates/:id
noticeTemplatesRouter.delete('/:id', requireAuth(['operator', 'template_designer']), (req: AuthenticatedRequest, res: Response): void => {
  const templates = Database.getNoticeTemplates();
  const index = templates.findIndex((t) => t.id === req.params.id);

  if (index === -1) {
    res.status(404).json({ success: false, error: 'Notice template not found.' });
    return;
  }

  const removed = templates.splice(index, 1)[0];
  Database.saveNoticeTemplates(templates);

  Database.appendAuditLog({
    adminId: req.adminUser!.id,
    adminUsername: req.adminUser!.username,
    action: 'NOTICE_TEMPLATE_DELETED',
    entityType: 'NOTICE_TEMPLATE',
    entityId: req.params.id,
    details: `Deleted notice template "${removed.name}"`,
  });

  res.json({ success: true, message: 'Template deleted.' });
});

// POST /api/notice-templates/render
noticeTemplatesRouter.post('/render', requireAuth('read_only'), (req: AuthenticatedRequest, res: Response): void => {
  const { templateId, customContent, paymentLinkId } = req.body;

  if (!paymentLinkId) {
    res.status(400).json({ success: false, error: 'paymentLinkId is required' });
    return;
  }

  const links = Database.getPaymentLinks();
  const link = links.find((l) => l.id === paymentLinkId || l.token === paymentLinkId);

  if (!link) {
    res.status(404).json({ success: false, error: 'Payment link not found.' });
    return;
  }

  const customers = Database.getCustomers();
  const customer = customers.find((c) => c.id === link.customerId);

  const brands = Database.getBrands();
  const brand = brands.find((b) => b.id === link.brandId);

  const templates = Database.getNoticeTemplates();
  let contentToUse = customContent;

  if (!contentToUse) {
    const selectedTemplate = templateId
      ? templates.find((t) => t.id === templateId)
      : templates.find((t) => t.isDefault) || templates[0];
    contentToUse = selectedTemplate?.content || NoticeEngine.DEFAULT_TEMPLATES[0].content;
  }

  const host = req.get('host') || 'localhost:3000';
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const baseUrl = `${protocol}://${host}`;

  const renderedText = NoticeEngine.render(contentToUse, {
    customer,
    brand,
    link: {
      ...link,
      publicUrl: `/${brand?.slug || 'pay'}/${link.token}`,
    },
    baseUrl,
  });

  res.json({
    success: true,
    renderedText,
    customerMobile: customer?.mobile || '',
    customerName: customer?.fullName || 'Valued Customer',
    linkToken: link.token,
    fullUrl: `${baseUrl}/${brand?.slug || 'pay'}/${link.token}`,
    amountFormatted: link.amountFormatted,
  });
});
