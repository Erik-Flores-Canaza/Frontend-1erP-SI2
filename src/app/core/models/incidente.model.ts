export type EstadoIncidente   = 'pendiente' | 'en_proceso' | 'atendido' | 'cancelado';
export type PrioridadIncidente = 'baja' | 'media' | 'alta' | 'incierto';
export type ClasificacionIA   = 'bateria' | 'llanta' | 'choque' | 'motor' | 'otro';

export interface TallerResumen {
  id: string;
  nombre: string;
  direccion: string | null;
  latitud: number | null;
  longitud: number | null;
}

export interface TecnicoResumen {
  id: string;
  nombre_completo: string;
  telefono: string | null;
  latitud_actual: number | null;
  longitud_actual: number | null;
}

export interface AsignacionResumen {
  id: string;
  taller_id: string;
  tecnico_id: string | null;
  accion_taller: 'aceptado' | 'rechazado' | null;
  eta_minutos: number | null;
  asignado_en: string;
  completado_en: string | null;
  taller: TallerResumen | null;
  tecnico: TecnicoResumen | null;
}

export interface EvidenciaResumen {
  id: string;
  tipo: 'imagen' | 'audio';
  archivo_url: string | null;
}

export interface Incidente {
  id: string;
  cliente_id: string;
  vehiculo_id: string | null;
  descripcion: string | null;
  latitud: number | null;
  longitud: number | null;
  estado: EstadoIncidente;
  prioridad: PrioridadIncidente;
  clasificacion_ia: ClasificacionIA | null;
  confianza_ia: number | null;
  resumen_ia: string | null;
  creado_en: string;
  actualizado_en: string;
  asignaciones: AsignacionResumen[];
  asignacion: AsignacionResumen | null;  // campo computado del backend (no rechazada más reciente)
  evidencias: EvidenciaResumen[];
}

export interface Asignacion {
  id: string;
  incidente_id: string;
  taller_id: string;
  tecnico_id: string | null;
  accion_taller: 'aceptado' | 'rechazado' | null;
  taller_respondio_en: string | null;
  eta_minutos: number | null;
  asignado_en: string;
  completado_en: string | null;
}

export interface ResponderAsignacionBody {
  accion_taller: 'aceptado' | 'rechazado';
  eta_minutos?: number;
}

export interface AsignarTecnicoBody {
  tecnico_id: string;
}

/** Metadatos de UI para el badge de prioridad */
export const PRIORIDAD_META: Record<PrioridadIncidente, { label: string; css: string }> = {
  alta:     { label: 'Alta',     css: 'badge-danger' },
  media:    { label: 'Media',    css: 'badge-warning' },
  baja:     { label: 'Baja',    css: 'badge-success' },
  incierto: { label: 'Incierto', css: 'badge-neutral' },
};

export const ESTADO_META: Record<EstadoIncidente, { label: string; css: string; icon: string }> = {
  pendiente:  { label: 'Pendiente',   css: 'badge-warning', icon: 'schedule' },
  en_proceso: { label: 'En proceso',  css: 'badge-neutral', icon: 'directions_car' },
  atendido:   { label: 'Atendido',    css: 'badge-success', icon: 'check_circle' },
  cancelado:  { label: 'Cancelado',   css: 'badge-danger',  icon: 'cancel' },
};

export const CLASIFICACION_META: Record<ClasificacionIA, { label: string; icon: string }> = {
  bateria: { label: 'Batería',  icon: 'battery_alert' },
  llanta:  { label: 'Llanta',   icon: 'tire_repair' },
  choque:  { label: 'Choque',   icon: 'car_crash' },
  motor:   { label: 'Motor',    icon: 'settings' },
  otro:    { label: 'Otro',     icon: 'build' },
};
