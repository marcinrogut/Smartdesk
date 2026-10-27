/** Modele danych zgodne z kontraktem API v1 (public/api/v1). */

export type UserRole = 'user' | 'admin';

export interface User {
  id: number;
  username: string;
  role: UserRole;
  enabled: boolean;
}

/** Odpowiedź POST /auth/login.php. */
export interface AuthToken {
  token: string;
  user: User;
}

export interface UserCreateInput {
  username: string;
  password: string;
  role: UserRole;
}

export type FileEntryType = 'folder' | 'file';

export interface FileEntry {
  name: string;
  type: FileEntryType;
  size: number | null;
  /** Data ISO 8601 (DATE_ATOM). */
  modified: string;
}

/** Odpowiedź GET /files/index.php. */
export interface DirectoryListing {
  path: string;
  items: FileEntry[];
}

/** Odpowiedź POST /files/upload.php. */
export interface UploadResult {
  name: string;
  path: string;
}
