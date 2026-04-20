import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Notificacion } from '../models/notificacion.model';

@Injectable({ providedIn: 'root' })
export class NotificacionService {
  private http = inject(HttpClient);
  private api  = environment.apiUrl;

  private _noLeidas = signal(0);
  readonly noLeidas = this._noLeidas.asReadonly();

  /** CU-21 — Lista de notificaciones del usuario autenticado */
  getNotificaciones(soloNoLeidas = false) {
    const params = soloNoLeidas ? '?solo_no_leidas=true' : '';
    return this.http
      .get<Notificacion[]>(`${this.api}/notificaciones${params}`)
      .pipe(
        tap(lista => {
          this._noLeidas.set(lista.filter(n => !n.leida).length);
        }),
      );
  }

  /** CU-09 — Marcar una notificación como leída */
  marcarLeida(id: string) {
    return this.http
      .patch<Notificacion>(`${this.api}/notificaciones/${id}/leer`, {})
      .pipe(tap(() => this._noLeidas.update(n => Math.max(0, n - 1))));
  }

  /** Marcar todas como leídas */
  marcarTodasLeidas() {
    return this.http
      .patch<{ actualizadas: number }>(`${this.api}/notificaciones/leer-todas`, {})
      .pipe(tap(() => this._noLeidas.set(0)));
  }

  /** Actualiza solo el contador sin traer toda la lista */
  refrescarContador() {
    this.getNotificaciones(true).subscribe();
  }
}
