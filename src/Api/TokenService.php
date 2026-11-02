<?php

declare(strict_types=1);

namespace SmartDesk\Api;

use RuntimeException;
use SmartDesk\Domain\ValueObject\UserRole;

/**
 * Minimalna implementacja tokenów JWT (HS256) bez zewnętrznych bibliotek.
 * Sekret pochodzi ze zmiennej środowiskowej API_SECRET.
 */
final class TokenService
{
    private const DEFAULT_EXPIRATION = 86400; // 24 godziny

    private readonly string $secret;
    private int $expirationTime = self::DEFAULT_EXPIRATION;

    public function __construct(string $secret = '')
    {
        $secret = $secret !== ''
            ? $secret
            : (string) ($_ENV['API_SECRET'] ?? getenv('API_SECRET') ?: '');

        if ($secret === '') {
            throw new RuntimeException('API_SECRET nie jest skonfigurowany. Ustaw go w .env lub .env.local.');
        }

        $this->secret = $secret;
    }

    public function generate(int $userId, string $username, UserRole $role): string
    {
        return $this->encode([
            'user_id' => $userId,
            'username' => $username,
            'role' => $role->value,
            'iat' => time(),
            'exp' => time() + $this->expirationTime,
        ]);
    }

    /**
     * @return array<string, mixed>|null
     */
    public function verify(string $token): ?array
    {
        return $this->decode($token);
    }

    public function setExpirationTime(int $seconds): self
    {
        $this->expirationTime = $seconds;

        return $this;
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function encode(array $payload): string
    {
        $header = ['typ' => 'Bearer', 'alg' => 'HS256'];

        $headerEncoded = $this->base64UrlEncode((string) json_encode($header));
        $payloadEncoded = $this->base64UrlEncode((string) json_encode($payload));
        $signature = hash_hmac('sha256', $headerEncoded . '.' . $payloadEncoded, $this->secret, true);

        return $headerEncoded . '.' . $payloadEncoded . '.' . $this->base64UrlEncode($signature);
    }

    /**
     * @return array<string, mixed>|null
     */
    private function decode(string $token): ?array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }

        [$headerEncoded, $payloadEncoded, $signatureEncoded] = $parts;

        $expected = $this->base64UrlEncode(
            hash_hmac('sha256', $headerEncoded . '.' . $payloadEncoded, $this->secret, true)
        );

        if (!hash_equals($expected, $signatureEncoded)) {
            return null;
        }

        $decoded = base64_decode(strtr($payloadEncoded, '-_', '+/'), true);
        if ($decoded === false) {
            return null;
        }

        /** @var mixed $payload */
        $payload = json_decode($decoded, true);
        if (!is_array($payload)) {
            return null;
        }

        if (isset($payload['exp']) && (int) $payload['exp'] < time()) {
            return null;
        }

        /** @var array<string, mixed> $payload */
        return $payload;
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }
}
