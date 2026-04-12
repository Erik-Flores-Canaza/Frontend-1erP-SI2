export interface Rol {
  id: string;
  nombre: 'cliente' | 'admin_taller' | 'tecnico';
}

export interface Usuario {
  id: string;
  rol_id: string;
  rol: Rol;
  nombre_completo: string;
  correo: string;
  telefono: string | null;
  activo: boolean;
  creado_en: string;
}

export interface UsuarioUpdate {
  nombre_completo?: string;
  telefono?: string;
}
