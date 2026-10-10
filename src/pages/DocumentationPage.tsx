import React, { useState } from 'react';
import { BookOpen, Search, ChevronRight, Copy, Check, Terminal, Shield, Database, ExternalLink } from 'lucide-react';

interface DocSection {
  id: string;
  title: string;
  category: string;
  content: {
    description: string;
    details: string;
    steps?: string[];
    fields?: { name: string; type: string; desc: string }[];
    codeExample?: string;
    securityNotes?: string;
    troubleshooting?: string;
  };
}

const DOCS_DATA: DocSection[] = [
  {
    id: 'getting-started',
    title: '1. Getting Started & Architecture',
    category: 'Overview',
    content: {
      description: 'High-level overview of the EaglePay Multi-Brand Payment Platform architecture.',
      details:
        'EaglePay is a multi-brand payment orchestration platform designed for high security, tokenized customer checkout URLs, and native Eagle Pay Pay-in gateway integration. It features a dual-runtime design: an interactive Node.js/Express full-stack development runtime for instant testing and automated tests, and a standalone, zero-dependency PHP 8.2 + MySQL production engine ready for direct upload to ordinary cPanel shared hosting.',
      steps: [
        'Review the Eagle Pay Supabase API contract credentials (mchId, mchKey).',
        'Configure your brand slug (e.g. /samvit or /apex).',
        'Add customers and generate cryptographic payment link tokens.',
        'Share public checkout link or QR code with customers.',
        'Process incoming webhook callbacks or scheduled reconciliation via cPanel cron.',
      ],
      securityNotes:
        'Public links use cryptographically random tokens (PAY8F72K9) with high entropy. Database primary keys and sequential IDs are never exposed in public customer URLs.',
    },
  },
  {
    id: 'eaglepay-api',
    title: '2. Eagle Pay API Integration Contract',
    category: 'Gateway',
    content: {
      description: 'Exact documented endpoints and request/response contracts for Eagle Pay.',
      details:
        'Eagle Pay operates via Supabase Edge Functions with JSON payloads and uppercase MD5 signatures. The primary currency is INR with default tradeType INRUPI.',
      fields: [
        { name: 'mchId', type: 'String (Required)', desc: 'Merchant Account ID assigned by Eagle Pay.' },
        { name: 'mchOrderNo', type: 'String (Required)', desc: 'Unique internal merchant order number.' },
        { name: 'amount', type: 'String (Required)', desc: 'Formatted decimal amount in INR, e.g. "500.00".' },
        { name: 'notifyUrl', type: 'String (Required)', desc: 'Server-side webhook callback URL (/webhooks/eaglepay).' },
        { name: 'returnUrl', type: 'String (Optional)', desc: 'Public customer return URL after payment.' },
        { name: 'tradeType', type: 'String (Required)', desc: 'Defaults to "INRUPI".' },
        { name: 'sign', type: 'String (Required)', desc: 'Uppercase 32-character hexadecimal MD5 signature.' },
      ],
      codeExample: `// Eagle Pay API Endpoints
Base URL: https://xgxbscfgfhtiizzxipog.supabase.co/functions/v1

// Create Pay-in:
POST /payin
Content-Type: application/json

// Status Query:
POST /check-order-status
Content-Type: application/json`,
      securityNotes:
        'Never send mchKey in request parameters or client-side bundles. Signing must occur exclusively on the secure server backend.',
    },
  },
  {
    id: 'signatures',
    title: '3. Signature Generation & Verification',
    category: 'Security',
    content: {
      description: 'Exact ASCII-sort MD5 signing algorithm required by Eagle Pay.',
      details:
        'To prevent tampering, both outgoing payin requests and incoming webhook callbacks must be signed and verified using the merchant secret key (mchKey).',
      steps: [
        'Filter out the "sign" field itself.',
        'Filter out null, undefined, and empty string ("") parameters.',
        'Sort remaining parameter keys in ASCII ascending order.',
        'Concatenate parameters into "key=value" pairs joined with "&" without URL encoding.',
        'Append "&key=" followed by the merchant secret key (mchKey).',
        'Calculate MD5 digest and convert to UPPERCASE hexadecimal.',
      ],
      codeExample: `// PHP Implementation (PHP 8.2+)
public static function generateSignature(array $params, string $secretKey): string {
    $filtered = [];
    foreach ($params as $k => $v) {
        if ($k === 'sign' || $v === null || $v === '') continue;
        $filtered[$k] = (string)$v;
    }
    ksort($filtered, SORT_STRING);
    $pairs = [];
    foreach ($filtered as $k => $v) {
        $pairs[] = "{$k}={$v}";
    }
    $raw = implode('&', $pairs) . "&key={$secretKey}";
    return strtoupper(md5($raw));
}`,
      securityNotes:
        'Always use constant-time comparison (hash_equals in PHP or crypto.timingSafeEqual) when verifying webhook signatures to prevent timing attacks.',
    },
  },
  {
    id: 'webhooks',
    title: '4. Callback Webhook Processing & Idempotency',
    category: 'Gateway',
    content: {
      description: 'Handling incoming callbacks at /webhooks/eaglepay and ensuring zero duplicate charges.',
      details:
        'When a payment completes, Eagle Pay posts a callback payload to notifyUrl. The endpoint must verify the MD5 signature, validate order and amount match, apply state transitions idempotently, and respond with plain-text "success" within 5 seconds.',
      fields: [
        { name: 'mchId', type: 'String', desc: 'Merchant ID.' },
        { name: 'orderNo', type: 'String', desc: 'Gateway reference order number.' },
        { name: 'mchOrderNo', type: 'String', desc: 'Original merchant order number matching internal record.' },
        { name: 'amount', type: 'String', desc: 'Amount paid.' },
        { name: 'status', type: 'String', desc: '"success", "pending", or "failed".' },
        { name: 'sign', type: 'String', desc: 'Gateway callback signature.' },
      ],
      securityNotes:
        'If a payment is already marked SUCCESS, repeated callbacks or late pending notifications are safely logged as IGNORED_DUPLICATE without altering verified status.',
    },
  },
  {
    id: 'cpanel-guide',
    title: '5. Shared cPanel Deployment Guide',
    category: 'Deployment',
    content: {
      description: 'Complete guide for deploying the production PHP/MySQL engine to shared cPanel hosting.',
      details:
        'The platform is built to run cleanly on standard Linux cPanel shared hosting without requiring Docker, permanent Node.js workers, or Redis.',
      steps: [
        'In cPanel MySQL Databases: Create a database (e.g. user_eaglepay) and a user with ALL PRIVILEGES.',
        'In phpMyAdmin: Import php-cpanel/database/schema.sql.',
        'Upload php-cpanel/ files. Place public/ files into public_html/, and place config/, src/, cron/ outside public web root if possible.',
        'Edit config/config.php with your database credentials and application secret key.',
        'In cPanel Cron Jobs: Add a 15-minute cron job: "/usr/local/bin/php -q /home/USER/public_html/cron/reconcile.php".',
        'Verify SSL is active (HTTPS). Test a public payment link.',
      ],
      codeExample: `// Sample cPanel Cron Command (Every 15 minutes)
*/15 * * * * /usr/local/bin/php -q /home/username/public_html/cron/reconcile.php >> /home/username/cron.log 2>&1`,
      securityNotes:
        'Ensure the included .htaccess file is in place to forbid public browser access to config/, src/, and database/ folders.',
    },
  },
  {
    id: 'template-editor',
    title: '6. Controlled HTML Template Editor',
    category: 'Branding',
    content: {
      description: 'Customizing checkout templates safely with dynamic replacement tags.',
      details:
        'Each brand can publish customized checkout HTML templates. The system provides real-time previewing with sandbox context and automatic versioning.',
      fields: [
        { name: '{{payment.amount}}', type: 'String', desc: 'Formatted amount in INR (e.g. 2,499.00)' },
        { name: '{{payment.order_number}}', type: 'String', desc: 'Merchant order number' },
        { name: '{{customer.name}}', type: 'String', desc: 'Customer full name (HTML escaped)' },
        { name: '{{customer.mobile}}', type: 'String', desc: 'Customer contact phone' },
        { name: '{{brand.name}}', type: 'String', desc: 'Brand display name' },
        { name: '{{brand.primary_color}}', type: 'String', desc: 'Hex primary color code' },
      ],
      securityNotes:
        'The template validator blocks direct <script> tags and inline onclick/onload event handlers to prevent administrative XSS vulnerabilities.',
    },
  },
  {
    id: 'notice-templates-guide',
    title: '7. SMS & WhatsApp Notice Templates & AI Generator',
    category: 'Communication',
    content: {
      description: 'One-click shareable recovery message templates with automatic customer details insertion.',
      details:
        'When copying or sharing a payment link, the system can automatically wrap it into a structured loan recovery or settlement message. Dynamic tags are replaced in real time with customer name, loan order number, PAN card number, settlement amount, and the secure payment link.',
      fields: [
        { name: '{{customer.name}}', type: 'String', desc: 'Customer full name (e.g. BAIJAYANTI CHHURA)' },
        { name: '{{payment.amount}}', type: 'String', desc: 'Settlement amount (e.g. 1,338)' },
        { name: '{{payment.link}}', type: 'String', desc: 'Unique full payment link URL' },
        { name: '{{brand.name}}', type: 'String', desc: 'Brand/Loan entity name (e.g. ArspLoan)' },
        { name: '{{payment.loan_order_number}}', type: 'String', desc: 'Loan order/account ID (e.g. 2181993)' },
        { name: '{{customer.pan}}', type: 'String', desc: 'Registered PAN Card number' },
        { name: '{{customer.masked_mobile}}', type: 'String', desc: 'Masked mobile number (e.g. 98****3210)' },
        { name: '{{customer.executive_name}}', type: 'String', desc: 'Assigned recovery officer' },
      ],
      codeExample: `// Sample Standard Recovery Notice Output
BAIJAYANTI CHHURA,

To stop the field agents and clear your record, pay your ONE-TIME SETTLEMENT of INR 1,338/- immediately using this link:
👉 https://domain.com/pay/PAY9821X4

Your ArspLoan account (Order NO: 2181993) is severely overdue. We have approved a final settlement amount of INR 1,338/- for today only.

If this settlement is not cleared in the next 1 hour, the offer will be cancelled and the following actions will begin:

CIBIL Defaulter Entry: Your PAN (DOJPC3710R) details will be permanently reported as a defaulter, blocking your access to future loans.
Field Recovery Visit: Our collection agents will be dispatched directly to your registered home address.

Clear your settlement dues right now to permanently close this account and receive your NOC.

Recovery Department
ArspLoan Financial Services`,
      securityNotes:
        'Notice templates can be edited and tested in real time under "Settings & Team" -> "Notice Templates". The AI prompt generator is available directly inside the page.',
    },
  },
  {
    id: 'team-roles-guide',
    title: '8. Team Roles & Granular Permission System',
    category: 'Security',
    content: {
      description: 'Role-based access control (RBAC) for separating link creation, template design, and admin functions.',
      details:
        'The platform supports fine-grained permissions so you can onboard staff without giving them access to sensitive gateway credentials or system settings.',
      steps: [
        'link_creator: Can ONLY create payment links, copy notice templates, and browse customer records. Cannot view gateway secrets or edit HTML templates.',
        'template_designer: Can ONLY edit brand checkout HTML and SMS/WhatsApp notice templates.',
        'manager: Can review transactions, audit logs, recheck gateway payment statuses, and export CSV reports.',
        'admin & super_admin: Full platform administration, password resets, gateway configuration, and audit logs.',
      ],
      codeExample: `// Adding a Team Member via API
POST /api/auth/team
Authorization: Bearer <ADMIN_SESSION_TOKEN>
Content-Type: application/json

{
  "username": "rohit_creator",
  "name": "Rohit Sharma",
  "email": "rohit@team.local",
  "password": "StrongPassword123!",
  "role": "link_creator"
}`,
      securityNotes:
        'All team passwords are salted and hashed using PBKDF2 (SHA-512, 10,000 iterations). Passwords can be changed or reset anytime under Settings.',
    },
  },
  {
    id: 'ai-photo-matching',
    title: '9. AI Photo-Matching HTML Design Guide & Prompts',
    category: 'Branding',
    content: {
      description: 'How to use AI models to turn any UI screenshot into a pixel-perfect checkout card.',
      details:
        'To match an existing mobile loan card design, take a screenshot of your target app and pass it to ChatGPT, Claude, or Gemini along with the system prompt provided in the Brands editor.',
      steps: [
        'Take a clear screenshot of your desired mobile card or loan screen.',
        'Open "Brands & Templates" -> "HTML Template Editor" -> Click "Copy AI Design Prompt".',
        'Upload the screenshot and paste the copied prompt into ChatGPT (GPT-4o), Claude 3.5 Sonnet, or Gemini 1.5 Pro.',
        'Paste the generated HTML directly into the template editor.',
        'Click "Save & Publish Template" — the system automatically verifies tag compliance with 0 errors.',
      ],
      codeExample: `// Core prompt requirements for AI models:
1. Recreate the layout using pure HTML + inline CSS styles.
2. Maintain mobile card width (max-width: 440px).
3. Use exact placeholders: {{brand.name}}, {{payment.amount}}, {{payment.button}}, {{customer.name}}, {{payment.order_number}}.
4. Return ONLY the HTML code without markdown backticks.`,
      securityNotes:
        'Standard HTML attributes like onerror, alt, and styled SVG icons are fully supported and will not be rejected by the validation engine.',
    },
  },
  {
    id: 'dynamic-sessions',
    title: '10. Time-Sensitive UPI & Gateway Re-Connection Flow',
    category: 'Gateway',
    content: {
      description: 'Handling short-lived UPI / QR code payment sessions (4.5 minutes lifetime).',
      details:
        'EaglePay payment sessions are strictly time-sensitive. UPI QR codes and dynamic bank transfer details expire after ~4.5 minutes. To guarantee that customers always pay to an active UPI/bank account, the system uses an on-demand re-connection architecture.',
      steps: [
        'Initial Link Generation: Creates a persistent, tokenized link (e.g. /apex/PAY4B21X8) without prematurely generating a short-lived gateway order.',
        'Customer Visits Link: Sees the customized brand card with amount, details, and active "Pay Now" action button. No stale "Payment Initiated" banners are shown.',
        'Clicking "Pay Now": Immediately connects to the gateway and creates a fresh order attempt (e.g. ORD-171800102-APEX_2) with fresh UPI details and cashier URL.',
        'Redirect & Polling: Opens the cashier page and continuously polls the payment status in the background.',
        'Return / Retry: If the customer returns and clicks "Pay Now" again, a fresh gateway session is created automatically to avoid expired UPI or duplicate order errors.',
      ],
      securityNotes:
        'Each payment link tracks all order attempts in database records so webhooks matching any attempt correctly verify the parent transaction.',
    },
  },
  {
    id: 'cpanel-1click',
    title: '11. cPanel 1-Click Installation & Fast Setup',
    category: 'Deployment',
    content: {
      description: 'One-click deployment script and setup instructions for cPanel shared hosting.',
      details:
        'Deploy the platform on standard cPanel in under 2 minutes using either the standalone PHP/MySQL bundle or the Node.js Application Manager.',
      steps: [
        'Method A (1-Click Shell Script): Download "cpanel-deploy.sh" from the cPanel Deployment page and run "bash cpanel-deploy.sh" in your cPanel Terminal.',
        'Method B (cPanel Node.js Selector): In cPanel -> "Setup Node.js App" -> Create Application (Node 18/20) -> Application Startup File: "server.ts" or "dist-server/index.js".',
        'Method C (PHP 8.2 Standalone): Upload the generated "php-cpanel.zip" directly to public_html/ and import schema.sql into MySQL via phpMyAdmin.',
        'Configure your EaglePay credentials in config.php or .env.',
        'Setup the 15-minute cron job in cPanel -> Cron Jobs for automatic reconciliation.',
      ],
      codeExample: `# Quick cPanel Terminal Setup
curl -sO https://your-server/cpanel-deploy.sh
bash cpanel-deploy.sh`,
      securityNotes:
        'All configuration files (.env, config.php) are protected by .htaccess rules preventing public web downloads.',
    },
  },
];

export const DocumentationPage: React.FC = () => {
  const [activeSectionId, setActiveSectionId] = useState('getting-started');
  const [search, setSearch] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  const activeSection = DOCS_DATA.find((s) => s.id === activeSectionId) || DOCS_DATA[0];

  const filteredSections = DOCS_DATA.filter(
    (s) =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.content.description.toLowerCase().includes(search.toLowerCase())
  );

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Platform Documentation &amp; Reference</h1>
          <p className="text-xs text-slate-500">
            Comprehensive developer, architectural, gateway API, and cPanel deployment specifications
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        {/* Navigation Sidebar */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search topics..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-teal-500"
            />
          </div>

          <div className="space-y-1">
            {filteredSections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSectionId(s.id)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-between ${
                  activeSectionId === s.id
                    ? 'bg-teal-50 text-teal-800 border border-teal-200'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="truncate">{s.title}</span>
                <ChevronRight size={13} className={activeSectionId === s.id ? 'text-teal-600' : 'text-slate-300'} />
              </button>
            ))}
          </div>
        </div>

        {/* Content Pane */}
        <div className="md:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-teal-50 text-teal-700">
              {activeSection.category}
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 mt-2">{activeSection.title}</h2>
            <p className="text-xs text-slate-500 mt-1">{activeSection.content.description}</p>
          </div>

          <div className="prose prose-slate text-xs leading-relaxed text-slate-700 max-w-none">
            <p>{activeSection.content.details}</p>
          </div>

          {/* Steps */}
          {activeSection.content.steps && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Step-by-Step Procedure:
              </h4>
              <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100">
                {activeSection.content.steps.map((st, i) => (
                  <li key={i} className="leading-relaxed">
                    {st}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Fields */}
          {activeSection.content.fields && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Parameters &amp; Schema:</h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                      <th className="py-2 px-3">Field</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {activeSection.content.fields.map((f, i) => (
                      <tr key={i}>
                        <td className="py-2 px-3 font-bold text-slate-800">{f.name}</td>
                        <td className="py-2 px-3 text-teal-600">{f.type}</td>
                        <td className="py-2 px-3 font-sans text-slate-600 text-xs">{f.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Code Snippet */}
          {activeSection.content.codeExample && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Code Specification:</h4>
                <button
                  onClick={() => copyCode(activeSection.content.codeExample!)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-teal-600 hover:text-teal-700"
                >
                  {copiedCode ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto border border-slate-800">
                <code>{activeSection.content.codeExample}</code>
              </pre>
            </div>
          )}

          {/* Security Note */}
          {activeSection.content.securityNotes && (
            <div className="p-4 rounded-xl bg-teal-50 border border-teal-200/80 flex items-start gap-3">
              <Shield size={18} className="text-teal-700 shrink-0 mt-0.5" />
              <div>
                <h5 className="font-bold text-xs text-teal-900">Security Requirement</h5>
                <p className="text-xs text-teal-800 mt-0.5 leading-relaxed">
                  {activeSection.content.securityNotes}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
