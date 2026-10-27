<?php

declare(strict_types=1);

namespace SmartDesk\Infrastructure\Persistence;

use PDO;
use Throwable;

/**
 * Automatyczne przygotowanie schematu bazy danych.
 * Uruchamiane z bootstrap.php przy pierwszym żądaniu HTTP.
 *
 * Nie zakłada żadnego konta - dopóki w bazie nie ma administratora, dostęp
 * zapewnia wbudowane konto z PdoUserRepository.
 */
final class DatabaseInitializer
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    /** Tworzy tabele, jeśli schemat nie został jeszcze wdrożony. */
    public function migrate(): void
    {
        try {
            $this->pdo->query('SELECT 1 FROM users LIMIT 1');

            return;
        } catch (Throwable) {
            // Tabela nie istnieje — wdrażamy pełny schemat.
        }

        $schemaFile = SMARTDESK_ROOT . '/database/schema.sql';
        if (!is_file($schemaFile)) {
            return;
        }

        $this->pdo->exec((string) file_get_contents($schemaFile));
    }
}
