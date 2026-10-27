<?php

declare(strict_types=1);

namespace SmartDesk\Domain\ValueObject;

use SmartDesk\Domain\Exception\InvalidPathException;

/**
 * Bezpieczna ścieżka względna wewnątrz katalogu właściciela.
 *
 * Gwarantuje, że wartość nie zawiera segmentów "." / "..", znaków NUL ani
 * separatorów systemowych, dzięki czemu nie da się z niej wyjść poza katalog
 * użytkownika. Wszystkie operacje na plikach przyjmują wyłącznie ten typ.
 */
final class RelativePath
{
    private function __construct(private readonly string $value)
    {
    }

    public static function root(): self
    {
        return new self('');
    }

    /** Buduje ścieżkę z dowolnego wejścia (np. z parametru HTTP). */
    public static function fromString(?string $raw): self
    {
        $normalized = trim(str_replace('\\', '/', (string) $raw), " \t\n\r\0\x0B/");

        if ($normalized === '') {
            return self::root();
        }

        $segments = [];
        foreach (explode('/', $normalized) as $segment) {
            if ($segment === '') {
                continue;
            }

            $segments[] = self::assertSegment($segment);
        }

        return $segments === [] ? self::root() : new self(implode('/', $segments));
    }

    /** Buduje ścieżkę z pojedynczego elementu (nazwa pliku/folderu). */
    public static function segment(string $raw): self
    {
        return new self(self::assertSegment($raw));
    }

    private static function assertSegment(string $segment): string
    {
        if (
            $segment === ''
            || $segment === '.'
            || $segment === '..'
            || str_contains($segment, "\0")
            || str_contains($segment, '/')
            || str_contains($segment, '\\')
        ) {
            throw InvalidPathException::forValue($segment);
        }

        return $segment;
    }

    public function value(): string
    {
        return $this->value;
    }

    public function isEmpty(): bool
    {
        return $this->value === '';
    }

    public function basename(): string
    {
        if ($this->value === '') {
            return '';
        }

        $parts = explode('/', $this->value);

        return (string) end($parts);
    }

    public function parent(): self
    {
        if (!str_contains($this->value, '/')) {
            return self::root();
        }

        return new self(substr($this->value, 0, (int) strrpos($this->value, '/')));
    }

    public function append(self $child): self
    {
        if ($child->isEmpty()) {
            return $this;
        }

        return new self($this->isEmpty() ? $child->value : $this->value . '/' . $child->value);
    }
}
