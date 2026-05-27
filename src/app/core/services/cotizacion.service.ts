import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  Cotizacion,
  CotizacionCreate,
  IncidentePendienteParaCotizar,
} from '../models/cotizacion.model';

/**
 * Servicio del admin_taller para el flujo de cotizaciones (CU-34).
 *
 * Nota: la aceptación de cotizaciones (CU-35) es del cliente y vive en la
 * app móvil — no se expone aquí.
 */
@Injectable({ providedIn: 'root' })
export class CotizacionService {
  private http = inject(HttpClient);
  private api  = environment.apiUrl;

  /** CU-34 — Lista los incidentes `buscando_taller` candidatos para este taller. */
  getPendientes(tallerId: string) {
    return this.http.get<IncidentePendienteParaCotizar[]>(
      `${this.api}/talleres/${tallerId}/cotizaciones-pendientes`,
    );
  }

  /** CU-34 — Envía una cotización del taller para un incidente. */
  crearCotizacion(incidenteId: string, tallerId: string, body: CotizacionCreate) {
    const params = new HttpParams().set('taller_id', tallerId);
    return this.http.post<Cotizacion>(
      `${this.api}/incidentes/${incidenteId}/cotizaciones`,
      body,
      { params },
    );
  }

  /** CU-34 — Retira la propia cotización antes de que el cliente elija. */
  retirarCotizacion(cotizacionId: string) {
    return this.http.delete<void>(`${this.api}/cotizaciones/${cotizacionId}`);
  }
}
