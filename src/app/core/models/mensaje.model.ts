export interface Mensaje {
  id: string;
  incidente_id: string;
  remitente_id: string;
  rol_remitente: 'cliente' | 'taller' | 'tecnico';
  nombre_remitente: string;
  contenido: string;
  leido: boolean;
  creado_en: string;
}
