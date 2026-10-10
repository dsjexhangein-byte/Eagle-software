<?php
declare(strict_types=1);

namespace App\Gateways;

use App\Contracts\PaymentGatewayInterface;
use App\Services\SignatureService;

class EaglePayAdapter implements PaymentGatewayInterface
{
    private array $account = [];

    public function getId(): string
    {
        return 'eaglepay';
    }

    public function getName(): string
    {
        return 'Eagle Pay';
    }

    public function configure(array $accountConfig): void
    {
        $this->account = $accountConfig;
    }

    public function validateConfiguration(array $config): array
    {
        $errors = [];
        if (empty($config['mch_id'])) {
            $errors[] = 'mch_id (Merchant ID) is required.';
        }
        if (empty($config['mch_key'])) {
            $errors[] = 'mch_key (Secret Key) is required.';
        }
        if (empty($config['base_url']) || !filter_var($config['base_url'], FILTER_VALIDATE_URL)) {
            $errors[] = 'A valid base_url is required.';
        }
        return ['isValid' => empty($errors), 'errors' => $errors];
    }

    public function createPayment(array $params): array
    {
        $mchId = $this->account['mch_id'] ?? '';
        $mchKey = $this->account['mch_key'] ?? '';
        $baseUrl = rtrim($this->account['base_url'] ?? '', '/');
        $tradeType = $params['tradeType'] ?? ($this->account['trade_type'] ?? 'INRUPI');

        $payload = [
            'mchId' => $mchId,
            'mchOrderNo' => $params['mchOrderNo'],
            'amount' => $params['amount'],
            'notifyUrl' => $params['notifyUrl'],
            'tradeType' => $tradeType,
        ];

        if (!empty($params['returnUrl'])) {
            $payload['returnUrl'] = $params['returnUrl'];
        }
        if (!empty($params['extra'])) {
            $payload['extra'] = $params['extra'];
        }

        $signing = SignatureService::generateSignature($payload, $mchKey);
        $payload['sign'] = $signing['signature'];

        $ch = curl_init("{$baseUrl}/payin");
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Accept: application/json'],
            CURLOPT_TIMEOUT => 15,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr = curl_error($ch);
        curl_close($ch);

        if ($response === false || !empty($curlErr)) {
            return [
                'success' => false,
                'status' => 'FAILED',
                'errorMessage' => "cURL Error: {$curlErr}",
                'rawResponse' => null,
            ];
        }

        $data = json_decode($response, true);
        if (!$data) {
            return [
                'success' => false,
                'status' => 'FAILED',
                'errorMessage' => "Invalid JSON from gateway (HTTP {$httpCode})",
                'rawResponse' => $response,
            ];
        }

        $isSuccess = (
            ($data['success'] ?? false) === true ||
            ($data['code'] ?? null) === 0 ||
            ($data['code'] ?? null) === 200 ||
            strtolower((string)($data['msg'] ?? '')) === 'success' ||
            strtolower((string)($data['message'] ?? '')) === 'success'
        );

        $orderData = $data['data'] ?? [];
        $payUrl = $orderData['pay_url'] ?? $orderData['payment_url'] ?? $orderData['payUrl'] ?? $data['pay_url'] ?? $data['payment_url'] ?? null;

        if ($isSuccess && ($payUrl !== null || !empty($orderData['order_no']) || !empty($orderData['orderNo']))) {
            return [
                'success' => true,
                'gatewayOrderNo' => $orderData['order_no'] ?? $orderData['orderNo'] ?? null,
                'mchOrderNo' => $orderData['merchant_order_no'] ?? $orderData['mchOrderNo'] ?? $params['mchOrderNo'],
                'amount' => (string)($orderData['amount'] ?? $params['amount']),
                'currency' => $orderData['currency'] ?? 'INR',
                'payUrl' => $payUrl,
                'status' => 'PENDING',
                'rawResponse' => $data,
            ];
        }

        $errMsg = $data['message'] ?? $data['msg'] ?? $data['error'] ?? 'Eagle Pay rejected payment creation';

        return [
            'success' => false,
            'status' => 'FAILED',
            'errorMessage' => $errMsg,
            'rawResponse' => $data,
        ];
    }

    public function verifyCallback(array $payload): array
    {
        $mchKey = $this->account['mch_key'] ?? '';
        $mchId = $this->account['mch_id'] ?? '';

        if (!empty($payload['mchId']) && $payload['mchId'] !== $mchId) {
            return [
                'isValid' => false,
                'status' => 'FAILED',
                'failureReason' => 'Merchant ID mismatch',
            ];
        }

        $receivedSign = $payload['sign'] ?? '';
        $verification = SignatureService::verifySignature($payload, $receivedSign, $mchKey);

        $statusStr = strtolower((string)($payload['status'] ?? ''));
        $status = 'PENDING';
        if ($statusStr === 'success' || $statusStr === '1') {
            $status = 'SUCCESS';
        } elseif ($statusStr === 'failed' || $statusStr === '2') {
            $status = 'FAILED';
        }

        return [
            'isValid' => $verification['isValid'],
            'mchOrderNo' => $payload['mchOrderNo'] ?? '',
            'gatewayOrderNo' => $payload['orderNo'] ?? null,
            'amount' => (string)($payload['amount'] ?? '0'),
            'currency' => $payload['currency'] ?? 'INR',
            'status' => $status,
            'paidAt' => $payload['paidAt'] ?? null,
            'signatureReceived' => $receivedSign,
            'signatureCalculated' => $verification['calculatedSign'],
            'failureReason' => $verification['isValid'] ? null : 'Signature hash mismatch',
        ];
    }

    public function queryPaymentStatus(string $mchOrderNo): array
    {
        $mchId = $this->account['mch_id'] ?? '';
        $mchKey = $this->account['mch_key'] ?? '';
        $baseUrl = rtrim($this->account['base_url'] ?? '', '/');

        $queryPayload = [
            'mchId' => $mchId,
            'mchOrderNo' => $mchOrderNo,
        ];

        $signing = SignatureService::generateSignature($queryPayload, $mchKey);
        $queryPayload['sign'] = $signing['signature'];

        $ch = curl_init("{$baseUrl}/check-order-status");
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($queryPayload),
            CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Accept: application/json'],
            CURLOPT_TIMEOUT => 15,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);

        $response = curl_exec($ch);
        curl_close($ch);

        $data = json_decode((string)$response, true);
        $isSuccess = (
            ($data['success'] ?? false) === true ||
            ($data['code'] ?? null) === 0 ||
            ($data['code'] ?? null) === 200 ||
            strtolower((string)($data['msg'] ?? '')) === 'success' ||
            strtolower((string)($data['message'] ?? '')) === 'success'
        );

        if ($isSuccess) {
            $item = $data['data'] ?? $data;
            $gwResp = $data['gateway_response'] ?? [];
            $gwData = $gwResp['data'] ?? [];

            $raw = strtolower((string)(
                $data['our_status'] ??
                $item['status'] ??
                $gwData['payStatus'] ??
                $item['payStatus'] ??
                ''
            ));

            $status = ($raw === 'success' || $raw === '1' || $raw === 'paid') ? 'SUCCESS' : (($raw === 'failed' || $raw === '2') ? 'FAILED' : 'PENDING');

            return [
                'success' => true,
                'status' => $status,
                'gatewayOrderNo' => $item['order_no'] ?? $item['orderNo'] ?? $gwData['orderNo'] ?? null,
                'rawResponse' => $data,
            ];
        }

        return [
            'success' => false,
            'status' => 'UNKNOWN',
            'errorMessage' => $data['message'] ?? $data['msg'] ?? 'Status check failed',
            'rawResponse' => $data,
        ];
    }
}
