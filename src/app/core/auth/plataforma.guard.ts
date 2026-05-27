import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Guard de rol superadmin_plataforma (CU-28 / CU-29). Cross-tenant: gestiona
 * la plataforma completa (tenants y solicitudes de tenant).
 */
export const plataformaGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (!auth.hasToken()) {
    return router.createUrlTree(['/login']);
  }

  const check = () => {
    const rol = auth.currentUser()?.rol?.nombre;
    if (rol === 'superadmin_plataforma') return true;
    if (rol === 'admin_tenant') return router.createUrlTree(['/admin-tenant']);
    return router.createUrlTree(['/dashboard']);
  };

  if (auth.currentUser()) return check();

  return auth.loadCurrentUser().pipe(
    map(() => check()),
    catchError(() => {
      auth.clearTokens();
      return of(router.createUrlTree(['/login']));
    }),
  );
};
