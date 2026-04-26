export interface CrearIntentRequest {
  incidente_id: string;
  // El monto ya fue fijado por el técnico — no lo ingresa el admin ni el cliente
}

export interface CrearIntentResponse {
  client_secret: string;
  publishable_key: string;
  monto_total: number;
  comision: number;
  neto_taller: number;
}

export interface ConfirmarPagoRequest {
  incidente_id: string;
  payment_intent_id: string;
  metodo_pago: string;
}

export interface Pago {
  id: string;
  incidente_id: string;
  monto_total: number;
  comision_plataforma: number;
  neto_taller: number;
  estado: 'pendiente' | 'pagado' | 'reembolsado';
  metodo_pago: string | null;
  pagado_en: string | null;
  creado_en: string;
}
