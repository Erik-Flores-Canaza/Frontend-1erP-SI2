import type { ClasificacionIA, PrioridadIncidente } from './incidente.model';

export interface TecnicoEnHistorial {
  id: string;
  nombre_completo: string;
}

export interface HistorialItem {
  incidente_id: string;
  fecha: string;            // ISO datetime
  clasificacion_ia: ClasificacionIA | null;
  prioridad: PrioridadIncidente;
  tecnico: TecnicoEnHistorial | null;
  duracion_minutos: number | null;
  estado_final: string;
  pago_monto_neto: number | null;
  pago_estado: string | null;  // 'pagado' | null
}

export interface AtencionesPorTipo {
  clasificacion: string;
  total: number;
}

export interface AtencionesPorMes {
  anio: number;
  mes: number;
  total: number;
}

export interface IngresosPorMes {
  anio: number;
  mes: number;
  total: number;
}

export interface MetricasTaller {
  total_atenciones: number;
  tiempo_promedio_respuesta: number | null;
  tasa_aceptacion: number | null;
  atenciones_por_tipo: AtencionesPorTipo[];
  atenciones_por_mes: AtencionesPorMes[];
  ingresos_neto_total: number;
  servicios_cobrados: number;
  servicios_pendientes_cobro: number;
  ingresos_por_mes: IngresosPorMes[];
}
