<?php

declare(strict_types=1);

namespace SmartDesk\Application\UseCase\Files;

use SmartDesk\Application\Exception\ValidationException;
use SmartDesk\Domain\Repository\FileStorageInterface;
use SmartDesk\Domain\ValueObject\RelativePath;

/** Usuwa plik lub pusty folder należący do użytkownika. */
final class DeleteEntryHandler
{
    public function __construct(private readonly FileStorageInterface $storage)
    {
    }

    public function handle(int $userId, RelativePath $path): void
    {
        try {
            $this->storage->delete($userId, $path);
        } catch (\RuntimeException $exception) {
            if ($exception->getMessage() === 'DIRECTORY_NOT_EMPTY') {
                throw ValidationException::single('path', 'Można usuwać tylko puste foldery.');
            }

            throw $exception;
        }
    }
}
