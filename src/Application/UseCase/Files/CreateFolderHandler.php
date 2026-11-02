<?php

declare(strict_types=1);

namespace SmartDesk\Application\UseCase\Files;

use SmartDesk\Application\Exception\ValidationException;
use SmartDesk\Domain\Exception\InvalidPathException;
use SmartDesk\Domain\Repository\FileStorageInterface;
use SmartDesk\Domain\ValueObject\RelativePath;

/** Tworzy nowy folder w katalogu użytkownika. */
final class CreateFolderHandler
{
    public function __construct(private readonly FileStorageInterface $storage)
    {
    }

    public function handle(int $userId, RelativePath $parent, string $name): void
    {
        try {
            $target = $parent->append(RelativePath::segment($name));
        } catch (InvalidPathException) {
            throw ValidationException::single('name', 'Nieprawidłowa nazwa folderu.');
        }

        try {
            $this->storage->createDirectory($userId, $target);
        } catch (\RuntimeException $exception) {
            if ($exception->getMessage() === 'ELEMENT_EXISTS') {
                throw ValidationException::single('name', 'Element o tej nazwie już istnieje.');
            }

            if ($exception->getMessage() === 'PARENT_NOT_FOUND') {
                throw ValidationException::single('path', 'Folder nadrzędny nie istnieje.');
            }

            throw $exception;
        }
    }
}
