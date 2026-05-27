import type { ClasificacionIA, PrioridadIncidente } from './incidente.model';

export type CotizacionEstado = 'enviada' | 'aceptada' | 'rechazada' | 'expirada';

/** GET /talleres/{id}/cotizaciones-pendientes — incidente que el taller puede cotizar */
export interface IncidentePendienteParaCotizar {
  id: string;
  descripcion: string | null;
  latitud: number | null;
  longitud: number | null;
  clasificacion_ia: ClasificacionIA | null;
  prioridad: PrioridadIncidente | null;
  resumen_ia: string | null;
  creado_en: string;
  /** Si el taller ya envió una cotización para este incidente, es el id de esa cotización. */
  cotizacion_propia_id: string | null;
}

/** POST /incidentes/{id}/cotizaciones?taller_id=... — body */
export interface CotizacionCreate {
  monto_estimado: number;
  tiempo_estimado_horas?: number | null;
  observaciones?: string | null;
}

/** Respuesta del POST y representación general del recurso. */
export interface Cotizacion {
  id: string;
  incidente_id: string;
  taller_id: string;
  monto_estimado: number;
  tiempo_estimado_horas: number | null;
  observaciones: string | null;
  estado: CotizacionEstado;
  enviado_en: string;
  expira_en: string;
  respondido_en: string | null;
}
