<?php

declare(strict_types=1);

namespace SmartDesk\Domain\Entity;

use SmartDesk\Domain\ValueObject\FileEntryType;

/** Pojedynczy plik lub folder w katalogu użytkownika. */
final class FileEntry
{
    public function __construct(
        public readonly string $name,
        public readonly FileEntryType $type,
        public readonly ?int $size,
        public readonly int $modifiedAt,
    ) {
    }

    /**
     * @return array{name:string,type:string,size:int|null,modified:string}
     */
    public function toArray(): array
    {
        return [
            'name' => $this->name,
            'type' => $this->type->value,
            'size' => $this->size,
            'modified' => date(DATE_ATOM, $this->modifiedAt),
        ];
    }
}
