import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { tap, catchError, EMPTY, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Taller, TallerCreate, TallerUpdate,
  ServicioTaller, ServicioTallerCreate,
} from '../models/taller.model';

@Injectable({ providedIn: 'root' })
export class TallerService {
  private http = inject(HttpClient);
  private api  = environment.apiUrl;

  /** Lista completa de sucursales del admin (CU-26) */
  private _talleres   = signal<Taller[]>([]);
  /**
   * Taller "activo/principal" — primer aprobado de la lista.
   * Mantenido para compatibilidad con componentes del Ciclo 1–3.
   */
  private _taller     = signal<Taller | null>(null);
  private _sinTaller  = signal(false);

  readonly talleres  = this._talleres.asReadonly();
  readonly taller    = this._taller.asReadonly();
  readonly sinTaller = this._sinTaller.asReadonly();

  // ── Taller CRUD ───────────────────────────────────────────────────────────

  createTaller(body: TallerCreate) {
    return this.http
      .post<Taller>(`${this.api}/talleres`, body)
      .pipe(tap(t => {
        this._talleres.update(list => [...list, t]);
        if (!this._taller()) this._taller.set(t);
        this._sinTaller.set(false);
      }));
  }

  /**
   * GET /talleres/mine — ahora retorna Taller[] (multi-sucursal CU-26).
   * Emite el primer taller aprobado para compatibilidad con Ciclo 1–3.
   */
  loadMyTaller() {
    return this.http
      .get<Taller[]>(`${this.api}/talleres/mine`)
      .pipe(
        tap(lista => {
          this._talleres.set(lista);
          const primero = lista.find(t => t.estado_aprobacion === 'aprobado' && t.activo)
            ?? lista[0] ?? null;
          this._taller.set(primero);
          this._sinTaller.set(lista.length === 0);
        }),
        map(lista =>
          lista.find(t => t.estado_aprobacion === 'aprobado' && t.activo)
          ?? lista[0] ?? null,
        ),
        catchError((err: HttpErrorResponse) => {
          if (err.status === 404) {
            this._sinTaller.set(true);
            return EMPTY;
          }
          throw err;
        }),
      );
  }

  getTaller(id: string) {
    return this.http
      .get<Taller>(`${this.api}/talleres/${id}`)
      .pipe(tap(t => {
        this._taller.set(t);
        this._talleres.update(list =>
          list.find(x => x.id === t.id) ? list.map(x => x.id === t.id ? t : x) : [...list, t],
        );
      }));
  }

  updateTaller(id: string, body: TallerUpdate) {
    return this.http
      .patch<Taller>(`${this.api}/talleres/${id}`, body)
      .pipe(tap(t => {
        this._talleres.update(list => list.map(x => x.id === t.id ? t : x));
        if (this._taller()?.id === t.id) this._taller.set(t);
      }));
  }

  deleteTaller(id: string) {
    return this.http
      .delete(`${this.api}/talleres/${id}`)
      .pipe(tap(() => {
        this._talleres.update(list =>
          list.map(t => t.id === id ? { ...t, activo: false, disponible: false } : t),
        );
        if (this._taller()?.id === id) {
          const next = this._talleres().find(t => t.activo) ?? null;
          this._taller.set(next);
        }
      }));
  }

  /** Sincroniza el taller activo desde el selector de sucursal (CU-26). */
  setActivo(t: Taller): void {
    this._taller.set(t);
  }

  activarTaller(id: string) {
    return this.http
      .patch<Taller>(`${this.api}/talleres/${id}/activar`, {})
      .pipe(tap(t => {
        this._talleres.update(list => list.map(x => x.id === t.id ? t : x));
        if (!this._taller()) this._taller.set(t);
      }));
  }

  // ── Servicios del taller ──────────────────────────────────────────────────

  getServicios(tallerId: string) {
    return this.http.get<ServicioTaller[]>(`${this.api}/talleres/${tallerId}/servicios`);
  }

  addServicio(tallerId: string, body: ServicioTallerCreate) {
    return this.http.post<ServicioTaller>(`${this.api}/talleres/${tallerId}/servicios`, body);
  }
}
