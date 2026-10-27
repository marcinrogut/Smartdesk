<?php

declare(strict_types=1);

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use SmartDesk\Api\TokenService;
use SmartDesk\Domain\ValueObject\UserRole;

final class TokenServiceTest extends TestCase
{
    private const SECRET = 'unit-test-secret-0123456789';

    public function testGeneratedTokenCanBeVerified(): void
    {
        $service = new TokenService(self::SECRET);
        $token = $service->generate(7, 'admin', UserRole::Admin);

        $payload = $service->verify($token);

        $this->assertIsArray($payload);
        $this->assertSame(7, $payload['user_id']);
        $this->assertSame('admin', $payload['username']);
        $this->assertSame('admin', $payload['role']);
    }

    public function testTokenSignedWithDifferentSecretIsRejected(): void
    {
        $token = (new TokenService(self::SECRET))->generate(1, 'admin', UserRole::Admin);

        $this->assertNull((new TokenService('other-secret'))->verify($token));
    }

    public function testTamperedTokenIsRejected(): void
    {
        $service = new TokenService(self::SECRET);
        $token = $service->generate(1, 'admin', UserRole::Admin);

        $this->assertNull($service->verify($token . 'x'));
    }

    public function testExpiredTokenIsRejected(): void
    {
        $service = (new TokenService(self::SECRET))->setExpirationTime(-10);
        $token = $service->generate(1, 'admin', UserRole::Admin);

        $this->assertNull($service->verify($token));
    }

    public function testMissingSecretThrows(): void
    {
        $this->expectException(\RuntimeException::class);

        $original = getenv('API_SECRET');
        putenv('API_SECRET');
        unset($_ENV['API_SECRET']);

        try {
            new TokenService();
        } finally {
            if ($original !== false) {
                putenv('API_SECRET=' . $original);
                $_ENV['API_SECRET'] = $original;
            }
        }
    }
}
