import { Router, Response } from 'express';
import crypto from 'node:crypto';
import { AuthenticatedRequest, requireAuth } from '../middleware/authMiddleware.js';
import { Database } from '../db/database.js';
import { Brand, BrandTemplate, TemplateVersion } from '../types.js';
import { TemplateEngine, TEMPLATE_VARIABLES_REGISTRY } from '../services/TemplateEngine.js';

export const brandRouter = Router();

// GET /api/brands
brandRouter.get('/', requireAuth('read_only'), (req: AuthenticatedRequest, res: Response): void => {
  const brands = Database.getBrands();
  const templates = Database.getTemplates();
  const enriched = brands.map((b) => ({
    ...b,
    template: templates.find((t) => t.id === b.currentTemplateId),
  }));
  res.json({ success: true, brands: enriched });
});

// GET /api/brands/templates/variables
brandRouter.get('/templates/variables', requireAuth('read_only'), (req: AuthenticatedRequest, res: Response): void => {
  res.json({ success: true, variables: TEMPLATE_VARIABLES_REGISTRY });
});

// POST /api/brands
brandRouter.post('/', requireAuth('admin'), (req: AuthenticatedRequest, res: Response): void => {
  const {
    name,
    slug,
    logoUrl,
    primaryColor,
    secondaryColor,
    backgroundColor,
    buttonColor,
    buttonText,
    successTitle,
    successMessage,
    pendingTitle,
    pendingMessage,
    failedTitle,
    failedMessage,
    supportEmail,
    supportPhone,
  } = req.body;

  if (!name || !slug) {
    res.status(400).json({ success: false, error: 'Brand name and slug are required.' });
    return;
  }

  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9_-]/g, '');
  const brands = Database.getBrands();
  if (brands.some((b) => b.slug === cleanSlug)) {
    res.status(409).json({ success: false, error: `Brand slug "${cleanSlug}" is already taken.` });
    return;
  }

  const brandId = 'brd_' + crypto.randomBytes(6).toString('hex');
  const templateId = 'tpl_' + crypto.randomBytes(6).toString('hex');
  const versionId = 'tpl_ver_' + crypto.randomBytes(6).toString('hex');

  // Copy default template
  const existingTemplates = Database.getTemplates();
  const defaultTemplateHtml = existingTemplates[0]?.htmlContent || '';

  const newTemplate: BrandTemplate = {
    id: templateId,
    brandId,
    name: `${name} Standard Template`,
    htmlContent: defaultTemplateHtml,
    status: 'published',
    activeVersionId: versionId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const newVersion: TemplateVersion = {
    id: versionId,
    templateId,
    versionNumber: 1,
    htmlContent: defaultTemplateHtml,
    changeNotes: 'Initial brand template setup',
    createdAt: new Date().toISOString(),
    createdBy: req.adminUser!.username,
  };

  const newBrand: Brand = {
    id: brandId,
    name: name.trim(),
    slug: cleanSlug,
    logoUrl: logoUrl || '',
    primaryColor: primaryColor || '#6366f1',
    secondaryColor: secondaryColor || '#818cf8',
    backgroundColor: backgroundColor || '#f3f4f6',
    buttonColor: buttonColor || primaryColor || '#6366f1',
    buttonText: buttonText?.trim() || 'PAY NOW',
    successTitle: successTitle?.trim() || 'Payment Successful',
    successMessage: successMessage?.trim() || 'Your payment has been received and verified successfully.',
    pendingTitle: pendingTitle?.trim() || 'Payment Processing',
    pendingMessage: pendingMessage?.trim() || 'Your payment is currently being processed by the banking system.',
    failedTitle: failedTitle?.trim() || 'Payment Unsuccessful',
    failedMessage: failedMessage?.trim() || 'Transaction could not be completed. Please try again.',
    supportEmail: supportEmail || '',
    supportPhone: supportPhone || '',
    isActive: true,
    currentTemplateId: templateId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  brands.push(newBrand);
  Database.saveBrands(brands);

  existingTemplates.push(newTemplate);
  Database.saveTemplates(existingTemplates);

  const versions = Database.getTemplateVersions();
  versions.push(newVersion);
  Database.saveTemplateVersions(versions);

  Database.appendAuditLog({
    adminId: req.adminUser!.id,
    adminUsername: req.adminUser!.username,
    action: 'BRAND_CREATED',
    entityType: 'BRAND',
    entityId: newBrand.id,
    details: `Created new brand "${newBrand.name}" (/${newBrand.slug})`,
  });

  res.status(201).json({ success: true, brand: newBrand });
});

// PUT /api/brands/:id
brandRouter.put('/:id', requireAuth('admin'), (req: AuthenticatedRequest, res: Response): void => {
  const {
    name,
    logoUrl,
    primaryColor,
    secondaryColor,
    backgroundColor,
    buttonColor,
    buttonText,
    successTitle,
    successMessage,
    pendingTitle,
    pendingMessage,
    failedTitle,
    failedMessage,
    supportEmail,
    supportPhone,
    isActive,
  } = req.body;
  const brands = Database.getBrands();
  const brand = brands.find((b) => b.id === req.params.id);

  if (!brand) {
    res.status(404).json({ success: false, error: 'Brand not found.' });
    return;
  }

  if (name) brand.name = name.trim();
  if (logoUrl !== undefined) brand.logoUrl = logoUrl;
  if (primaryColor) brand.primaryColor = primaryColor;
  if (secondaryColor) brand.secondaryColor = secondaryColor;
  if (backgroundColor) brand.backgroundColor = backgroundColor;
  if (buttonColor) brand.buttonColor = buttonColor;
  if (buttonText !== undefined) brand.buttonText = buttonText;
  if (successTitle !== undefined) brand.successTitle = successTitle;
  if (successMessage !== undefined) brand.successMessage = successMessage;
  if (pendingTitle !== undefined) brand.pendingTitle = pendingTitle;
  if (pendingMessage !== undefined) brand.pendingMessage = pendingMessage;
  if (failedTitle !== undefined) brand.failedTitle = failedTitle;
  if (failedMessage !== undefined) brand.failedMessage = failedMessage;
  if (supportEmail !== undefined) brand.supportEmail = supportEmail;
  if (supportPhone !== undefined) brand.supportPhone = supportPhone;
  if (isActive !== undefined) brand.isActive = Boolean(isActive);
  brand.updatedAt = new Date().toISOString();

  Database.saveBrands(brands);

  Database.appendAuditLog({
    adminId: req.adminUser!.id,
    adminUsername: req.adminUser!.username,
    action: 'BRAND_UPDATED',
    entityType: 'BRAND',
    entityId: brand.id,
    details: `Updated brand properties for ${brand.name}`,
  });

  res.json({ success: true, brand });
});

// GET /api/brands/:id/template
brandRouter.get('/:id/template', requireAuth('read_only'), (req: AuthenticatedRequest, res: Response): void => {
  const brand = Database.getBrands().find((b) => b.id === req.params.id);
  if (!brand) {
    res.status(404).json({ success: false, error: 'Brand not found.' });
    return;
  }

  const template = Database.getTemplates().find((t) => t.id === brand.currentTemplateId);
  const versions = Database.getTemplateVersions().filter((v) => v.templateId === template?.id);

  res.json({ success: true, template, versions, brand });
});

// PUT /api/brands/:id/template
brandRouter.put('/:id/template', requireAuth(['admin', 'template_designer']), (req: AuthenticatedRequest, res: Response): void => {
  const { htmlContent, changeNotes } = req.body;
  const brand = Database.getBrands().find((b) => b.id === req.params.id);

  if (!brand) {
    res.status(404).json({ success: false, error: 'Brand not found.' });
    return;
  }

  const validation = TemplateEngine.validateTemplate(htmlContent);
  if (!validation.isValid) {
    res.status(400).json({ success: false, error: 'Template validation failed', errors: validation.errors });
    return;
  }

  const templates = Database.getTemplates();
  const template = templates.find((t) => t.id === brand.currentTemplateId);

  if (!template) {
    res.status(404).json({ success: false, error: 'Brand template record not found.' });
    return;
  }

  const versions = Database.getTemplateVersions();
  const templateVersions = versions.filter((v) => v.templateId === template.id);
  const newVerNumber = templateVersions.length + 1;
  const newVerId = 'tpl_ver_' + crypto.randomBytes(6).toString('hex');

  const newVersion: TemplateVersion = {
    id: newVerId,
    templateId: template.id,
    versionNumber: newVerNumber,
    htmlContent,
    changeNotes: changeNotes || `Revision v${newVerNumber}`,
    createdAt: new Date().toISOString(),
    createdBy: req.adminUser!.username,
  };

  versions.push(newVersion);
  Database.saveTemplateVersions(versions);

  template.htmlContent = htmlContent;
  template.activeVersionId = newVerId;
  template.updatedAt = new Date().toISOString();
  Database.saveTemplates(templates);

  Database.appendAuditLog({
    adminId: req.adminUser!.id,
    adminUsername: req.adminUser!.username,
    action: 'TEMPLATE_UPDATED',
    entityType: 'TEMPLATE',
    entityId: template.id,
    details: `Published version v${newVerNumber} for brand ${brand.name}`,
  });

  res.json({ success: true, template, version: newVersion, warnings: validation.warnings });
});

// POST /api/brands/templates/preview
brandRouter.post('/templates/preview', requireAuth('read_only'), (req: AuthenticatedRequest, res: Response): void => {
  const { htmlContent, brandId } = req.body;
  const brand = Database.getBrands().find((b) => b.id === brandId) || Database.getBrands()[0];

  const rendered = TemplateEngine.render(htmlContent, {
    payment: {
      amount: '3,499.00',
      order_number: 'ORD-PREVIEW-2026',
      status: 'CREATED',
      created_at: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      expires_at: new Date(Date.now() + 86400000 * 3).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      reference: 'INV-DEMO-991',
    },
    customer: {
      name: 'Aarav Patel',
      mobile: '+91 98765 43210',
      email: 'aarav.patel@example.com',
    },
    brand: {
      name: brand?.name || 'Preview Brand',
      logo: brand?.logoUrl || '',
      primary_color: brand?.primaryColor || '#0f766e',
      secondary_color: brand?.secondaryColor || '#0d9488',
      support_email: brand?.supportEmail || 'support@example.com',
      support_phone: brand?.supportPhone || '+91 800-444-0000',
    },
    site: {
      name: 'EaglePay Platform',
      url: 'https://example.com',
    },
  });

  res.json({ success: true, html: rendered });
});
