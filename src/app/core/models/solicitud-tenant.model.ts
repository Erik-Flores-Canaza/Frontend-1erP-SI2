/** POST /solicitudes-tenant (público, CU-29) */
export interface SolicitudTenantCreate {
  solicitante_nombre: string;
  solicitante_correo: string;
  solicitante_telefono?: string | null;
  nombre_red: string;
  descripcion?: string | null;
}

export type SolicitudTenantEstado = 'pendiente' | 'aprobado' | 'rechazado';

export interface SolicitudTenant {
  id: string;
  solicitante_nombre: string;
  solicitante_correo: string;
  solicitante_telefono: string | null;
  nombre_red: string;
  descripcion: string | null;
  estado: SolicitudTenantEstado;
  motivo_rechazo: string | null;
  revisado_por: string | null;
  revisado_en: string | null;
  creado_en: string;
}
