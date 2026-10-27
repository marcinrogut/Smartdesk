<?php

declare(strict_types=1);

namespace SmartDesk\Domain\Exception;

use InvalidArgumentException;

/** Nieprawidłowa ścieżka względna (próba wyjścia poza katalog użytkownika). */
final class InvalidPathException extends InvalidArgumentException
{
    public static function forValue(string $value): self
    {
        return new self(sprintf('Nieprawidłowa ścieżka: "%s".', $value));
    }
}
