import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { tap, catchError, EMPTY } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Taller, TallerCreate, TallerUpdate,
  ServicioTaller, ServicioTallerCreate,
} from '../models/taller.model';

@Injectable({ providedIn: 'root' })
export class TallerService {
  private http = inject(HttpClient);
  private api  = environment.apiUrl;

  private _taller     = signal<Taller | null>(null);
  private _sinTaller  = signal(false);   // true = admin autenticado pero sin taller creado

  readonly taller    = this._taller.asReadonly();
  readonly sinTaller = this._sinTaller.asReadonly();

  // ── Taller CRUD ───────────────────────────────────────────────────────────
  createTaller(body: TallerCreate) {
    return this.http
      .post<Taller>(`${this.api}/talleres`, body)
      .pipe(tap(t => { this._taller.set(t); this._sinTaller.set(false); }));
  }

  /** GET /talleres/mine — 404 significa que el admin aún no creó su taller */
  loadMyTaller() {
    return this.http
      .get<Taller>(`${this.api}/talleres/mine`)
      .pipe(
        tap(t => { this._taller.set(t); this._sinTaller.set(false); }),
        catchError((err: HttpErrorResponse) => {
          if (err.status === 404) {
            this._sinTaller.set(true);   // esperado: admin sin taller
            return EMPTY;
          }
          throw err;  // re-lanzar otros errores reales
        }),
      );
  }

  getTaller(id: string) {
    return this.http
      .get<Taller>(`${this.api}/talleres/${id}`)
      .pipe(tap(t => this._taller.set(t)));
  }

  updateTaller(id: string, body: TallerUpdate) {
    return this.http
      .patch<Taller>(`${this.api}/talleres/${id}`, body)
      .pipe(tap(t => this._taller.set(t)));
  }

  // ── Servicios del taller ──────────────────────────────────────────────────
  getServicios(tallerId: string) {
    return this.http.get<ServicioTaller[]>(`${this.api}/talleres/${tallerId}/servicios`);
  }

  addServicio(tallerId: string, body: ServicioTallerCreate) {
    return this.http.post<ServicioTaller>(`${this.api}/talleres/${tallerId}/servicios`, body);
  }
}
