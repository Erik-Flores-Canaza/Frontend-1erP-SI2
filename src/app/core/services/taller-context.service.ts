import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Taller } from '../models/taller.model';
import { MetricasConsolidadas } from '../models/solicitud-registro.model';

/**
 * Servicio de contexto multi-sucursal para admin_taller.
 *
 * Mantiene la lista completa de talleres del admin autenticado
 * y cuál es el taller "activo" actualmente seleccionado.
 * Los componentes que necesitan el taller_id deben usar
 * tallerContextSvc.tallerActivo()?.id.
 */
@Injectable({ providedIn: 'root' })
export class TallerContextService {
  private http = inject(HttpClient);
  private api  = environment.apiUrl;

  private _talleres    = signal<Taller[]>([]);
  private _tallerActivo = signal<Taller | null>(null);

  /** Lista completa de sucursales del admin autenticado */
  readonly talleres     = this._talleres.asReadonly();

  /** Sucursal seleccionada actualmente */
  readonly tallerActivo = this._tallerActivo.asReadonly();

  /** true si el admin no tiene ningún taller registrado */
  readonly sinTalleres  = computed(() => this._talleres().length === 0);

  /** Carga/recarga la lista de talleres desde el backend */
  cargarTalleres() {
    return this.http.get<Taller[]>(`${this.api}/talleres/mine`).pipe(
      tap(lista => {
        this._talleres.set(lista);
        // Si el activo actual ya no existe en la nueva lista, resetear
        const activo = this._tallerActivo();
        if (!activo || !lista.find(t => t.id === activo.id)) {
          const primero = lista.find(t => t.estado_aprobacion === 'aprobado' && t.activo)
            ?? lista[0]
            ?? null;
          this._tallerActivo.set(primero);
        }
      }),
    );
  }

  /** Cambia la sucursal activa */
  setTallerActivo(taller: Taller): void {
    this._tallerActivo.set(taller);
  }

  /** GET /talleres/metricas — métricas consolidadas (CU-27) */
  getMetricasConsolidadas() {
    return this.http.get<MetricasConsolidadas>(`${this.api}/talleres/metricas`);
  }

  /** Actualiza la lista internamente (tras crear/editar/desactivar sucursal) */
  actualizarTaller(actualizado: Taller): void {
    this._talleres.update(list =>
      list.map(t => t.id === actualizado.id ? actualizado : t),
    );
    if (this._tallerActivo()?.id === actualizado.id) {
      this._tallerActivo.set(actualizado);
    }
  }

  agregarTaller(nuevo: Taller): void {
    this._talleres.update(list => [...list, nuevo]);
  }
}
