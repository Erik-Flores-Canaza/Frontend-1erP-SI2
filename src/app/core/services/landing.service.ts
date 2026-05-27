import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { SolicitudRegistroCreate, SolicitudRegistro } from '../models/solicitud-registro.model';
import {
  SolicitudTenant,
  SolicitudTenantCreate,
} from '../models/solicitud-tenant.model';

@Injectable({ providedIn: 'root' })
export class LandingService {
  private http = inject(HttpClient);
  private api  = environment.apiUrl;

  /** CU-22 — Enviar solicitud de registro de taller individual (público) */
  enviarSolicitud(body: SolicitudRegistroCreate) {
    return this.http.post<SolicitudRegistro>(`${this.api}/solicitudes-taller`, body);
  }

  /** CU-29 — Solicitar alta como tenant nuevo / red de talleres (público) */
  enviarSolicitudTenant(body: SolicitudTenantCreate) {
    return this.http.post<SolicitudTenant>(`${this.api}/solicitudes-tenant`, body);
  }
}
