import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  Incidente, Asignacion,
  ResponderAsignacionBody, AsignarTecnicoBody,
} from '../models/incidente.model';
import { HistorialItem, MetricasTaller } from '../models/historial.model';

@Injectable({ providedIn: 'root' })
export class SolicitudService {
  private http = inject(HttpClient);
  private api  = environment.apiUrl;

  /** CU-12 — Solicitudes pendientes de respuesta del taller */
  getSolicitudes(tallerId: string) {
    return this.http.get<Incidente[]>(`${this.api}/talleres/${tallerId}/solicitudes`);
  }

  /** CU-13 — Órdenes activas (asignadas y aceptadas, sin completar) */
  getOrdenes(tallerId: string) {
    return this.http.get<Incidente[]>(`${this.api}/talleres/${tallerId}/ordenes-activas`);
  }

  /** CU-12 — Aceptar o rechazar una asignación */
  responderAsignacion(asignacionId: string, body: ResponderAsignacionBody) {
    return this.http.patch<Asignacion>(
      `${this.api}/asignaciones/${asignacionId}/responder`,
      body,
    );
  }

  /** CU-13 — Asignar un técnico a la orden */
  asignarTecnico(asignacionId: string, body: AsignarTecnicoBody) {
    return this.http.patch<Asignacion>(
      `${this.api}/asignaciones/${asignacionId}/asignar-tecnico`,
      body,
    );
  }

  /** CU-15 — Historial enriquecido de atenciones completadas/canceladas */
  getHistorial(tallerId: string) {
    return this.http.get<HistorialItem[]>(`${this.api}/talleres/${tallerId}/historial`);
  }

  /** CU-15 — Métricas de rendimiento del taller */
  getMetricas(tallerId: string) {
    return this.http.get<MetricasTaller>(`${this.api}/talleres/${tallerId}/metricas`);
  }
}
