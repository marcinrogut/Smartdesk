<?php

declare(strict_types=1);

namespace SmartDesk\Domain\Entity;

use SmartDesk\Domain\ValueObject\UserRole;

/** Konto użytkownika Smartdesk. */
final class User
{
    public function __construct(
        public readonly int $id,
        public readonly string $username,
        public readonly UserRole $role,
        public readonly bool $enabled,
    ) {
    }

    /**
     * @param array<string, mixed> $row
     */
    public static function fromRow(array $row): self
    {
        $id = $row['id'] ?? 0;
        $username = $row['username'] ?? '';

        return new self(
            is_numeric($id) ? (int) $id : 0,
            is_string($username) ? $username : '',
            UserRole::fromMixed($row['role'] ?? null),
            (bool) ($row['enabled'] ?? false),
        );
    }

    public function isAdmin(): bool
    {
        return $this->role === UserRole::Admin;
    }

    /**
     * @return array{id:int,username:string,role:string,enabled:bool}
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'username' => $this->username,
            'role' => $this->role->value,
            'enabled' => $this->enabled,
        ];
    }
}
