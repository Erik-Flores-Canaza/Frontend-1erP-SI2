import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Guard de rol admin_tenant (antes "superadmin", renombrado en Ciclo 4 / R1
 * multi-tenant). Valida token + que el usuario sea admin del tenant.
 */
export const adminTenantGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (!auth.hasToken()) {
    return router.createUrlTree(['/login']);
  }

  const check = () => {
    const rol = auth.currentUser()?.rol?.nombre;
    if (rol === 'admin_tenant') return true;
    if (rol === 'superadmin_plataforma') return router.createUrlTree(['/plataforma']);
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
