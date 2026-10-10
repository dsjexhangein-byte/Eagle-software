<?php
declare(strict_types=1);

namespace App\Services;

/**
 * Eagle Pay Signature Generation & Verification Service (PHP 8.2+)
 */
class SignatureService
{
    /**
     * Generate MD5 signature according to Eagle Pay contract:
     * 1. Remove 'sign' parameter
     * 2. Remove null and empty strings
     * 3. Sort keys in ASCII ascending order
     * 4. Build string key=value joined with '&' (NO urlencoding)
     * 5. Append &key=SECRET
     * 6. Return uppercase MD5 hash
     */
    public static function generateSignature(array $params, string $secretKey): array
    {
        if (empty($secretKey)) {
            throw new \InvalidArgumentException('Secret key (mchKey) is required.');
        }

        // 1 & 2. Filter empty and sign
        $filtered = [];
        foreach ($params as $k => $v) {
            if ($k === 'sign') {
                continue;
            }
            if ($v === null || $v === '') {
                continue;
            }
            $filtered[$k] = (string)$v;
        }

        // 3. Sort keys ASCII ascending
        ksort($filtered, SORT_STRING);

        // 4. Build string without urlencode
        $pairs = [];
        foreach ($filtered as $k => $v) {
            $pairs[] = "{$k}={$v}";
        }
        $queryString = implode('&', $pairs);

        // 5. Append &key=SECRET
        $rawString = "{$queryString}&key={$secretKey}";

        // 6. MD5 in uppercase
        $signature = strtoupper(md5($rawString));

        return [
            'signature' => $signature,
            'rawString' => $rawString,
        ];
    }

    /**
     * Verify incoming webhook signature using timing-safe comparison
     */
    public static function verifySignature(array $params, ?string $receivedSign, string $secretKey): array
    {
        if (empty($receivedSign)) {
            return [
                'isValid' => false,
                'calculatedSign' => '',
                'rawString' => '',
            ];
        }

        $result = self::generateSignature($params, $secretKey);
        $calculatedSign = $result['signature'];
        $rawString = $result['rawString'];

        $isValid = hash_equals($calculatedSign, strtoupper($receivedSign));

        return [
            'isValid' => $isValid,
            'calculatedSign' => $calculatedSign,
            'rawString' => $rawString,
        ];
    }
}
