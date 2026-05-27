export type TenantPlan = 'basico' | 'pro' | 'enterprise' | string;

export interface Tenant {
  id: string;
  nombre: string;
  slug: string;
  correo_contacto: string | null;
  telefono_contacto: string | null;
  plan: TenantPlan;
  activo: boolean;
  creado_en: string;
}

/** POST /plataforma/tenants — crear tenant sin admin */
export interface TenantCreate {
  nombre: string;
  slug: string;
  correo_contacto?: string | null;
  telefono_contacto?: string | null;
  plan?: TenantPlan;
}

/** PATCH /plataforma/tenants/{id} */
export interface TenantUpdate {
  nombre?: string;
  correo_contacto?: string | null;
  telefono_contacto?: string | null;
  plan?: TenantPlan;
}

/** POST /plataforma/tenants/con-admin — crea tenant + primer admin en 1 paso */
export interface TenantCreateConAdmin extends TenantCreate {
  admin_nombre_completo: string;
  admin_correo: string;
  admin_contrasena: string;
  admin_telefono?: string | null;
}

/** Respuesta de POST /plataforma/tenants/con-admin y de aprobar solicitud */
export interface TenantCreateResponse {
  tenant: Tenant;
  admin_correo: string;
  contrasena_temporal?: string | null;
}
