import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';
import { ConnectivityService } from './connectivity.service';
import { ToastService } from '../services/toast.service';

const METODOS_ESCRITURA = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Bloquea las llamadas de escritura (POST/PUT/PATCH/DELETE) cuando el navegador
 * está sin conexión. Las lecturas (GET) sí pasan: el service worker
 * intentará responder desde la caché del último estado conocido.
 *
 * Muestra un toast claro al usuario explicando que la acción quedó cancelada
 * porque el dispositivo está sin conexión.
 */
export const offlineWritesInterceptor: HttpInterceptorFn = (req, next) => {
  const conn  = inject(ConnectivityService);
  const toast = inject(ToastService);

  if (!conn.enLinea() && METODOS_ESCRITURA.has(req.method)) {
    toast.error('Sin conexión: la acción se canceló. Vuelve a intentarlo cuando recuperes internet.');
    return throwError(() => ({
      status: 0,
      statusText: 'Offline',
      offline: true,
      error: { detail: 'Sin conexión' },
    }));
  }

  return next(req);
};
