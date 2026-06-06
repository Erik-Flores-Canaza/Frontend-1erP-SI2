/** Reseña con datos para el panel de moderación del admin_tenant (CU-43). */
export interface CalificacionModeracion {
  id: string;
  incidente_id: string;
  taller_id: string;
  taller_nombre: string;
  cliente_nombre: string;
  puntuacion: number;
  comentario: string | null;
  oculta: boolean;
  creado_en: string;
}
