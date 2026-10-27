<?php

declare(strict_types=1);

namespace SmartDesk\Infrastructure\Persistence;

use PDO;
use RuntimeException;
use SmartDesk\Domain\Entity\User;
use SmartDesk\Domain\Repository\UserRepositoryInterface;
use SmartDesk\Domain\ValueObject\UserRole;

/** Repozytorium kont użytkowników oparte na PDO. */
final class PdoUserRepository implements UserRepositoryInterface
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    public function findById(int $id): ?User
    {
        $statement = $this->pdo->prepare(
            'SELECT id, username, role, enabled FROM users WHERE id = :id LIMIT 1'
        );
        $statement->execute(['id' => $id]);

        return $this->hydrate($statement->fetch());
    }

    public function findByUsername(string $username): ?User
    {
        $statement = $this->pdo->prepare(
            'SELECT id, username, role, enabled FROM users WHERE username = :username LIMIT 1'
        );
        $statement->execute(['username' => $username]);

        return $this->hydrate($statement->fetch());
    }

    public function all(): array
    {
        $statement = $this->pdo->query('SELECT id, username, role, enabled FROM users ORDER BY username');
        if ($statement === false) {
            return [];
        }

        /** @var array<int, array<string, mixed>> $rows */
        $rows = $statement->fetchAll();

        return array_map(static fn (array $row): User => User::fromRow($row), $rows);
    }

    public function verifyCredentials(string $username, string $password): ?User
    {
        $statement = $this->pdo->prepare(
            'SELECT id, username, role, enabled, password_hash FROM users WHERE username = :username LIMIT 1'
        );
        $statement->execute(['username' => $username]);
        $row = $statement->fetch();

        if (!is_array($row)) {
            return null;
        }

        $hash = (string) ($row['password_hash'] ?? '');
        if ($hash === '' || !password_verify($password, $hash)) {
            return null;
        }

        return User::fromRow($row);
    }

    public function create(string $username, string $plainPassword, UserRole $role, bool $enabled = true): User
    {
        $statement = $this->pdo->prepare(
            'INSERT INTO users (username, password_hash, role, enabled)
             VALUES (:username, :password_hash, :role, :enabled)'
        );
        $statement->execute([
            'username' => $username,
            'password_hash' => password_hash($plainPassword, PASSWORD_DEFAULT),
            'role' => $role->value,
            'enabled' => $enabled ? 1 : 0,
        ]);

        $id = (int) $this->pdo->lastInsertId();
        $user = $this->findById($id);

        if ($user === null) {
            throw new RuntimeException('Nie udało się utworzyć konta użytkownika.');
        }

        return $user;
    }

    public function disableAdminsExcept(int $userId): void
    {
        $statement = $this->pdo->prepare(
            'UPDATE users SET enabled = 0 WHERE role = :role AND id <> :id'
        );
        $statement->execute(['role' => UserRole::Admin->value, 'id' => $userId]);
    }

    private function hydrate(mixed $row): ?User
    {
        return is_array($row) ? User::fromRow($row) : null;
    }
}
