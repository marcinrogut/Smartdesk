<?php

declare(strict_types=1);

namespace SmartDesk\Application\Exception;

use RuntimeException;

/** Błąd walidacji danych wejściowych z mapą komunikatów per pole. */
final class ValidationException extends RuntimeException
{
    /**
     * @param array<string, string> $errors
     */
    public function __construct(public readonly array $errors, string $message = 'Validation failed')
    {
        parent::__construct($message);
    }

    public static function single(string $field, string $message): self
    {
        return new self([$field => $message]);
    }
}
