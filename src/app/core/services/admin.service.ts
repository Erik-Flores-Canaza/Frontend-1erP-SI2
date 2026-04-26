import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  SolicitudRegistro,
  AprobacionResponse,
  MetricasGlobales,
} from '../models/solicitud-registro.model';
import { Usuario } from '../models/usuario.model';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private api  = environment.apiUrl;

  // ── CU-23: Solicitudes de registro ───────────────────────────────────────

  getSolicitudes(estado?: string) {
    const params: Record<string, string> = {};
    if (estado) params['estado'] = estado;
    return this.http.get<SolicitudRegistro[]>(`${this.api}/admin/solicitudes-taller`, { params });
  }

  aprobarSolicitud(id: string) {
    return this.http.patch<AprobacionResponse>(
      `${this.api}/admin/solicitudes-taller/${id}/aprobar`,
      {},
    );
  }

  rechazarSolicitud(id: string, motivo_rechazo: string) {
    return this.http.patch<SolicitudRegistro>(
      `${this.api}/admin/solicitudes-taller/${id}/rechazar`,
      { motivo_rechazo },
    );
  }

  // ── CU-24: Gestión de usuarios ────────────────────────────────────────────

  getUsuarios(params?: { rol?: string; activo?: boolean }) {
    const query: Record<string, string> = {};
    if (params?.rol)    query['rol']    = params.rol;
    if (params?.activo !== undefined) query['activo'] = String(params.activo);
    return this.http.get<Usuario[]>(`${this.api}/admin/usuarios`, { params: query });
  }

  activarUsuario(id: string) {
    return this.http.patch<Usuario>(`${this.api}/admin/usuarios/${id}/activar`, {});
  }

  desactivarUsuario(id: string) {
    return this.http.patch<Usuario>(`${this.api}/admin/usuarios/${id}/desactivar`, {});
  }

  // ── CU-25: Métricas globales ──────────────────────────────────────────────

  getMetricasGlobales(fechaInicio?: string, fechaFin?: string) {
    const params: Record<string, string> = {};
    if (fechaInicio) params['fecha_inicio'] = fechaInicio;
    if (fechaFin)    params['fecha_fin']    = fechaFin;
    return this.http.get<MetricasGlobales>(`${this.api}/admin/metricas`, { params });
  }
}
