<?php

declare(strict_types=1);

namespace SmartDesk\Domain\ValueObject;

/** Rola użytkownika w systemie. */
enum UserRole: string
{
    case User = 'user';
    case Admin = 'admin';

    public static function fromMixed(mixed $value): self
    {
        return $value === self::Admin->value ? self::Admin : self::User;
    }
}
