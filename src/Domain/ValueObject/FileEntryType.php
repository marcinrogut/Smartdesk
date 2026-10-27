<?php

declare(strict_types=1);

namespace SmartDesk\Domain\ValueObject;

/** Typ elementu w katalogu użytkownika. */
enum FileEntryType: string
{
    case Folder = 'folder';
    case File = 'file';
}
