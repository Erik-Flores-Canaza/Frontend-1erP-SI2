export type TipoServicio = 'bateria' | 'llanta' | 'motor' | 'choque' | 'otro';

export const TIPOS_SERVICIO: TipoServicio[] = [
  'bateria',
  'llanta',
  'motor',
  'choque',
  'otro',
];

export interface SlaConfig {
  id: string;
  tenant_id: string;
  tipo_servicio: TipoServicio;
  minutos_asignacion_objetivo: number;
  minutos_llegada_objetivo: number;
  minutos_resolucion_objetivo: number;
  creado_en: string;
  actualizado_en: string;
}

export interface SlaConfigUpsert {
  minutos_asignacion_objetivo: number;
  minutos_llegada_objetivo: number;
  minutos_resolucion_objetivo: number;
}

export interface KpiTallerEficiente {
  taller_id: string;
  nombre: string;
  incidentes_completados: number;
  tiempo_promedio_min: number;
}

export interface KpiZona {
  latitud: number;
  longitud: number;
  incidentes: number;
}

export interface KpiCumplimientoTipo {
  aplicables: number;
  cumplidos: number;
  porcentaje: number | null;
}

export interface KpisDashboard {
  filtro: { fecha_inicio: string | null; fecha_fin: string | null };
  totales: { incidentes: number; cotizaciones_aceptadas: number };
  tiempo_promedio_asignacion_min: number | null;
  tiempo_promedio_llegada_min: number | null;
  incidentes_por_tipo: Record<string, number>;
  talleres_mas_eficientes: KpiTallerEficiente[];
  zonas_con_mas_incidentes: KpiZona[];
  casos_cancelados: { cantidad: number; tasa_porcentaje: number };
  cumplimiento_sla: {
    aplicables: number;
    cumplidos: number;
    porcentaje: number | null;
    por_tipo: Record<string, KpiCumplimientoTipo>;
  };
}
