/**
 * Guard para rutas públicas (landing, login).
 * Si el usuario ya tiene token activo → redirige al dashboard.
 */
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { AuthService } from './auth.service';

export const guestGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (!auth.hasToken()) return true;

  // Token existe y usuario ya cargado en memoria
  if (auth.currentUser()) {
    const rol = auth.currentUser()!.rol?.nombre;
    return router.createUrlTree([rol === 'superadmin' ? '/superadmin' : '/dashboard']);
  }

  // Token existe pero usuario no en memoria → verificar con el servidor
  return auth.loadCurrentUser().pipe(
    map(user => {
      const rol = user.rol?.nombre;
      return router.createUrlTree([rol === 'superadmin' ? '/superadmin' : '/dashboard']);
    }),
    catchError(() => {
      // Token inválido o expirado → limpiar y dejar pasar
      auth.clearTokens();
      return of(true);
    }),
  );
};
