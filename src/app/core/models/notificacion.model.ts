export interface Notificacion {
  id: string;
  usuario_id: string;
  incidente_id: string | null;
  tipo: 'push' | 'in_app';
  titulo: string;
  cuerpo: string | null;
  leida: boolean;
  leida_en: string | null;
  enviada_en: string;
}
