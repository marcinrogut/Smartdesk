<?php

declare(strict_types=1);

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use SmartDesk\Application\Exception\ValidationException;
use SmartDesk\Application\UseCase\Users\CreateUserHandler;
use SmartDesk\Domain\Entity\User;
use SmartDesk\Domain\Repository\FileStorageInterface;
use SmartDesk\Domain\Repository\UserRepositoryInterface;
use SmartDesk\Domain\ValueObject\RelativePath;
use SmartDesk\Domain\ValueObject\UserRole;

final class CreateUserHandlerTest extends TestCase
{
    /**
     * @return array{0:CreateUserHandler,1:object,2:object}
     */
    private function makeHandler(): array
    {
        $users = new class implements UserRepositoryInterface {
            /** @var list<array<string, mixed>> */
            public array $rows = [];
            private int $nextId = 1;

            public function findById(int $id): ?User
            {
                foreach ($this->rows as $row) {
                    if ($row['id'] === $id) {
                        return User::fromRow($row);
                    }
                }

                return null;
            }

            public function findByUsername(string $username): ?User
            {
                foreach ($this->rows as $row) {
                    if ($row['username'] === $username) {
                        return User::fromRow($row);
                    }
                }

                return null;
            }

            public function all(): array
            {
                return array_map(static fn (array $row): User => User::fromRow($row), $this->rows);
            }

            public function verifyCredentials(string $username, string $password): ?User
            {
                return null;
            }

            public function create(string $username, string $plainPassword, UserRole $role, bool $enabled = true): User
            {
                $row = [
                    'id' => $this->nextId++,
                    'username' => $username,
                    'role' => $role->value,
                    'enabled' => $enabled,
                ];
                $this->rows[] = $row;

                return User::fromRow($row);
            }

            public function disableAdminsExcept(int $userId): void
            {
                foreach ($this->rows as $index => $row) {
                    if ($row['role'] === UserRole::Admin->value && $row['id'] !== $userId) {
                        $this->rows[$index]['enabled'] = false;
                    }
                }
            }
        };

        $storage = new class implements FileStorageInterface {
            public function ensureHome(int $userId): void
            {
            }

            public function listDirectory(int $userId, RelativePath $directory): array
            {
                return [];
            }

            public function createDirectory(int $userId, RelativePath $directory): void
            {
            }

            public function storeUploadedFile(
                int $userId,
                RelativePath $directory,
                string $originalName,
                string $temporaryPath,
            ): RelativePath {
                return RelativePath::root();
            }

            public function delete(int $userId, RelativePath $path): void
            {
            }

            public function resolveFile(int $userId, RelativePath $path): string
            {
                return '';
            }
        };

        return [new CreateUserHandler($users, $storage), $users, $storage];
    }

    public function testNewAdminDisablesPreviousAdmins(): void
    {
        [$handler, $users] = $this->makeHandler();

        $users->create('admin', 'admin', UserRole::Admin, true);
        $handler->handle('second', 'secret', UserRole::Admin);

        $admins = array_values(array_filter(
            $users->rows,
            static fn (array $row): bool => $row['role'] === UserRole::Admin->value
        ));

        $enabledAdmins = array_values(array_filter(
            $admins,
            static fn (array $row): bool => $row['enabled'] === true
        ));

        $this->assertCount(2, $admins);
        $this->assertCount(1, $enabledAdmins);
        $this->assertSame('second', $enabledAdmins[0]['username']);
    }

    public function testPlainUserDoesNotDisableAdmin(): void
    {
        [$handler, $users] = $this->makeHandler();

        $users->create('admin', 'admin', UserRole::Admin, true);
        $handler->handle('regular', 'secret', UserRole::User);

        $enabledAdmins = array_values(array_filter(
            $users->rows,
            static fn (array $row): bool => $row['role'] === UserRole::Admin->value && $row['enabled'] === true
        ));

        $this->assertCount(1, $enabledAdmins);
        $this->assertSame('admin', $enabledAdmins[0]['username']);
    }

    public function testInvalidUsernameIsRejected(): void
    {
        [$handler] = $this->makeHandler();

        $this->expectException(ValidationException::class);

        $handler->handle('ab', 'secret', UserRole::User);
    }

    public function testTooShortPasswordIsRejected(): void
    {
        [$handler] = $this->makeHandler();

        $this->expectException(ValidationException::class);

        $handler->handle('validuser', 'abc', UserRole::User);
    }

    public function testDuplicateUsernameIsRejected(): void
    {
        [$handler] = $this->makeHandler();

        $handler->handle('duplicate', 'secret', UserRole::User);

        $this->expectException(ValidationException::class);

        $handler->handle('duplicate', 'secret', UserRole::User);
    }
}
