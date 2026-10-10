import { SignatureService } from './SignatureService.js';
import { TemplateEngine } from './TemplateEngine.js';
import { ExportService } from './ExportService.js';
import { PaymentOrchestrator } from './PaymentOrchestrator.js';
import { AuthService } from './AuthService.js';
import { Database } from '../db/database.js';
import { EaglePayAdapter } from '../adapters/EaglePayAdapter.js';
import { GatewayAccount } from '../types.js';

export interface TestResultItem {
  id: string;
  name: string;
  category: string;
  passed: boolean;
  durationMs: number;
  assertion: string;
  details?: string;
}

export class TestSuiteRunner {
  public static async runAllTests(): Promise<{
    total: number;
    passed: number;
    failed: number;
    results: TestResultItem[];
  }> {
    const results: TestResultItem[] = [];

    const run = async (
      name: string,
      category: string,
      assertion: string,
      fn: () => Promise<void> | void
    ) => {
      const start = Date.now();
      try {
        await fn();
        results.push({
          id: 'test_' + results.length,
          name,
          category,
          passed: true,
          durationMs: Date.now() - start,
          assertion,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({
          id: 'test_' + results.length,
          name,
          category,
          passed: false,
          durationMs: Date.now() - start,
          assertion,
          details: msg,
        });
      }
    };

    // 1. Signature Generation
    await run(
      'Eagle Pay Signature Calculation',
      'Cryptography',
      'Should sort ASCII keys, omit empty/null and sign field, append secret and return uppercase MD5',
      () => {
        const params = {
          mchId: 'MCH100',
          mchOrderNo: 'ORD_123',
          amount: '500.00',
          emptyField: '',
          nullField: null,
          sign: 'OLD_SIGN',
        };
        const secret = 'my_secret_key';
        const { signature, rawString } = SignatureService.generateSignature(params, secret);

        if (rawString !== 'amount=500.00&mchId=MCH100&mchOrderNo=ORD_123&key=my_secret_key') {
          throw new Error(`Raw string mismatch: ${rawString}`);
        }
        if (!/^[0-9A-F]{32}$/.test(signature)) {
          throw new Error(`Signature format invalid: ${signature}`);
        }
      }
    );

    // 2. Callback Signature Verification
    await run(
      'Eagle Pay Callback Verification',
      'Cryptography',
      'Should verify matching callback signature and reject forged or mismatched payloads',
      () => {
        const payload = {
          mchId: 'MCH100',
          orderNo: 'EAGLE_99',
          mchOrderNo: 'ORD_123',
          amount: '500.00',
          status: 'success',
        };
        const secret = 'sec_xyz_88';
        const { signature } = SignatureService.generateSignature(payload, secret);

        const validCheck = SignatureService.verifySignature(payload, signature, secret);
        if (!validCheck.isValid) throw new Error('Valid signature failed verification');

        const forgedCheck = SignatureService.verifySignature(payload, 'FORGED_SIGNATURE_HEX', secret);
        if (forgedCheck.isValid) throw new Error('Forged signature unexpectedly accepted');
      }
    );

    // 3. Amount Validation
    await run(
      'Amount Validation & Decimal Precision',
      'Validation',
      'Should reject zero or negative amounts, and enforce positive decimal values',
      () => {
        const adminId = Database.getAdmins()[0]?.id || 'adm_1';
        const invalid1 = PaymentOrchestrator.createPaymentLink({
          customerId: 'cust_01',
          brandId: 'brd_samvit_01',
          gatewayAccountId: 'gw_eagle_sandbox',
          amount: -50,
          description: 'Negative test',
          adminId,
        });
        if (invalid1.success) throw new Error('Negative amount was accepted');

        const invalid2 = PaymentOrchestrator.createPaymentLink({
          customerId: 'cust_01',
          brandId: 'brd_samvit_01',
          gatewayAccountId: 'gw_eagle_sandbox',
          amount: 0,
          description: 'Zero test',
          adminId,
        });
        if (invalid2.success) throw new Error('Zero amount was accepted');
      }
    );

    // 4. Secure Random Public Token
    await run(
      'Cryptographically Random Public Token',
      'Security',
      'Tokens must start with PAY, use unpredictable random characters, and never use sequential database IDs',
      () => {
        const tokens = new Set<string>();
        for (let i = 0; i < 50; i++) {
          const t = PaymentOrchestrator.generateSecureToken();
          if (!t.startsWith('PAY') || t.length < 8) {
            throw new Error(`Token format invalid: ${t}`);
          }
          if (tokens.has(t)) {
            throw new Error(`Duplicate token generated: ${t}`);
          }
          tokens.add(t);
        }
      }
    );

    // 5. Template Engine XSS Escaping
    await run(
      'Template XSS Escaping',
      'Security',
      'Dynamic customer inputs with malicious HTML or scripts must be contextually escaped',
      () => {
        const rawTemplate = '<div>Hello {{customer.name}}</div>';
        const rendered = TemplateEngine.render(rawTemplate, {
          payment: { amount: '100.00', order_number: 'ORD', status: 'CREATED', created_at: '', expires_at: '' },
          customer: { name: '<script>alert(1)</script>', mobile: '123', email: 'test@example.com' },
          brand: { name: 'Brand', logo: '', primary_color: '#000', secondary_color: '#fff' },
        });

        if (rendered.includes('<script>')) {
          throw new Error(`XSS vulnerability: unescaped script tag found: ${rendered}`);
        }
        if (!rendered.includes('&lt;script&gt;alert(1)&lt;/script&gt;')) {
          throw new Error(`Failed to escape correctly: ${rendered}`);
        }
      }
    );

    // 6. Template Validation Rules
    await run(
      'Template Safety Validator',
      'Security',
      'Should reject direct script tags or inline event handlers in template editor',
      () => {
        const invalidScript = '<div onclick="steal()">Click</div><script>fetch()</script>';
        const validation = TemplateEngine.validateTemplate(invalidScript);
        if (validation.isValid) throw new Error('Dangerous script template was validated as valid');
        if (validation.errors.length < 2) throw new Error('Expected at least 2 security errors');
      }
    );

    // 7. CSV Injection Sanitization
    await run(
      'CSV Export Formula Injection Mitigation',
      'Security',
      'Cells starting with =, +, -, @ must be prepended with a single quote to neutralize spreadsheet execution',
      () => {
        const maliciousVal = '=CMD|"/C calc"!A0';
        const sanitized = ExportService.sanitizeCell(maliciousVal);
        if (!sanitized.startsWith(`"'=`)) {
          throw new Error(`Formula injection not neutralized: ${sanitized}`);
        }
      }
    );

    // 8. Auth Password Verification & Salting
    await run(
      'Password Hashing & PBKDF2 Salting',
      'Authentication',
      'Passwords must be hashed with unique salts and verified strictly',
      () => {
        const salt = 'unique_salt_test_123';
        const hash1 = AuthService.hashPassword('SecretPass123!', salt);
        const hash2 = AuthService.hashPassword('SecretPass123!', salt);
        const wrongHash = AuthService.hashPassword('WrongPassword', salt);

        if (hash1 !== hash2) throw new Error('Hash deterministic calculation failed');
        if (hash1 === wrongHash) throw new Error('Different passwords produced identical hash');
      }
    );

    // 9. Login Rate Limiting
    await run(
      'Brute Force Protection Rate Limiting',
      'Security',
      'Account or IP must be temporarily locked after 5 consecutive failed attempts',
      () => {
        const testUser = 'brute_test_user_' + Date.now();
        AuthService.clearFailedAttempts(testUser);

        for (let i = 0; i < 5; i++) {
          AuthService.recordFailedAttempt(testUser);
        }

        const check = AuthService.checkRateLimit(testUser);
        if (!check.isLocked) throw new Error('User was not locked after 5 failed attempts');
        AuthService.clearFailedAttempts(testUser);
      }
    );

    // 10. Role-based Permission Boundary
    await run(
      'RBAC Role Hierarchy',
      'Authorization',
      'Super Admin > Admin > Operator > Read Only permissions must be enforced server-side',
      () => {
        if (!AuthService.hasPermission('super_admin', 'admin')) throw new Error('Super admin should have admin rights');
        if (!AuthService.hasPermission('admin', 'operator')) throw new Error('Admin should have operator rights');
        if (AuthService.hasPermission('read_only', 'admin')) throw new Error('Read only should NOT have admin rights');
        if (AuthService.hasPermission('operator', 'super_admin')) throw new Error('Operator should NOT have super admin rights');
      }
    );

    // 11. Idempotent Webhook Processing
    await run(
      'Callback Idempotency & No Duplicate Success Downgrade',
      'Payments',
      'Repeated webhook callbacks for an already SUCCESS payment must be acknowledged without duplicate transitions or downgrades',
      async () => {
        const links = Database.getPaymentLinks();
        const paidLink = links.find((l) => l.status === 'SUCCESS');
        if (paidLink) {
          const payload: Record<string, unknown> = {
            mchId: 'MCH_EAGLE_SANDBOX_001',
            mchOrderNo: paidLink.merchantOrderNo,
            amount: paidLink.amountFormatted,
            status: 'pending', // late pending attempt
          };
          const secret = 'MCH_SANDBOX_SECRET_KEY_99';
          const { signature } = SignatureService.generateSignature(payload, secret);
          payload.sign = signature;

          const result = await PaymentOrchestrator.processWebhook(payload, JSON.stringify(payload), 'eaglepay');
          if (result.status !== 'IGNORED_DUPLICATE') {
            throw new Error(`Expected IGNORED_DUPLICATE, got ${result.status}`);
          }
          // Verify status remains SUCCESS
          const recheck = Database.getPaymentLinks().find((l) => l.id === paidLink.id);
          if (recheck?.status !== 'SUCCESS') {
            throw new Error(`Status was illegally downgraded to ${recheck?.status}`);
          }
        }
      }
    );

    // 12. Gateway Adapter Configuration Validation
    await run(
      'Gateway Adapter Configuration Validator',
      'Gateway',
      'Eagle Pay adapter must validate required mchId, mchKey, and valid Base URL',
      () => {
        const adapter = new EaglePayAdapter();
        const invalidConfig: Partial<GatewayAccount> = { mchId: '', mchKey: '' };
        const validation = adapter.validateConfiguration(invalidConfig);
        if (validation.isValid) throw new Error('Empty gateway configuration was approved');
        if (validation.errors.length < 3) throw new Error('Expected at least 3 validation errors for empty config');
      }
    );

    const total = results.length;
    const passed = results.filter((r) => r.passed).length;
    const failed = total - passed;

    return { total, passed, failed, results };
  }
}
