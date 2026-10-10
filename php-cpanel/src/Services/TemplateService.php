<?php
declare(strict_types=1);

namespace App\Services;

class TemplateService
{
    public static function render(string $templateHtml, array $context): string
    {
        $amount = (string)($context['payment']['amount'] ?? '1,338.00');
        // Clean numeric amount without comma
        $cleanAmount = str_replace(',', '', $amount);
        $buttonText = (string)($context['brand']['button_text'] ?? 'PAY NOW');
        $primaryColor = (string)($context['brand']['primary_color'] ?? '#0f766e');
        $buttonColor = (string)($context['brand']['button_color'] ?? $primaryColor);
        $orderNo = (string)($context['payment']['loan_order_number'] ?? ($context['payment']['order_number'] ?? 'ORD-2181993'));
        $rawMobile = (string)($context['customer']['mobile'] ?? '+91 9876543210');
        $maskedMobile = strlen($rawMobile) > 6 ? substr($rawMobile, 0, 3) . '****' . substr($rawMobile, -3) : $rawMobile;
        $customerName = (string)($context['customer']['name'] ?? 'PARVEEN');
        $pan = (string)($context['customer']['pan'] ?? 'DOJPC3710R');
        $bankAccount = (string)($context['customer']['bank_account'] ?? '••••••••3819');
        $execName = (string)($context['customer']['executive_name'] ?? 'Recovery Officer');
        $repaymentDate = (string)($context['payment']['repayment_date'] ?? date('d/m/Y'));
        $status = (string)($context['payment']['status'] ?? 'Pending');
        $brandName = (string)($context['brand']['name'] ?? 'Karya Loan');
        $brandLogo = (string)($context['brand']['logo'] ?? '');
        $payLink = (string)($context['payment']['link'] ?? ($context['site']['url'] ?? ''));

        $buttonHtml = '<button type="button" class="pay-btn" onclick="window.__initiatePay&&window.__initiatePay()" style="width:100%;padding:14px 20px;background-color:' . htmlspecialchars($buttonColor, ENT_QUOTES) . ';color:#ffffff;font-weight:800;font-size:14px;border-radius:16px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 14px rgba(0,0,0,0.12);"><span>' . htmlspecialchars($buttonText, ENT_QUOTES) . '</span> <span>₹ ' . htmlspecialchars($amount, ENT_QUOTES) . '</span></button>';

        // Exact token dictionary mapping all common formats ({amount}, {{amount}}, {{payment.amount}}, etc.)
        $replacements = [
            // Amount variants
            '{{payment.amount}}' => htmlspecialchars($amount, ENT_QUOTES, 'UTF-8'),
            '{payment.amount}' => htmlspecialchars($amount, ENT_QUOTES, 'UTF-8'),
            '{{payment_amount}}' => htmlspecialchars($amount, ENT_QUOTES, 'UTF-8'),
            '{payment_amount}' => htmlspecialchars($amount, ENT_QUOTES, 'UTF-8'),
            '{{amount}}' => htmlspecialchars($amount, ENT_QUOTES, 'UTF-8'),
            '{amount}' => htmlspecialchars($amount, ENT_QUOTES, 'UTF-8'),
            '{{AMOUNT}}' => htmlspecialchars($amount, ENT_QUOTES, 'UTF-8'),
            '{AMOUNT}' => htmlspecialchars($amount, ENT_QUOTES, 'UTF-8'),
            '{{loan_amount}}' => htmlspecialchars($amount, ENT_QUOTES, 'UTF-8'),
            '{loan_amount}' => htmlspecialchars($amount, ENT_QUOTES, 'UTF-8'),
            '{{payable_amount}}' => htmlspecialchars($amount, ENT_QUOTES, 'UTF-8'),
            '{payable_amount}' => htmlspecialchars($amount, ENT_QUOTES, 'UTF-8'),
            '{{total_amount}}' => htmlspecialchars($amount, ENT_QUOTES, 'UTF-8'),
            '{total_amount}' => htmlspecialchars($amount, ENT_QUOTES, 'UTF-8'),
            '{{settlement_amount}}' => htmlspecialchars($amount, ENT_QUOTES, 'UTF-8'),
            '{settlement_amount}' => htmlspecialchars($amount, ENT_QUOTES, 'UTF-8'),

            // Button & Actions
            '{{payment.button}}' => $buttonHtml,
            '{payment.button}' => $buttonHtml,
            '{{button}}' => $buttonHtml,
            '{button}' => $buttonHtml,
            '{{pay_button}}' => $buttonHtml,
            '{pay_button}' => $buttonHtml,
            '{{payment.button_text}}' => htmlspecialchars($buttonText, ENT_QUOTES, 'UTF-8'),
            '{payment.button_text}' => htmlspecialchars($buttonText, ENT_QUOTES, 'UTF-8'),

            // Dates & References
            '{{payment.repayment_date}}' => htmlspecialchars($repaymentDate, ENT_QUOTES, 'UTF-8'),
            '{payment.repayment_date}' => htmlspecialchars($repaymentDate, ENT_QUOTES, 'UTF-8'),
            '{{repayment_date}}' => htmlspecialchars($repaymentDate, ENT_QUOTES, 'UTF-8'),
            '{repayment_date}' => htmlspecialchars($repaymentDate, ENT_QUOTES, 'UTF-8'),
            '{{due_date}}' => htmlspecialchars($repaymentDate, ENT_QUOTES, 'UTF-8'),
            '{due_date}' => htmlspecialchars($repaymentDate, ENT_QUOTES, 'UTF-8'),
            '{{payment.loan_order_number}}' => htmlspecialchars($orderNo, ENT_QUOTES, 'UTF-8'),
            '{payment.loan_order_number}' => htmlspecialchars($orderNo, ENT_QUOTES, 'UTF-8'),
            '{{loan_order_number}}' => htmlspecialchars($orderNo, ENT_QUOTES, 'UTF-8'),
            '{loan_order_number}' => htmlspecialchars($orderNo, ENT_QUOTES, 'UTF-8'),
            '{{payment.order_number}}' => htmlspecialchars($orderNo, ENT_QUOTES, 'UTF-8'),
            '{payment.order_number}' => htmlspecialchars($orderNo, ENT_QUOTES, 'UTF-8'),
            '{{order_no}}' => htmlspecialchars($orderNo, ENT_QUOTES, 'UTF-8'),
            '{order_no}' => htmlspecialchars($orderNo, ENT_QUOTES, 'UTF-8'),
            '{{order_number}}' => htmlspecialchars($orderNo, ENT_QUOTES, 'UTF-8'),
            '{order_number}' => htmlspecialchars($orderNo, ENT_QUOTES, 'UTF-8'),
            '{{payment.status}}' => htmlspecialchars($status, ENT_QUOTES, 'UTF-8'),
            '{payment.status}' => htmlspecialchars($status, ENT_QUOTES, 'UTF-8'),
            '{{status}}' => htmlspecialchars($status, ENT_QUOTES, 'UTF-8'),
            '{status}' => htmlspecialchars($status, ENT_QUOTES, 'UTF-8'),
            '{{payment.created_at}}' => htmlspecialchars((string)($context['payment']['created_at'] ?? date('d/m/Y')), ENT_QUOTES, 'UTF-8'),
            '{payment.created_at}' => htmlspecialchars((string)($context['payment']['created_at'] ?? date('d/m/Y')), ENT_QUOTES, 'UTF-8'),
            '{{payment.expires_at}}' => htmlspecialchars((string)($context['payment']['expires_at'] ?? date('d/m/Y', strtotime('+3 days'))), ENT_QUOTES, 'UTF-8'),
            '{payment.expires_at}' => htmlspecialchars((string)($context['payment']['expires_at'] ?? date('d/m/Y', strtotime('+3 days'))), ENT_QUOTES, 'UTF-8'),
            '{{payment.reference}}' => htmlspecialchars((string)($context['payment']['reference'] ?? 'REF-SETTLEMENT-01'), ENT_QUOTES, 'UTF-8'),
            '{payment.reference}' => htmlspecialchars((string)($context['payment']['reference'] ?? 'REF-SETTLEMENT-01'), ENT_QUOTES, 'UTF-8'),
            '{{payment.link}}' => htmlspecialchars($payLink, ENT_QUOTES, 'UTF-8'),
            '{payment.link}' => htmlspecialchars($payLink, ENT_QUOTES, 'UTF-8'),
            '{{payment_link}}' => htmlspecialchars($payLink, ENT_QUOTES, 'UTF-8'),
            '{payment_link}' => htmlspecialchars($payLink, ENT_QUOTES, 'UTF-8'),
            '{{link}}' => htmlspecialchars($payLink, ENT_QUOTES, 'UTF-8'),
            '{link}' => htmlspecialchars($payLink, ENT_QUOTES, 'UTF-8'),

            // Customer details
            '{{customer.name}}' => htmlspecialchars($customerName, ENT_QUOTES, 'UTF-8'),
            '{customer.name}' => htmlspecialchars($customerName, ENT_QUOTES, 'UTF-8'),
            '{{customer_name}}' => htmlspecialchars($customerName, ENT_QUOTES, 'UTF-8'),
            '{customer_name}' => htmlspecialchars($customerName, ENT_QUOTES, 'UTF-8'),
            '{{name}}' => htmlspecialchars($customerName, ENT_QUOTES, 'UTF-8'),
            '{name}' => htmlspecialchars($customerName, ENT_QUOTES, 'UTF-8'),
            '{{customer.mobile}}' => htmlspecialchars($rawMobile, ENT_QUOTES, 'UTF-8'),
            '{customer.mobile}' => htmlspecialchars($rawMobile, ENT_QUOTES, 'UTF-8'),
            '{{customer_mobile}}' => htmlspecialchars($rawMobile, ENT_QUOTES, 'UTF-8'),
            '{customer_mobile}' => htmlspecialchars($rawMobile, ENT_QUOTES, 'UTF-8'),
            '{{mobile}}' => htmlspecialchars($rawMobile, ENT_QUOTES, 'UTF-8'),
            '{mobile}' => htmlspecialchars($rawMobile, ENT_QUOTES, 'UTF-8'),
            '{{phone}}' => htmlspecialchars($rawMobile, ENT_QUOTES, 'UTF-8'),
            '{phone}' => htmlspecialchars($rawMobile, ENT_QUOTES, 'UTF-8'),
            '{{customer.masked_mobile}}' => htmlspecialchars($maskedMobile, ENT_QUOTES, 'UTF-8'),
            '{customer.masked_mobile}' => htmlspecialchars($maskedMobile, ENT_QUOTES, 'UTF-8'),
            '{{masked_mobile}}' => htmlspecialchars($maskedMobile, ENT_QUOTES, 'UTF-8'),
            '{masked_mobile}' => htmlspecialchars($maskedMobile, ENT_QUOTES, 'UTF-8'),
            '{{customer.email}}' => htmlspecialchars((string)($context['customer']['email'] ?? 'customer@example.com'), ENT_QUOTES, 'UTF-8'),
            '{customer.email}' => htmlspecialchars((string)($context['customer']['email'] ?? 'customer@example.com'), ENT_QUOTES, 'UTF-8'),
            '{{customer.pan}}' => htmlspecialchars($pan, ENT_QUOTES, 'UTF-8'),
            '{customer.pan}' => htmlspecialchars($pan, ENT_QUOTES, 'UTF-8'),
            '{{pan}}' => htmlspecialchars($pan, ENT_QUOTES, 'UTF-8'),
            '{pan}' => htmlspecialchars($pan, ENT_QUOTES, 'UTF-8'),
            '{{pan_number}}' => htmlspecialchars($pan, ENT_QUOTES, 'UTF-8'),
            '{pan_number}' => htmlspecialchars($pan, ENT_QUOTES, 'UTF-8'),
            '{{customer.bank_account}}' => htmlspecialchars($bankAccount, ENT_QUOTES, 'UTF-8'),
            '{customer.bank_account}' => htmlspecialchars($bankAccount, ENT_QUOTES, 'UTF-8'),
            '{{bank_account}}' => htmlspecialchars($bankAccount, ENT_QUOTES, 'UTF-8'),
            '{bank_account}' => htmlspecialchars($bankAccount, ENT_QUOTES, 'UTF-8'),
            '{{customer.executive_name}}' => htmlspecialchars($execName, ENT_QUOTES, 'UTF-8'),
            '{customer.executive_name}' => htmlspecialchars($execName, ENT_QUOTES, 'UTF-8'),
            '{{executive_name}}' => htmlspecialchars($execName, ENT_QUOTES, 'UTF-8'),
            '{executive_name}' => htmlspecialchars($execName, ENT_QUOTES, 'UTF-8'),
            '{{customer.address}}' => htmlspecialchars((string)($context['customer']['address'] ?? ''), ENT_QUOTES, 'UTF-8'),
            '{customer.address}' => htmlspecialchars((string)($context['customer']['address'] ?? ''), ENT_QUOTES, 'UTF-8'),

            // Brand details
            '{{brand.name}}' => htmlspecialchars($brandName, ENT_QUOTES, 'UTF-8'),
            '{brand.name}' => htmlspecialchars($brandName, ENT_QUOTES, 'UTF-8'),
            '{{brand_name}}' => htmlspecialchars($brandName, ENT_QUOTES, 'UTF-8'),
            '{brand_name}' => htmlspecialchars($brandName, ENT_QUOTES, 'UTF-8'),
            '{{brand.logo}}' => htmlspecialchars($brandLogo, ENT_QUOTES, 'UTF-8'),
            '{brand.logo}' => htmlspecialchars($brandLogo, ENT_QUOTES, 'UTF-8'),
            '{{brand.primary_color}}' => htmlspecialchars($primaryColor, ENT_QUOTES, 'UTF-8'),
            '{brand.primary_color}' => htmlspecialchars($primaryColor, ENT_QUOTES, 'UTF-8'),
            '{{brand.secondary_color}}' => htmlspecialchars((string)($context['brand']['secondary_color'] ?? '#0d9488'), ENT_QUOTES, 'UTF-8'),
            '{brand.secondary_color}' => htmlspecialchars((string)($context['brand']['secondary_color'] ?? '#0d9488'), ENT_QUOTES, 'UTF-8'),
            '{{brand.button_color}}' => htmlspecialchars($buttonColor, ENT_QUOTES, 'UTF-8'),
            '{brand.button_color}' => htmlspecialchars($buttonColor, ENT_QUOTES, 'UTF-8'),
            '{{brand.button_text}}' => htmlspecialchars($buttonText, ENT_QUOTES, 'UTF-8'),
            '{brand.button_text}' => htmlspecialchars($buttonText, ENT_QUOTES, 'UTF-8'),
            '{{brand.support_email}}' => htmlspecialchars((string)($context['brand']['support_email'] ?? 'support@loan.com'), ENT_QUOTES, 'UTF-8'),
            '{brand.support_email}' => htmlspecialchars((string)($context['brand']['support_email'] ?? 'support@loan.com'), ENT_QUOTES, 'UTF-8'),
            '{{brand.support_phone}}' => htmlspecialchars((string)($context['brand']['support_phone'] ?? '+91 800-444-2200'), ENT_QUOTES, 'UTF-8'),
            '{brand.support_phone}' => htmlspecialchars((string)($context['brand']['support_phone'] ?? '+91 800-444-2200'), ENT_QUOTES, 'UTF-8'),

            '{{site.name}}' => htmlspecialchars((string)($context['site']['name'] ?? 'EaglePay Platform'), ENT_QUOTES, 'UTF-8'),
            '{site.name}' => htmlspecialchars((string)($context['site']['name'] ?? 'EaglePay Platform'), ENT_QUOTES, 'UTF-8'),
            '{{site.url}}' => htmlspecialchars((string)($context['site']['url'] ?? ''), ENT_QUOTES, 'UTF-8'),
            '{site.url}' => htmlspecialchars((string)($context['site']['url'] ?? ''), ENT_QUOTES, 'UTF-8'),
            '{{current.year}}' => date('Y'),
            '{current.year}' => date('Y'),
        ];

        $output = str_replace(array_keys($replacements), array_values($replacements), $templateHtml);

        // Fallback regex to catch any remaining variations like {amount}, {{amount}}, {Amount}, {AMOUNT}
        $output = preg_replace('/\{{1,2}(?:payment\.)?(?:loan_|payable_|total_)?amount\}{1,2}/i', htmlspecialchars($amount, ENT_QUOTES, 'UTF-8'), $output);
        $output = preg_replace('/\{{1,2}(?:customer\.)?name\}{1,2}/i', htmlspecialchars($customerName, ENT_QUOTES, 'UTF-8'), $output);
        $output = preg_replace('/\{{1,2}(?:customer\.)?(?:masked_)?mobile\}{1,2}/i', htmlspecialchars($maskedMobile, ENT_QUOTES, 'UTF-8'), $output);
        $output = preg_replace('/\{{1,2}(?:customer\.)?pan(?:_number)?\}{1,2}/i', htmlspecialchars($pan, ENT_QUOTES, 'UTF-8'), $output);
        $output = preg_replace('/\{{1,2}(?:payment\.)?(?:loan_)?order_no(?:umber)?\}{1,2}/i', htmlspecialchars($orderNo, ENT_QUOTES, 'UTF-8'), $output);
        $output = preg_replace('/\{{1,2}(?:payment\.)?(?:repayment|due)_date\}{1,2}/i', htmlspecialchars($repaymentDate, ENT_QUOTES, 'UTF-8'), $output);
        $output = preg_replace('/\{{1,2}(?:payment\.)?(?:payment_)?link\}{1,2}/i', htmlspecialchars($payLink, ENT_QUOTES, 'UTF-8'), $output);

        // Clean any double currency symbols like ₹₹ or ₹ ₹
        $output = preg_replace('/₹\s*₹/', '₹', $output);

        return $output;
    }
}
