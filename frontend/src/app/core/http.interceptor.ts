import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { toApiError } from './api-error';
import { AuthService } from './auth.service';

/** Endpointy auth, które nie używają nagłówka Bearer (i nie podlegają auto-refresh). */
const PUBLIC_AUTH_PATHS = ['/auth/login.php', '/auth/refresh.php'];

function isPublicAuth(url: string): boolean {
  return PUBLIC_AUTH_PATHS.some((path) => url.includes(path));
}

/**
 * Dokleja nagłówek Bearer, obsługuje wygaśnięcie tokenu (401 → refresh + ponowna próba)
 * oraz normalizuje błędy do ApiError.
 */
export const apiInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const publicAuth = isPublicAuth(request.url);
  const token = auth.getToken();

  const authorizedRequest =
    token && !publicAuth
      ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : request;

  return next(authorizedRequest).pipe(
    catchError((error: unknown) => {
      const isUnauthorized = error instanceof HttpErrorResponse && error.status === 401;

      if (isUnauthorized && token && !publicAuth) {
        return auth.refreshToken().pipe(
          switchMap((freshToken) =>
            next(request.clone({ setHeaders: { Authorization: `Bearer ${freshToken}` } })).pipe(
              catchError((retryError: unknown) => throwError(() => toApiError(retryError))),
            ),
          ),
          catchError(() => {
            auth.logout();
            return throwError(() => toApiError(error));
          }),
        );
      }

      return throwError(() => toApiError(error));
    }),
  );
};
