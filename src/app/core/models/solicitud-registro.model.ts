export interface SolicitudRegistroCreate {
  solicitante_nombre: string;
  solicitante_correo: string;
  solicitante_telefono?: string;
  nombre_taller: string;
  direccion?: string;
  latitud?: number;
  longitud?: number;
  descripcion?: string;
}

export interface SolicitudRegistro {
  id: string;
  solicitante_nombre: string;
  solicitante_correo: string;
  solicitante_telefono: string | null;
  nombre_taller: string;
  direccion: string | null;
  latitud: number | null;
  longitud: number | null;
  descripcion: string | null;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
  motivo_rechazo: string | null;
  revisado_por: string | null;
  revisado_en: string | null;
  creado_en: string;
}

export interface AprobacionResponse {
  mensaje: string;
  solicitud_id: string;
  usuario_id: string;
  taller_id: string;
  correo: string;
  contrasena_temporal: string;
  correo_enviado: boolean;
}

/** Respuesta de GET /admin/metricas */
export interface MetricasGlobales {
  filtro: { fecha_inicio: string | null; fecha_fin: string | null };
  incidentes: {
    totales: number;
    resueltos: number;
    tasa_resolucion: number | null;
    por_clasificacion_ia: Record<string, number>;
  };
  tiempo_resolucion_prom_min: number | null;
  pagos: {
    ingresos_totales: number;
    comisiones_totales: number;
    total_transacciones: number;
  };
  talleres: { totales: number; aprobados: number; activos: number };
  usuarios: { activos_total: number; por_rol: Record<string, number | undefined> };
}

/** Respuesta de GET /talleres/metricas (CU-27) */
export interface MetricasConsolidadas {
  total_sucursales: number;
  total_atenciones: number;
  ingresos_neto_total: number;
  tasa_aceptacion_global: number | null;
  por_sucursal: MetricasSucursal[];
}

export interface MetricasSucursal {
  taller_id: string;
  nombre: string;
  total_atenciones: number;
  tasa_aceptacion: number | null;
  ingresos_neto_total: number;
}
