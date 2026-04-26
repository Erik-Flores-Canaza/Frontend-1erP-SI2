/**
 * Utilidades de fecha para Bolivia (America/La_Paz, UTC-4, sin horario de verano).
 *
 * El backend devuelve datetimes sin designador de zona (naive UTC de SQLAlchemy).
 * JS interpreta esas cadenas como hora LOCAL del navegador si no tienen 'Z'.
 * `parseUTC` normaliza añadiendo 'Z' cuando falta, para forzar interpretación UTC.
 */

const TZ_BO = 'America/La_Paz';

/** Parsea un ISO string del backend asumiendo UTC cuando no trae designador de zona. */
function parseUTC(iso: string): Date {
  const normalizado = /[Zz]$|[+-]\d{2}:\d{2}$/.test(iso) ? iso : iso + 'Z';
  return new Date(normalizado);
}

/** Fecha + hora en zona horaria de Bolivia. Ej: "25 abr 2024, 10:30" */
export function fechaHoraBO(iso: string): string {
  return parseUTC(iso).toLocaleString('es', {
    timeZone: TZ_BO,
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/** Solo hora en zona horaria de Bolivia. Ej: "10:30" */
export function horaBO(iso: string): string {
  return parseUTC(iso).toLocaleTimeString('es', {
    timeZone: TZ_BO,
    hour: '2-digit', minute: '2-digit',
  });
}

/** Tiempo relativo legible. Ej: "hace 5 min", "hace 2h", "hace 3d" */
export function tiempoDesdeBO(iso: string): string {
  const diff = Date.now() - parseUTC(iso).getTime();
  const min  = Math.floor(diff / 60_000);
  if (min < 1)  return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h  < 24)  return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}
