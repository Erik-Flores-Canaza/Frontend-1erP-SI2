import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { CalificacionModeracion } from '../models/calificacion.model';

@Injectable({ providedIn: 'root' })
export class CalificacionService {
  private http = inject(HttpClient);
  private api  = environment.apiUrl;

  /** CU-43 — reseñas del tenant para moderar (incluye ocultas). */
  listarModeracion() {
    return this.http.get<CalificacionModeracion[]>(`${this.api}/admin/calificaciones`);
  }

  ocultar(id: string) {
    return this.http.patch(`${this.api}/admin/calificaciones/${id}/ocultar`, {});
  }

  mostrar(id: string) {
    return this.http.patch(`${this.api}/admin/calificaciones/${id}/mostrar`, {});
  }
}
