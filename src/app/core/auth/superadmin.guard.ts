import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Guard de rol superadmin.
 * Primero verifica que haya token (igual que authGuard),
 * luego comprueba que el rol del usuario sea 'superadmin'.
 */
export const superadminGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (!auth.hasToken()) {
    return router.createUrlTree(['/login']);
  }

  const loadAndCheck = () => {
    const user = auth.currentUser();
    if (user?.rol?.nombre === 'superadmin') return true;
    // Usuario cargado pero no es superadmin
    return router.createUrlTree(['/dashboard']);
  };

  if (auth.currentUser()) {
    return loadAndCheck();
  }

  return auth.loadCurrentUser().pipe(
    map(() => {
      const user = auth.currentUser();
      if (user?.rol?.nombre === 'superadmin') return true;
      return router.createUrlTree(['/dashboard']);
    }),
    catchError(() => {
      auth.clearTokens();
      return of(router.createUrlTree(['/login']));
    }),
  );
};
