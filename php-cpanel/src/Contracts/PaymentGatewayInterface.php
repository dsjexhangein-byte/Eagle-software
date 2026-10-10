<?php
declare(strict_types=1);

namespace App\Contracts;

interface PaymentGatewayInterface
{
    public function getId(): string;
    public function getName(): string;
    public function configure(array $accountConfig): void;
    public function createPayment(array $params): array;
    public function verifyCallback(array $payload): array;
    public function queryPaymentStatus(string $mchOrderNo): array;
    public function validateConfiguration(array $config): array;
}
