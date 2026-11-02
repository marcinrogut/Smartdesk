<?php

declare(strict_types=1);

namespace SmartDesk\Domain\Exception;

use RuntimeException;

/** Nieudane uwierzytelnienie wraz z powodem (kod przekazywany do API). */
final class AuthenticationException extends RuntimeException
{
    public const REASON_INVALID_CREDENTIALS = 'INVALID_CREDENTIALS';
    public const REASON_ACCOUNT_DISABLED = 'ACCOUNT_DISABLED';

    private function __construct(public readonly string $reason)
    {
        parent::__construct($reason);
    }

    public static function invalidCredentials(): self
    {
        return new self(self::REASON_INVALID_CREDENTIALS);
    }

    public static function accountDisabled(): self
    {
        return new self(self::REASON_ACCOUNT_DISABLED);
    }
}
