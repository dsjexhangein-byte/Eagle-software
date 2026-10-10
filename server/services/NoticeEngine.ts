import { Customer, Brand, PaymentLink, NoticeTemplate } from '../types.js';

export class NoticeEngine {
  public static readonly DEFAULT_TEMPLATES: Omit<NoticeTemplate, 'createdAt' | 'updatedAt'>[] = [
    {
      id: 'ntpl_settlement_01',
      name: 'Urgent One-Time Settlement & Legal Notice',
      description: 'Formal recovery notice warning of CIBIL default and field agent visits.',
      isDefault: true,
      content: `{{customer.name}},

To stop the field agents and clear your record, pay your ONE-TIME SETTLEMENT of INR {{payment.amount}}/- immediately using this link:
👉 {{payment.link}}

Your {{brand.name}} account (Order NO: {{payment.loan_order_number}}) is severely overdue. We have approved a final settlement amount of INR {{payment.amount}}/- for today only.

If this settlement is not cleared in the next 1 hour, the offer will be cancelled and the following actions will begin:

CIBIL Defaulter Entry: Your PAN ({{customer.pan}}) and registered details will be permanently reported as a defaulter, blocking your access to any future loans or credit cards.
Field Recovery Visit: Our collection agents will be dispatched directly to your registered home address for physical cash collection of the full original penalty amount.

Clear your settlement dues right now to permanently close this account and receive your NOC.

Recovery Department
{{brand.name}} Financial Services`,
    },
    {
      id: 'ntpl_reminder_02',
      name: 'Formal Overdue Repayment Reminder',
      description: 'Standard polite loan repayment reminder with direct payment link.',
      isDefault: false,
      content: `Dear {{customer.name}},

Greetings from {{brand.name}}.

This is a formal reminder that your loan repayment of INR {{payment.amount}}/- (Order Ref: {{payment.loan_order_number}}) is currently overdue.

Please click the secure link below to clear your outstanding dues immediately:
👉 {{payment.link}}

Due Date: {{payment.repayment_date}}
Registered Mobile: {{customer.masked_mobile}}

If you have already paid, please ignore this notice.

Support Team
{{brand.name}}
Helpline: {{brand.support_phone}}`,
    },
    {
      id: 'ntpl_noc_offer_03',
      name: 'Discounted Account Closure & Instant NOC Offer',
      description: 'Special settlement discount with instant NOC issuance guarantee.',
      isDefault: false,
      content: `SPECIAL NOC CLOSURE NOTICE: {{customer.name}}

Your loan account (Order NO: {{payment.loan_order_number}}) with {{brand.name}} has been approved for a final closure settlement at INR {{payment.amount}}/-.

Pay right now using your personalized link:
👉 {{payment.link}}

PAN Registered: {{customer.pan}}
Settlement Validity: Today Only

Upon payment completion, your account will be permanently closed and your digital NOC will be generated within 24 hours.

Collections & Dispute Desk
{{brand.name}}`,
    },
  ];

  /**
   * Render a notice template text by dynamically substituting placeholders
   */
  public static render(
    templateContent: string,
    context: {
      customer?: Partial<Customer> | null;
      brand?: Partial<Brand> | null;
      link: Partial<PaymentLink> & { publicUrl?: string };
      baseUrl?: string;
    }
  ): string {
    const { customer, brand, link, baseUrl = '' } = context;

    // Full public payment link URL
    const rawUrl = link.publicUrl || `/${brand?.slug || 'pay'}/${link.token}`;
    const fullPaymentLink = rawUrl.startsWith('http')
      ? rawUrl
      : `${baseUrl.replace(/\/+$/, '')}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;

    // Mask mobile if available (e.g. 9876543210 -> 98****3210)
    const rawMobile = customer?.mobile || '';
    const digits = rawMobile.replace(/[^0-9]/g, '');
    const maskedMobile =
      digits.length >= 10
        ? `${digits.slice(-10, -7)}****${digits.slice(-3)}`
        : rawMobile || 'XXXXXXXXXX';

    const replacements: Record<string, string> = {
      '{{customer.name}}': customer?.fullName || 'Valued Customer',
      '{{customer.mobile}}': customer?.mobile || '',
      '{{customer.masked_mobile}}': maskedMobile,
      '{{customer.email}}': customer?.email || '',
      '{{customer.pan}}': customer?.panNumber || (link as any).panNumber || 'XXXXXXXXXX',
      '{{customer.bank_account}}': customer?.bankAccount || (link as any).bankAccount || 'N/A',
      '{{customer.executive_name}}': customer?.executiveName || (link as any).executiveName || 'Recovery Officer',
      '{{payment.amount}}': link.amountFormatted || String(link.amount || '0.00'),
      '{{payment.link}}': fullPaymentLink,
      '{{payment.url}}': fullPaymentLink,
      '{{payment.loan_order_number}}': (link as any).loanOrderNumber || link.merchantOrderNo || '',
      '{{payment.order_number}}': link.merchantOrderNo || '',
      '{{payment.repayment_date}}': (link as any).repaymentDate || 'Today',
      '{{payment.validity_hours}}': '1 hour',
      '{{brand.name}}': brand?.name || 'Loan Services',
      '{{brand.support_phone}}': brand?.supportPhone || '+91 800-444-0000',
      '{{brand.support_email}}': brand?.supportEmail || 'support@example.com',
    };

    let result = templateContent;
    for (const [key, val] of Object.entries(replacements)) {
      result = result.replaceAll(key, val);
    }

    return result;
  }
}
