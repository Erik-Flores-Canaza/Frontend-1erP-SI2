import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { AuthService } from './auth.service';

const isAdminTaller = (auth: AuthService) =>
  auth.currentUser()?.rol?.nombre === 'admin_taller';

export const authGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (!auth.hasToken()) {
    return router.createUrlTree(['/login']);
  }

  // Usuario ya cargado en memoria
  if (auth.currentUser()) {
    if (!isAdminTaller(auth)) return router.createUrlTree(['/superadmin']);
    return true;
  }

  // Token existe pero usuario no está en memoria → cargarlo
  return auth.loadCurrentUser().pipe(
    map(() => {
      if (!isAdminTaller(auth)) return router.createUrlTree(['/superadmin']);
      return true;
    }),
    catchError(() => {
      auth.clearTokens();
      return of(router.createUrlTree(['/login']));
    }),
  );
};
