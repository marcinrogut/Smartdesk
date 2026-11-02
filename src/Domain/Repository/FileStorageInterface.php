<?php

declare(strict_types=1);

namespace SmartDesk\Domain\Repository;

use SmartDesk\Domain\Entity\FileEntry;
use SmartDesk\Domain\ValueObject\RelativePath;

/** Kontrakt prywatnego magazynu plików użytkownika. */
interface FileStorageInterface
{
    /** Tworzy katalog domowy użytkownika ze standardowymi podfolderami (idempotentnie). */
    public function ensureHome(int $userId): void;

    /**
     * @return list<FileEntry>
     * @throws \RuntimeException gdy katalog nie istnieje
     */
    public function listDirectory(int $userId, RelativePath $directory): array;

    public function createDirectory(int $userId, RelativePath $directory): void;

    /** Zapisuje przesłany plik i zwraca jego ścieżkę względną. */
    public function storeUploadedFile(
        int $userId,
        RelativePath $directory,
        string $originalName,
        string $temporaryPath,
    ): RelativePath;

    public function delete(int $userId, RelativePath $path): void;

    /** Zwraca bezwzględną ścieżkę systemową dla istniejącego pliku (do pobrania). */
    public function resolveFile(int $userId, RelativePath $path): string;
}
