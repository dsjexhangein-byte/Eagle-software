import fs from 'node:fs';
import path from 'path';
import crypto from 'node:crypto';
import {
  AdminUser,
  AuditLog,
  Brand,
  BrandTemplate,
  Customer,
  GatewayAccount,
  NoticeTemplate,
  PaymentLink,
  PaymentStatusHistory,
  SystemSettings,
  TemplateVersion,
  Transaction,
  WebhookLog,
} from '../types.js';
import { NoticeEngine } from '../services/NoticeEngine.js';

interface DatabaseSchema {
  admins: AdminUser[];
  customers: Customer[];
  brands: Brand[];
  templates: BrandTemplate[];
  templateVersions: TemplateVersion[];
  paymentLinks: PaymentLink[];
  gatewayAccounts: GatewayAccount[];
  transactions: Transaction[];
  paymentStatusHistory: PaymentStatusHistory[];
  webhookLogs: WebhookLog[];
  auditLogs: AuditLog[];
  noticeTemplates: NoticeTemplate[];
  systemSettings: SystemSettings;
  meta: {
    version: number;
    lastMigratedAt: string;
  };
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'app_database.json');

export class Database {
  private static data: DatabaseSchema;
  private static isInitialized = false;

  public static initialize(): void {
    if (this.isInitialized) return;

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(fileContent);
        if (!this.data.noticeTemplates || this.data.noticeTemplates.length === 0) {
          this.data.noticeTemplates = NoticeEngine.DEFAULT_TEMPLATES.map((t) => ({
            ...t,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }));
          this.persist();
        }
        this.isInitialized = true;
        return;
      } catch (e) {
        console.error('Failed to parse existing DB file, creating fresh initial state:', e);
      }
    }

    this.data = this.createInitialData();
    this.persist();
    this.isInitialized = true;
  }

  public static persist(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tempPath = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('Database persist error:', err);
    }
  }

  private static createInitialData(): DatabaseSchema {
    // Generate secure password hash for default admin
    // Password: "Admin@Password2026!"
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = crypto.pbkdf2Sync('Admin@Password2026!', salt, 10000, 64, 'sha512').toString('hex');

    const adminId = 'adm_' + crypto.randomBytes(6).toString('hex');
    const samvitBrandId = 'brd_samvit_01';
    const apexBrandId = 'brd_apex_02';

    const defaultHtmlTemplate = `
<div class="checkout-card max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
  <div class="brand-header p-6 text-white text-center" style="background-color: {{brand.primary_color}}">
    <div class="brand-logo text-2xl font-bold tracking-tight mb-1 flex items-center justify-center gap-2">
      <span>{{brand.name}}</span>
    </div>
    <p class="text-xs opacity-80 uppercase tracking-widest font-medium">Secure Payment Gateway</p>
  </div>

  <div class="p-6 space-y-6">
    <div class="text-center pb-4 border-b border-slate-100">
      <span class="text-xs uppercase tracking-wider text-slate-500 font-semibold">Amount to Pay</span>
      <div class="text-4xl font-extrabold text-slate-900 mt-1">₹{{payment.amount}}</div>
      <div class="text-xs text-slate-500 mt-1">Ref: <span class="font-mono font-medium">{{payment.order_number}}</span></div>
    </div>

    <div class="bg-slate-50 rounded-xl p-4 text-xs space-y-2 border border-slate-100">
      <div class="flex justify-between text-slate-600">
        <span>Billed To:</span>
        <span class="font-medium text-slate-900">{{customer.name}}</span>
      </div>
      <div class="flex justify-between text-slate-600">
        <span>Mobile:</span>
        <span class="font-medium text-slate-900">{{customer.mobile}}</span>
      </div>
      <div class="flex justify-between text-slate-600">
        <span>Valid Until:</span>
        <span class="font-medium text-slate-900">{{payment.expires_at}}</span>
      </div>
    </div>

    <div class="text-center text-xs text-slate-400">
      Protected with 256-bit encrypted checkout. Support: {{brand.support_email}}
    </div>
  </div>
</div>
`.trim();

    const template1Id = 'tpl_samvit_01';
    const templateVersion1Id = 'tpl_ver_01';

    const gwEagleProdId = 'gw_eagle_prod';
    const gwEagleSandboxId = 'gw_eagle_sandbox';

    return {
      meta: {
        version: 1,
        lastMigratedAt: new Date().toISOString(),
      },
      admins: [
        {
          id: adminId,
          username: 'admin',
          email: 'admin@platform.local',
          passwordHash,
          salt,
          name: 'Platform Super Administrator',
          role: 'super_admin',
          isActive: true,
          twoFactorEnabled: false,
          lastLoginAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      customers: [
        {
          id: 'cust_01',
          fullName: 'Rajesh Sharma',
          mobile: '9876543210',
          email: 'rajesh.sharma@example.com',
          externalReference: 'CR-10492',
          businessReference: 'VIP-CLIENT',
          notes: 'Regular enterprise subscriber',
          createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
          updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        },
        {
          id: 'cust_02',
          fullName: 'Priya Sundaram',
          mobile: '9811223344',
          email: 'priya.sundaram@example.com',
          externalReference: 'INV-88210',
          businessReference: 'RETAIL',
          notes: 'Quarterly membership',
          createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
          updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        },
        {
          id: 'cust_03',
          fullName: 'Ananya Verma',
          mobile: '9920334455',
          email: 'ananya.verma@example.com',
          externalReference: 'CORP-5501',
          businessReference: 'ANNUAL-LICENSE',
          notes: 'Software integration fee',
          createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
          updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
        },
      ],
      brands: [
        {
          id: samvitBrandId,
          name: 'Samvit',
          slug: 'samvit',
          logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=160&auto=format&fit=crop&q=80',
          primaryColor: '#0f766e',
          secondaryColor: '#0d9488',
          backgroundColor: '#f0fdfa',
          buttonColor: '#0f766e',
          supportEmail: 'support@samvit.com',
          supportPhone: '+91 800-444-2200',
          isActive: true,
          currentTemplateId: template1Id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: apexBrandId,
          name: 'Apex Financial',
          slug: 'apex',
          logoUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=160&auto=format&fit=crop&q=80',
          primaryColor: '#1e3a8a',
          secondaryColor: '#2563eb',
          backgroundColor: '#f8fafc',
          buttonColor: '#1e3a8a',
          supportEmail: 'billing@apexfinancial.com',
          supportPhone: '+91 800-555-1100',
          isActive: true,
          currentTemplateId: template1Id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      templates: [
        {
          id: template1Id,
          brandId: samvitBrandId,
          name: 'Classic Branded Checkout v1',
          htmlContent: defaultHtmlTemplate,
          status: 'published',
          activeVersionId: templateVersion1Id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      templateVersions: [
        {
          id: templateVersion1Id,
          templateId: template1Id,
          versionNumber: 1,
          htmlContent: defaultHtmlTemplate,
          changeNotes: 'Initial production template',
          createdAt: new Date().toISOString(),
          createdBy: 'admin',
        },
      ],
      gatewayAccounts: [
        {
          id: gwEagleProdId,
          name: 'Eagle Pay Production Gateway',
          adapter: 'eaglepay',
          mchId: 'MCH_EAGLE_LIVE_882',
          mchKey: 'MCH_KEY_PROD_84F9A321E5C',
          baseUrl: 'https://xgxbscfgfhtiizzxipog.supabase.co/functions/v1',
          isSandbox: false,
          tradeType: 'INRUPI',
          notifyUrl: 'https://example.com/webhooks/eaglepay',
          returnUrl: 'https://example.com/status',
          isActive: true,
          lastTestedAt: new Date().toISOString(),
          lastTestStatus: 'SUCCESS',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: gwEagleSandboxId,
          name: 'Eagle Pay Sandbox Simulator',
          adapter: 'mock',
          mchId: 'MCH_EAGLE_SANDBOX_001',
          mchKey: 'MCH_SANDBOX_SECRET_KEY_99',
          baseUrl: 'https://xgxbscfgfhtiizzxipog.supabase.co/functions/v1',
          isSandbox: true,
          tradeType: 'INRUPI',
          notifyUrl: 'https://example.com/webhooks/eaglepay',
          returnUrl: 'https://example.com/status',
          isActive: true,
          lastTestedAt: new Date().toISOString(),
          lastTestStatus: 'SUCCESS',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      paymentLinks: [
        {
          id: 'plink_01',
          token: 'PAY8F72K9',
          customerId: 'cust_01',
          brandId: samvitBrandId,
          gatewayAccountId: gwEagleSandboxId,
          templateVersionId: templateVersion1Id,
          merchantOrderNo: 'ORD-171800101-SAMVIT',
          amount: 2499.0,
          amountFormatted: '2499.00',
          currency: 'INR',
          description: 'Annual Cloud Suite Subscription',
          externalReference: 'INV-2026-091',
          status: 'CREATED',
          isEnabled: true,
          expiresAt: new Date(Date.now() + 86400000 * 3).toISOString(),
          createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          createdByAdminId: adminId,
        },
        {
          id: 'plink_02',
          token: 'PAY4B21X8',
          customerId: 'cust_02',
          brandId: apexBrandId,
          gatewayAccountId: gwEagleSandboxId,
          templateVersionId: templateVersion1Id,
          merchantOrderNo: 'ORD-171800102-APEX',
          amount: 500.0,
          amountFormatted: '500.00',
          currency: 'INR',
          description: 'Advisory Consultation Retainer',
          externalReference: 'REF-88912',
          status: 'SUCCESS',
          isEnabled: true,
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 82000000).toISOString(),
          paidAt: new Date(Date.now() - 82000000).toISOString(),
          gatewayOrderNo: 'PI1791568498711',
          createdByAdminId: adminId,
        },
      ],
      transactions: [
        {
          id: 'tx_01',
          paymentLinkId: 'plink_02',
          merchantOrderNo: 'ORD-171800102-APEX',
          gatewayOrderNo: 'PI1791568498711',
          amount: 500.0,
          currency: 'INR',
          status: 'SUCCESS',
          callbackReceivedAt: new Date(Date.now() - 82000000).toISOString(),
          createdAt: new Date(Date.now() - 82000000).toISOString(),
        },
      ],
      paymentStatusHistory: [
        {
          id: 'psh_01',
          paymentLinkId: 'plink_01',
          previousStatus: 'CREATED',
          newStatus: 'CREATED',
          source: 'INITIAL',
          reason: 'Payment link generated',
          actor: 'admin',
          createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        },
        {
          id: 'psh_02',
          paymentLinkId: 'plink_02',
          previousStatus: 'CREATED',
          newStatus: 'SUCCESS',
          source: 'WEBHOOK',
          reason: 'Verified callback signature matched',
          actor: 'Eagle Pay Gateway',
          createdAt: new Date(Date.now() - 82000000).toISOString(),
        },
      ],
      webhookLogs: [
        {
          id: 'wh_log_01',
          sourceGateway: 'eaglepay',
          endpoint: '/webhooks/eaglepay',
          payload: {
            mchId: 'MCH_EAGLE_SANDBOX_001',
            orderNo: 'PI1791568498711',
            mchOrderNo: 'ORD-171800102-APEX',
            amount: '500.00',
            status: 'success',
            currency: 'INR',
            paidAt: new Date(Date.now() - 82000000).toISOString(),
            sign: 'A7F8B2C4E6D01234567890ABCDEF1234',
          },
          rawBody: '{"mchId":"MCH_EAGLE_SANDBOX_001","orderNo":"PI1791568498711",...}',
          signatureReceived: 'A7F8B2C4E6D01234567890ABCDEF1234',
          signatureCalculated: 'A7F8B2C4E6D01234567890ABCDEF1234',
          isSignatureValid: true,
          processingStatus: 'SUCCESS',
          merchantOrderNo: 'ORD-171800102-APEX',
          responseSent: 'success',
          httpStatusCode: 200,
          createdAt: new Date(Date.now() - 82000000).toISOString(),
        },
      ],
      auditLogs: [
        {
          id: 'audit_01',
          adminId: adminId,
          adminUsername: 'admin',
          action: 'SYSTEM_INITIALIZATION',
          entityType: 'SYSTEM',
          details: 'Initialized database schema, default administrator, and brand profiles',
          ipAddress: '127.0.0.1',
          createdAt: new Date().toISOString(),
        },
      ],
      systemSettings: {
        siteName: 'EaglePay Multi-Brand Platform',
        siteUrl: 'https://ais-dev-z56ha7zbb6l6tavlozzn5w-619527651196.asia-southeast1.run.app',
        defaultCurrency: 'INR',
        defaultExpiryHours: 72,
        supportEmail: 'dsjexhange.in@gmail.com',
        maintenanceMode: false,
        allowManualStatusOverride: true,
        reconciliationCronIntervalMinutes: 15,
      },
      noticeTemplates: NoticeEngine.DEFAULT_TEMPLATES.map((t) => ({
        ...t,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
    };
  }

  // Repository getters
  public static getNoticeTemplates(): NoticeTemplate[] {
    this.initialize();
    return this.data.noticeTemplates || [];
  }

  public static getAdmins(): AdminUser[] {
    this.initialize();
    return this.data.admins;
  }

  public static getCustomers(): Customer[] {
    this.initialize();
    return this.data.customers;
  }

  public static getBrands(): Brand[] {
    this.initialize();
    return this.data.brands;
  }

  public static getTemplates(): BrandTemplate[] {
    this.initialize();
    return this.data.templates;
  }

  public static getTemplateVersions(): TemplateVersion[] {
    this.initialize();
    return this.data.templateVersions;
  }

  public static getPaymentLinks(): PaymentLink[] {
    this.initialize();
    return this.data.paymentLinks;
  }

  public static getGatewayAccounts(): GatewayAccount[] {
    this.initialize();
    return this.data.gatewayAccounts;
  }

  public static getTransactions(): Transaction[] {
    this.initialize();
    return this.data.transactions;
  }

  public static getPaymentStatusHistory(): PaymentStatusHistory[] {
    this.initialize();
    return this.data.paymentStatusHistory;
  }

  public static getWebhookLogs(): WebhookLog[] {
    this.initialize();
    return this.data.webhookLogs;
  }

  public static getAuditLogs(): AuditLog[] {
    this.initialize();
    return this.data.auditLogs;
  }

  public static getSystemSettings(): SystemSettings {
    this.initialize();
    return this.data.systemSettings;
  }

  // State mutators
  public static saveAdmins(admins: AdminUser[]): void {
    this.initialize();
    this.data.admins = admins;
    this.persist();
  }

  public static saveCustomers(customers: Customer[]): void {
    this.initialize();
    this.data.customers = customers;
    this.persist();
  }

  public static saveBrands(brands: Brand[]): void {
    this.initialize();
    this.data.brands = brands;
    this.persist();
  }

  public static saveTemplates(templates: BrandTemplate[]): void {
    this.initialize();
    this.data.templates = templates;
    this.persist();
  }

  public static saveTemplateVersions(versions: TemplateVersion[]): void {
    this.initialize();
    this.data.templateVersions = versions;
    this.persist();
  }

  public static savePaymentLinks(links: PaymentLink[]): void {
    this.initialize();
    this.data.paymentLinks = links;
    this.persist();
  }

  public static saveGatewayAccounts(accounts: GatewayAccount[]): void {
    this.initialize();
    this.data.gatewayAccounts = accounts;
    this.persist();
  }

  public static saveTransactions(transactions: Transaction[]): void {
    this.initialize();
    this.data.transactions = transactions;
    this.persist();
  }

  public static savePaymentStatusHistory(history: PaymentStatusHistory[]): void {
    this.initialize();
    this.data.paymentStatusHistory = history;
    this.persist();
  }

  public static saveWebhookLogs(logs: WebhookLog[]): void {
    this.initialize();
    this.data.webhookLogs = logs;
    this.persist();
  }

  public static saveAuditLogs(logs: AuditLog[]): void {
    this.initialize();
    this.data.auditLogs = logs;
    this.persist();
  }

  public static saveNoticeTemplates(templates: NoticeTemplate[]): void {
    this.initialize();
    this.data.noticeTemplates = templates;
    this.persist();
  }

  public static saveSystemSettings(settings: SystemSettings): void {
    this.initialize();
    this.data.systemSettings = settings;
    this.persist();
  }

  public static appendAuditLog(log: Omit<AuditLog, 'id' | 'createdAt'>): void {
    this.initialize();
    const entry: AuditLog = {
      id: 'audit_' + crypto.randomBytes(6).toString('hex'),
      createdAt: new Date().toISOString(),
      ...log,
    };
    this.data.auditLogs.unshift(entry);
    if (this.data.auditLogs.length > 1000) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 1000);
    }
    this.persist();
  }
}
