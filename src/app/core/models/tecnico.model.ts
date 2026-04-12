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

export interface Turno {
  id: string;
  tecnico_id: string;
  fecha_turno: string;   // ISO date YYYY-MM-DD
  hora_inicio: string;   // HH:mm:ss
  hora_fin: string;      // HH:mm:ss
  en_servicio: boolean;
}

export interface TurnoCreate {
  fecha_turno: string;
  hora_inicio: string;
  hora_fin: string;
}
