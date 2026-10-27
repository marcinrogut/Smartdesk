<?php

declare(strict_types=1);

namespace SmartDesk\Application\UseCase\Files;

use SmartDesk\Domain\Repository\FileStorageInterface;
use SmartDesk\Domain\ValueObject\RelativePath;

/** Wskazuje fizyczną ścieżkę pliku do pobrania po weryfikacji właściciela. */
final class DownloadFileHandler
{
    public function __construct(private readonly FileStorageInterface $storage)
    {
    }

    public function handle(int $userId, RelativePath $path): string
    {
        return $this->storage->resolveFile($userId, $path);
    }
}
