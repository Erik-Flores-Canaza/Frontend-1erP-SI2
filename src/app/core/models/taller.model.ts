export type TipoServicio = 'electrico' | 'neumatico' | 'remolque' | 'mecanica' | 'otro';

export const TIPOS_SERVICIO: { valor: TipoServicio; etiqueta: string; icono: string }[] = [
  { valor: 'electrico',  etiqueta: 'Eléctrico',        icono: 'bolt' },
  { valor: 'neumatico',  etiqueta: 'Neumático',         icono: 'tire_repair' },
  { valor: 'remolque',   etiqueta: 'Remolque',          icono: 'local_shipping' },
  { valor: 'mecanica',   etiqueta: 'Mecánica general',  icono: 'build' },
  { valor: 'otro',       etiqueta: 'Otro',              icono: 'handyman' },
];

export interface Taller {
  id: string;
  administrador_id: string;
  nombre: string;
  direccion: string | null;
  latitud: number | null;
  longitud: number | null;
  porcentaje_comision: number;
  activo: boolean;
  disponible: boolean;
  creado_en: string;
}

export interface TallerCreate {
  nombre: string;
  direccion?: string;
  latitud?: number;
  longitud?: number;
}

export interface TallerUpdate {
  nombre?: string;
  direccion?: string;
  latitud?: number;
  longitud?: number;
  disponible?: boolean;
}

export interface ServicioTaller {
  id: string;
  taller_id: string;
  tipo_servicio: TipoServicio;
  disponible: boolean;
}

export interface ServicioTallerCreate {
  tipo_servicio: TipoServicio;
  disponible?: boolean;
}
