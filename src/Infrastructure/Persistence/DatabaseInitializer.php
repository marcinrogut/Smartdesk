<?php

declare(strict_types=1);

namespace SmartDesk\Infrastructure\Persistence;

use PDO;
use SmartDesk\Domain\ValueObject\UserRole;
use Throwable;

/**
 * Automatyczne przygotowanie schematu i konta domyślnego administratora.
 * Uruchamiane z bootstrap.php przy pierwszym żądaniu HTTP.
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

    /** Zakłada konto admin/admin, jeżeli w bazie nie ma jeszcze żadnego użytkownika. */
    public function ensureDefaultAdmin(): void
    {
        $statement = $this->pdo->query('SELECT COUNT(*) FROM users');
        if ($statement === false) {
            return;
        }

        $count = $statement->fetchColumn();
        if (is_numeric($count) && (int) $count > 0) {
            return;
        }

        (new PdoUserRepository($this->pdo))->create('admin', 'admin', UserRole::Admin, true);
    }
}
