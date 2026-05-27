/**
 * Guard para rutas públicas (landing, login).
 * Si el usuario ya tiene token activo → redirige al panel que le corresponde.
 */
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { AuthService } from './auth.service';
import { RolNombre } from '../models/usuario.model';

function rutaPorRol(rol: RolNombre | undefined): string {
  switch (rol) {
    case 'superadmin_plataforma': return '/plataforma';
    case 'admin_tenant':          return '/admin-tenant';
    case 'admin_taller':          return '/dashboard';
    default:                      return '/login';
  }
}

export const guestGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (!auth.hasToken()) return true;

  if (auth.currentUser()) {
    return router.createUrlTree([rutaPorRol(auth.currentUser()!.rol?.nombre)]);
  }

  return auth.loadCurrentUser().pipe(
    map(user => router.createUrlTree([rutaPorRol(user.rol?.nombre)])),
    catchError(() => {
      auth.clearTokens();
      return of(true);
    }),
  );
};
