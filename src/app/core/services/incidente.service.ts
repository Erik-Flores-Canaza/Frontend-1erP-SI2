import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Incidente, EstadoIncidente } from '../models/incidente.model';

@Injectable({ providedIn: 'root' })
export class IncidenteService {
  private http = inject(HttpClient);
  private api  = environment.apiUrl;

  /** CU-06 — Detalle de un incidente */
  getIncidente(id: string) {
    return this.http.get<Incidente>(`${this.api}/incidentes/${id}`);
  }

  /** CU-14 — Cambiar estado del incidente */
  actualizarEstado(id: string, estado: EstadoIncidente, notas?: string) {
    return this.http.patch<Incidente>(`${this.api}/incidentes/${id}/estado`, { estado, notas });
  }
}
