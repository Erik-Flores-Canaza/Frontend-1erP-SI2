import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  Tenant,
  TenantCreate,
  TenantCreateConAdmin,
  TenantCreateResponse,
  TenantUpdate,
} from '../models/tenant.model';
import {
  SolicitudTenant,
  SolicitudTenantCreate,
  SolicitudTenantEstado,
} from '../models/solicitud-tenant.model';

/**
 * Servicio del panel `superadmin_plataforma`:
 *   - CU-28 — CRUD de tenants
 *   - CU-29 — Revisión de solicitudes de tenant (listar/aprobar/rechazar)
 *
 * Las llamadas públicas (POST /solicitudes-tenant desde la landing) viven en
 * `LandingService` para no acoplar el panel autenticado al endpoint público.
 */
@Injectable({ providedIn: 'root' })
export class PlataformaService {
  private http = inject(HttpClient);
  private api  = environment.apiUrl;

  // ── CU-28 — Tenants ──────────────────────────────────────────────────────

  listarTenants() {
    return this.http.get<Tenant[]>(`${this.api}/plataforma/tenants`);
  }

  obtenerTenant(id: string) {
    return this.http.get<Tenant>(`${this.api}/plataforma/tenants/${id}`);
  }

  crearTenant(body: TenantCreate) {
    return this.http.post<Tenant>(`${this.api}/plataforma/tenants`, body);
  }

  crearTenantConAdmin(body: TenantCreateConAdmin) {
    return this.http.post<TenantCreateResponse>(
      `${this.api}/plataforma/tenants/con-admin`,
      body,
    );
  }

  actualizarTenant(id: string, body: TenantUpdate) {
    return this.http.patch<Tenant>(`${this.api}/plataforma/tenants/${id}`, body);
  }

  activarTenant(id: string) {
    return this.http.patch<Tenant>(`${this.api}/plataforma/tenants/${id}/activar`, {});
  }

  desactivarTenant(id: string) {
    return this.http.patch<Tenant>(`${this.api}/plataforma/tenants/${id}/desactivar`, {});
  }

  // ── CU-29 — Solicitudes de tenant ────────────────────────────────────────

  listarSolicitudesTenant(estado?: SolicitudTenantEstado) {
    const params: Record<string, string> = {};
    if (estado) params['estado'] = estado;
    return this.http.get<SolicitudTenant[]>(
      `${this.api}/plataforma/solicitudes-tenant`,
      { params },
    );
  }

  aprobarSolicitudTenant(id: string) {
    return this.http.patch<TenantCreateResponse>(
      `${this.api}/plataforma/solicitudes-tenant/${id}/aprobar`,
      {},
    );
  }

  rechazarSolicitudTenant(id: string, motivo_rechazo: string) {
    return this.http.patch<SolicitudTenant>(
      `${this.api}/plataforma/solicitudes-tenant/${id}/rechazar`,
      { motivo_rechazo },
    );
  }

  /**
   * Wrapper para el endpoint público CU-29.
   * Útil si se quiere reusar desde un componente del panel; la landing usa
   * directamente LandingService para mantener la separación.
   */
  enviarSolicitudPublica(body: SolicitudTenantCreate) {
    return this.http.post<SolicitudTenant>(`${this.api}/solicitudes-tenant`, body);
  }
}
