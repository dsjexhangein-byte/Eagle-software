export interface VariableDefinition {
  variable: string;
  description: string;
  category: 'payment' | 'customer' | 'brand' | 'loan' | 'system';
  exampleValue: string;
  isEscaped: boolean;
}

export const TEMPLATE_VARIABLES_REGISTRY: VariableDefinition[] = [
  { variable: '{{payment.amount}}', description: 'Payable amount formatted (e.g. 500.00)', category: 'payment', exampleValue: '500.00', isEscaped: true },
  { variable: '{{payment.button}}', description: 'Ready-to-click Pay Now button element with brand styling', category: 'payment', exampleValue: '<button class="pay-btn">PAY NOW</button>', isEscaped: false },
  { variable: '{{payment.button_text}}', description: 'Configured CTA text (e.g. PAY NOW or PROCEED TO PAY)', category: 'payment', exampleValue: 'PAY NOW', isEscaped: true },
  { variable: '{{payment.repayment_date}}', description: 'Repayment / Due date formatted (DD/MM/YYYY)', category: 'payment', exampleValue: '10/10/2026', isEscaped: true },
  { variable: '{{payment.loan_order_number}}', description: 'Loan Order Number / Reference Order', category: 'payment', exampleValue: '6307137', isEscaped: true },
  { variable: '{{payment.order_number}}', description: 'Unique merchant order reference number', category: 'payment', exampleValue: 'ORD-171800101', isEscaped: true },
  { variable: '{{payment.status}}', description: 'Current payment state (Link Pending, Success, etc.)', category: 'payment', exampleValue: 'Link Pending', isEscaped: true },
  { variable: '{{payment.created_at}}', description: 'Creation date in readable format', category: 'payment', exampleValue: '10/10/2026', isEscaped: true },
  { variable: '{{payment.expires_at}}', description: 'Expiration date in readable format', category: 'payment', exampleValue: '13/10/2026', isEscaped: true },
  { variable: '{{payment.reference}}', description: 'External business reference code', category: 'payment', exampleValue: 'REF-2026-91', isEscaped: true },

  { variable: '{{customer.name}}', description: 'Customer full name', category: 'customer', exampleValue: 'PARVEEN', isEscaped: true },
  { variable: '{{customer.mobile}}', description: 'Customer contact mobile number', category: 'customer', exampleValue: '+91 9201234695', isEscaped: true },
  { variable: '{{customer.masked_mobile}}', description: 'Masked mobile number for privacy (920****695)', category: 'customer', exampleValue: '920****695', isEscaped: true },
  { variable: '{{customer.email}}', description: 'Customer notification email', category: 'customer', exampleValue: 'customer@example.com', isEscaped: true },
  { variable: '{{customer.pan}}', description: 'Customer PAN Number', category: 'loan', exampleValue: 'ABCDE1234F', isEscaped: true },
  { variable: '{{customer.bank_account}}', description: 'Customer Bank Account / UPI ID', category: 'loan', exampleValue: '••••••••1234', isEscaped: true },
  { variable: '{{customer.executive_name}}', description: 'Assigned Executive / Loan Officer Name', category: 'loan', exampleValue: 'Rajesh Kumar', isEscaped: true },
  { variable: '{{customer.address}}', description: 'Customer street address', category: 'customer', exampleValue: 'Connaught Place', isEscaped: true },
  { variable: '{{customer.city}}', description: 'Customer city', category: 'customer', exampleValue: 'New Delhi', isEscaped: true },
  { variable: '{{customer.state}}', description: 'Customer state', category: 'customer', exampleValue: 'Delhi', isEscaped: true },
  { variable: '{{customer.pincode}}', description: 'Customer postal pincode', category: 'customer', exampleValue: '110001', isEscaped: true },

  { variable: '{{brand.name}}', description: 'Configured brand display name', category: 'brand', exampleValue: 'KaryaLoan', isEscaped: true },
  { variable: '{{brand.logo}}', description: 'Brand logo image URL', category: 'brand', exampleValue: 'https://example.com/logo.png', isEscaped: true },
  { variable: '{{brand.primary_color}}', description: 'Hex primary color', category: 'brand', exampleValue: '#6366f1', isEscaped: true },
  { variable: '{{brand.secondary_color}}', description: 'Hex secondary color', category: 'brand', exampleValue: '#818cf8', isEscaped: true },
  { variable: '{{brand.button_color}}', description: 'Call-to-action button color', category: 'brand', exampleValue: '#6366f1', isEscaped: true },
  { variable: '{{brand.button_text}}', description: 'Call-to-action button text', category: 'brand', exampleValue: 'PAY NOW', isEscaped: true },
  { variable: '{{brand.support_email}}', description: 'Brand support contact email', category: 'brand', exampleValue: 'support@brand.com', isEscaped: true },
  { variable: '{{brand.support_phone}}', description: 'Brand customer support hotline', category: 'brand', exampleValue: '+91 800-444-2200', isEscaped: true },

  { variable: '{{site.name}}', description: 'Brand Portal Name', category: 'system', exampleValue: 'Repayment Portal', isEscaped: true },
  { variable: '{{site.url}}', description: 'Base application public URL', category: 'system', exampleValue: 'https://example.com', isEscaped: true },
  { variable: '{{current.year}}', description: 'Four digit current year', category: 'system', exampleValue: '2026', isEscaped: true },
];

export class TemplateEngine {
  /**
   * Escape special HTML characters to prevent XSS injection
   */
  public static escapeHtml(str: unknown): string {
    if (str === null || str === undefined) return '';
    const text = String(str);
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Helper to mask a mobile number, e.g. "9201234695" -> "920****695"
   */
  public static maskMobile(mobile: string | undefined): string {
    if (!mobile) return 'N/A';
    const digits = mobile.replace(/[^0-9]/g, '');
    if (digits.length >= 10) {
      const first3 = digits.slice(-10, -7);
      const last3 = digits.slice(-3);
      return `${first3}****${last3}`;
    }
    return mobile;
  }

  /**
   * Render template with dynamic variables
   */
  public static render(
    templateHtml: string,
    context: {
      payment: {
        amount: number | string;
        order_number: string;
        status: string;
        created_at: string;
        expires_at: string;
        reference?: string;
        repayment_date?: string;
        loan_order_number?: string;
      };
      customer: {
        name: string;
        mobile: string;
        email: string;
        pan?: string;
        bank_account?: string;
        executive_name?: string;
        address?: string;
        city?: string;
        state?: string;
        pincode?: string;
      };
      brand: {
        name: string;
        logo: string;
        primary_color: string;
        secondary_color: string;
        button_color?: string;
        button_text?: string;
        support_email?: string;
        support_phone?: string;
      };
      site?: {
        name?: string;
        url?: string;
      };
    }
  ): string {
    let result = templateHtml;

    const rawMobile = context.customer.mobile || '';
    const maskedMobile = this.maskMobile(rawMobile);
    const loanOrderNo = context.payment.loan_order_number || context.payment.order_number;
    const repaymentDate = context.payment.repayment_date || context.payment.expires_at;
    const buttonText = context.brand.button_text || 'PAY NOW';
    const buttonColor = context.brand.button_color || context.brand.primary_color;

    const buttonHtml = `<button type="button" class="pay-now-action-btn" onclick="window.__initiatePay&amp;&amp;window.__initiatePay()" style="width:100%;padding:14px 20px;background-color:${this.escapeHtml(buttonColor)};color:#ffffff;font-weight:800;font-size:14px;border-radius:16px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 14px rgba(0,0,0,0.12);transition:all 0.2s ease;"><span>${this.escapeHtml(buttonText)}</span><span>₹ ${this.escapeHtml(context.payment.amount)}</span></button>`;

    const amtStr = this.escapeHtml(context.payment.amount);
    const payLinkStr = this.escapeHtml(context.site?.url || '');

    const map: Record<string, string> = {
      // Amount variants
      '{{payment.amount}}': amtStr,
      '{payment.amount}': amtStr,
      '{{payment_amount}}': amtStr,
      '{payment_amount}': amtStr,
      '{{amount}}': amtStr,
      '{amount}': amtStr,
      '{{AMOUNT}}': amtStr,
      '{AMOUNT}': amtStr,
      '{{loan_amount}}': amtStr,
      '{loan_amount}': amtStr,
      '{{payable_amount}}': amtStr,
      '{payable_amount}': amtStr,
      '{{total_amount}}': amtStr,
      '{total_amount}': amtStr,
      '{{settlement_amount}}': amtStr,
      '{settlement_amount}': amtStr,

      // Button & actions
      '{{payment.button}}': buttonHtml,
      '{payment.button}': buttonHtml,
      '{{button}}': buttonHtml,
      '{button}': buttonHtml,
      '{{pay_button}}': buttonHtml,
      '{pay_button}': buttonHtml,
      '{{payment.button_text}}': this.escapeHtml(buttonText),
      '{payment.button_text}': this.escapeHtml(buttonText),

      // Dates & order refs
      '{{payment.repayment_date}}': this.escapeHtml(repaymentDate),
      '{payment.repayment_date}': this.escapeHtml(repaymentDate),
      '{{repayment_date}}': this.escapeHtml(repaymentDate),
      '{repayment_date}': this.escapeHtml(repaymentDate),
      '{{due_date}}': this.escapeHtml(repaymentDate),
      '{due_date}': this.escapeHtml(repaymentDate),
      '{{payment.loan_order_number}}': this.escapeHtml(loanOrderNo),
      '{payment.loan_order_number}': this.escapeHtml(loanOrderNo),
      '{{loan_order_number}}': this.escapeHtml(loanOrderNo),
      '{loan_order_number}': this.escapeHtml(loanOrderNo),
      '{{payment.order_number}}': this.escapeHtml(context.payment.order_number),
      '{payment.order_number}': this.escapeHtml(context.payment.order_number),
      '{{order_no}}': this.escapeHtml(loanOrderNo),
      '{order_no}': this.escapeHtml(loanOrderNo),
      '{{order_number}}': this.escapeHtml(loanOrderNo),
      '{order_number}': this.escapeHtml(loanOrderNo),
      '{{payment.status}}': this.escapeHtml(context.payment.status),
      '{payment.status}': this.escapeHtml(context.payment.status),
      '{{status}}': this.escapeHtml(context.payment.status),
      '{status}': this.escapeHtml(context.payment.status),
      '{{payment.created_at}}': this.escapeHtml(context.payment.created_at),
      '{payment.created_at}': this.escapeHtml(context.payment.created_at),
      '{{payment.expires_at}}': this.escapeHtml(context.payment.expires_at),
      '{payment.expires_at}': this.escapeHtml(context.payment.expires_at),
      '{{payment.reference}}': this.escapeHtml(context.payment.reference || 'N/A'),
      '{payment.reference}': this.escapeHtml(context.payment.reference || 'N/A'),
      '{{payment.link}}': payLinkStr,
      '{payment.link}': payLinkStr,
      '{{payment_link}}': payLinkStr,
      '{payment_link}': payLinkStr,
      '{{link}}': payLinkStr,
      '{link}': payLinkStr,

      // Customer
      '{{customer.name}}': this.escapeHtml(context.customer.name),
      '{customer.name}': this.escapeHtml(context.customer.name),
      '{{customer_name}}': this.escapeHtml(context.customer.name),
      '{customer_name}': this.escapeHtml(context.customer.name),
      '{{name}}': this.escapeHtml(context.customer.name),
      '{name}': this.escapeHtml(context.customer.name),
      '{{customer.mobile}}': this.escapeHtml(rawMobile),
      '{customer.mobile}': this.escapeHtml(rawMobile),
      '{{customer_mobile}}': this.escapeHtml(rawMobile),
      '{customer_mobile}': this.escapeHtml(rawMobile),
      '{{mobile}}': this.escapeHtml(rawMobile),
      '{mobile}': this.escapeHtml(rawMobile),
      '{{phone}}': this.escapeHtml(rawMobile),
      '{phone}': this.escapeHtml(rawMobile),
      '{{customer.masked_mobile}}': this.escapeHtml(maskedMobile),
      '{customer.masked_mobile}': this.escapeHtml(maskedMobile),
      '{{masked_mobile}}': this.escapeHtml(maskedMobile),
      '{masked_mobile}': this.escapeHtml(maskedMobile),
      '{{customer.email}}': this.escapeHtml(context.customer.email),
      '{customer.email}': this.escapeHtml(context.customer.email),
      '{{customer.pan}}': this.escapeHtml(context.customer.pan || 'N/A'),
      '{customer.pan}': this.escapeHtml(context.customer.pan || 'N/A'),
      '{{pan}}': this.escapeHtml(context.customer.pan || 'N/A'),
      '{pan}': this.escapeHtml(context.customer.pan || 'N/A'),
      '{{pan_number}}': this.escapeHtml(context.customer.pan || 'N/A'),
      '{pan_number}': this.escapeHtml(context.customer.pan || 'N/A'),
      '{{customer.bank_account}}': this.escapeHtml(context.customer.bank_account || 'N/A'),
      '{customer.bank_account}': this.escapeHtml(context.customer.bank_account || 'N/A'),
      '{{bank_account}}': this.escapeHtml(context.customer.bank_account || 'N/A'),
      '{bank_account}': this.escapeHtml(context.customer.bank_account || 'N/A'),
      '{{customer.executive_name}}': this.escapeHtml(context.customer.executive_name || 'Loan Officer'),
      '{customer.executive_name}': this.escapeHtml(context.customer.executive_name || 'Loan Officer'),
      '{{executive_name}}': this.escapeHtml(context.customer.executive_name || 'Loan Officer'),
      '{executive_name}': this.escapeHtml(context.customer.executive_name || 'Loan Officer'),
      '{{customer.address}}': this.escapeHtml(context.customer.address || ''),
      '{customer.address}': this.escapeHtml(context.customer.address || ''),
      '{{customer.city}}': this.escapeHtml(context.customer.city || ''),
      '{customer.city}': this.escapeHtml(context.customer.city || ''),
      '{{customer.state}}': this.escapeHtml(context.customer.state || ''),
      '{customer.state}': this.escapeHtml(context.customer.state || ''),
      '{{customer.pincode}}': this.escapeHtml(context.customer.pincode || ''),
      '{customer.pincode}': this.escapeHtml(context.customer.pincode || ''),

      // Brand
      '{{brand.name}}': this.escapeHtml(context.brand.name),
      '{brand.name}': this.escapeHtml(context.brand.name),
      '{{brand_name}}': this.escapeHtml(context.brand.name),
      '{brand_name}': this.escapeHtml(context.brand.name),
      '{{brand.logo}}': this.escapeHtml(context.brand.logo),
      '{brand.logo}': this.escapeHtml(context.brand.logo),
      '{{brand.primary_color}}': this.escapeHtml(context.brand.primary_color),
      '{brand.primary_color}': this.escapeHtml(context.brand.primary_color),
      '{{brand.secondary_color}}': this.escapeHtml(context.brand.secondary_color),
      '{brand.secondary_color}': this.escapeHtml(context.brand.secondary_color),
      '{{brand.button_color}}': this.escapeHtml(buttonColor),
      '{brand.button_color}': this.escapeHtml(buttonColor),
      '{{brand.button_text}}': this.escapeHtml(buttonText),
      '{brand.button_text}': this.escapeHtml(buttonText),
      '{{brand.support_email}}': this.escapeHtml(context.brand.support_email || ''),
      '{brand.support_email}': this.escapeHtml(context.brand.support_email || ''),
      '{{brand.support_phone}}': this.escapeHtml(context.brand.support_phone || ''),
      '{brand.support_phone}': this.escapeHtml(context.brand.support_phone || ''),

      '{{site.name}}': this.escapeHtml(context.brand.name),
      '{site.name}': this.escapeHtml(context.brand.name),
      '{{site.url}}': payLinkStr,
      '{site.url}': payLinkStr,
      '{{current.year}}': String(new Date().getFullYear()),
      '{current.year}': String(new Date().getFullYear()),
    };

    for (const [key, val] of Object.entries(map)) {
      result = result.replaceAll(key, val);
    }

    // Regexp fallback for any remaining {amount}, {{amount}}, {order_no}, etc.
    result = result.replace(/\{{1,2}(?:payment\.)?(?:loan_|payable_|total_)?amount\}{1,2}/gi, amtStr);
    result = result.replace(/\{{1,2}(?:customer\.)?name\}{1,2}/gi, this.escapeHtml(context.customer.name));
    result = result.replace(/\{{1,2}(?:customer\.)?(?:masked_)?mobile\}{1,2}/gi, this.escapeHtml(maskedMobile));
    result = result.replace(/\{{1,2}(?:payment\.)?(?:loan_)?order_no(?:umber)?\}{1,2}/gi, this.escapeHtml(loanOrderNo));
    result = result.replace(/\{{1,2}(?:payment\.)?(?:repayment|due)_date\}{1,2}/gi, this.escapeHtml(repaymentDate));
    result = result.replace(/\{{1,2}(?:payment\.)?(?:payment_)?link\}{1,2}/gi, payLinkStr);
    result = result.replace(/₹\s*₹/g, '₹');

    return result;
  }

  /**
   * Validate HTML template safety and check for missing required elements
   */
  public static validateTemplate(html: string): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!html || html.trim().length === 0) {
      errors.push('Template HTML cannot be empty.');
      return { isValid: false, errors, warnings };
    }

    // Only disallow direct <script> execution tags
    if (/<script\b[^>]*>([\s\S]*?)<\/script>/gi.test(html)) {
      errors.push('Direct <script> tags are strictly forbidden inside templates for security.');
    }

    // Disallow javascript: URL protocols in attributes
    if (/javascript\s*:/i.test(html)) {
      errors.push('"javascript:" URI schemes are prohibited in templates.');
    }

    // Soft warning if payment amount is omitted
    if (!html.includes('{{payment.amount}}')) {
      warnings.push('Template does not include {{payment.amount}}. Customers will not see the payable total.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
