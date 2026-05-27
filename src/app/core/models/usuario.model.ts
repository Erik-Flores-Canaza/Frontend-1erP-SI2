export type RolNombre =
  | 'cliente'
  | 'admin_taller'
  | 'tecnico'
  | 'admin_tenant'
  | 'superadmin_plataforma';

export interface Rol {
  id: string;
  nombre: RolNombre;
}

export interface Usuario {
  id: string;
  rol_id: string;
  rol: Rol;
  tenant_id: string | null;
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
