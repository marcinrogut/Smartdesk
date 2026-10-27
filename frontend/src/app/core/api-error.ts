import { HttpErrorResponse } from '@angular/common/http';

/** Znormalizowany błąd API używany przez komponenty. */
export interface ApiError {
  status: number;
  message: string;
  errors: Record<string, unknown>;
}

interface EnvelopeLike {
  message?: string;
  errors?: Record<string, unknown>;
}

const FALLBACK = 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.';

/** Zamienia dowolny błąd (HttpErrorResponse lub już znormalizowany) na ApiError. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof HttpErrorResponse) {
    const body = (error.error ?? {}) as EnvelopeLike;
    return {
      status: error.status,
      message: body.message || error.message || FALLBACK,
      errors: body.errors ?? {},
    };
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const candidate = error as Partial<ApiError>;
    if (typeof candidate.message === 'string') {
      return {
        status: candidate.status ?? 0,
        message: candidate.message,
        errors: candidate.errors ?? {},
      };
    }
  }

  return { status: 0, message: FALLBACK, errors: {} };
}

/** Pierwszy komunikat walidacji danego pola (jeśli istnieje). */
export function fieldError(error: ApiError | null, field: string): string | null {
  const value = error?.errors[field];
  return typeof value === 'string' ? value : null;
}
