import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (!auth.hasToken()) {
    return router.createUrlTree(['/login']);
  }

  // Si el usuario ya está cargado en memoria, dejamos pasar
  if (auth.currentUser()) {
    return true;
  }

  // Token existe pero usuario no está en memoria → cargarlo
  return auth.loadCurrentUser().pipe(
    map(() => true),
    catchError(() => {
      auth.clearTokens();
      return of(router.createUrlTree(['/login']));
    }),
  );
};
