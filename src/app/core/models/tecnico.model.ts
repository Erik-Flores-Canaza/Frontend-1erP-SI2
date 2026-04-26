export interface TecnicoUsuario {
  id: string;
  nombre_completo: string;
  correo: string;
  telefono: string | null;
}

export interface Tecnico {
  id: string;
  usuario_id: string;
  usuario: TecnicoUsuario;
  taller_id: string;
  latitud_actual: number | null;
  longitud_actual: number | null;
  disponible: boolean;
  disponible_ahora: boolean;   // tiene turno activo en este momento
}

export interface TecnicoCreate {
  nombre_completo: string;
  correo: string;
  contrasena: string;
  telefono?: string;
  taller_id: string;
}

export interface TecnicoUpdate {
  disponible?: boolean;
}

export const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export interface Turno {
  id: string;
  tecnico_id: string;
  dia_semana: number;     // 0=Lun … 6=Dom
  dia_nombre: string;
  hora_inicio: string;    // HH:mm:ss
  hora_fin: string;       // HH:mm:ss
}

export interface TurnoCreate {
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
}
