import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from './auth.service';

/** Wpuszcza tylko zalogowanych; w razie potrzeby najpierw dociąga profil. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login'], { queryParams: { redirect: state.url } });
  }

  return auth.ensureMe().pipe(map(() => true));
};

/** Wpuszcza tylko administratorów. */
export const adminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login'], { queryParams: { redirect: state.url } });
  }

  return auth.ensureMe().pipe(map(() => (auth.isAdmin() ? true : router.createUrlTree(['/']))));
};
