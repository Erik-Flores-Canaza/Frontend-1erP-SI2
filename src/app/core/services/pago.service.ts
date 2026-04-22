import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  ConfirmarPagoRequest,
  CrearIntentRequest,
  CrearIntentResponse,
  Pago,
} from '../models/pago.model';

@Injectable({ providedIn: 'root' })
export class PagoService {
  private http = inject(HttpClient);
  private api  = environment.apiUrl;

  /** CU-07 — Paso 1: crea PaymentIntent en Stripe */
  crearIntent(body: CrearIntentRequest) {
    return this.http.post<CrearIntentResponse>(`${this.api}/pagos/crear-intent`, body);
  }

  /** CU-07 — Paso 2: confirma el pago una vez Stripe lo procesa */
  confirmarPago(body: ConfirmarPagoRequest) {
    return this.http.post<Pago>(`${this.api}/pagos/confirmar`, body);
  }

  /** Consulta el pago registrado para un incidente */
  getPago(incidenteId: string) {
    return this.http.get<Pago>(`${this.api}/pagos/${incidenteId}`);
  }
}
