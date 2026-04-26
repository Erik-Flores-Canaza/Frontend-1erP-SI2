import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { SolicitudRegistroCreate, SolicitudRegistro } from '../models/solicitud-registro.model';

@Injectable({ providedIn: 'root' })
export class LandingService {
  private http = inject(HttpClient);
  private api  = environment.apiUrl;

  /** CU-22 — Enviar solicitud de registro de taller (público, sin JWT) */
  enviarSolicitud(body: SolicitudRegistroCreate) {
    return this.http.post<SolicitudRegistro>(`${this.api}/solicitudes-taller`, body);
  }
}
