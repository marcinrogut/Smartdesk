<?php

declare(strict_types=1);

namespace SmartDesk\Infrastructure\Persistence;

use PDO;
use PDOException;
use RuntimeException;

/** Współdzielone połączenie PDO z bazą MySQL/MariaDB (singleton). */
final class DatabaseConnection
{
    private static ?PDO $connection = null;

    /**
     * @param array{host:string,database:string,username:string,password:string,charset:string}|null $config
     */
    public static function connect(?array $config = null): PDO
    {
        if (self::$connection instanceof PDO) {
            return self::$connection;
        }

        $config ??= self::loadConfig();

        $dsn = sprintf(
            'mysql:host=%s;dbname=%s;charset=%s',
            $config['host'],
            $config['database'],
            $config['charset'],
        );

        try {
            self::$connection = new PDO($dsn, $config['username'], $config['password'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        } catch (PDOException $exception) {
            throw new RuntimeException(
                'Nie udało się połączyć z bazą danych MySQL. Sprawdź konfigurację. '
                . $exception->getMessage(),
                (int) $exception->getCode(),
                $exception,
            );
        }

        return self::$connection;
    }

    /** Przydatne w testach — pozwala wstrzyknąć własne połączenie. */
    public static function override(?PDO $connection): void
    {
        self::$connection = $connection;
    }

    /**
     * @return array{host:string,database:string,username:string,password:string,charset:string}
     */
    private static function loadConfig(): array
    {
        $configPath = SMARTDESK_ROOT . '/config/database.php';
        if (!is_file($configPath)) {
            throw new RuntimeException('Brak pliku konfiguracyjnego config/database.php.');
        }

        /** @var array<string, mixed> $config */
        $config = require $configPath;

        $normalized = [];
        foreach (['host', 'database', 'username', 'password', 'charset'] as $key) {
            $value = $config[$key] ?? null;
            if (!is_string($value)) {
                throw new RuntimeException("Nieprawidłowa konfiguracja bazy danych: brak klucza {$key}.");
            }

            $normalized[$key] = $value;
        }

        /** @var array{host:string,database:string,username:string,password:string,charset:string} $normalized */
        return $normalized;
    }
}
