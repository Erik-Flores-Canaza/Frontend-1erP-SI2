import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  Tecnico, TecnicoCreate, TecnicoUpdate,
  Turno, TurnoCreate,
} from '../models/tecnico.model';

@Injectable({ providedIn: 'root' })
export class TecnicoService {
  private http = inject(HttpClient);
  private api  = environment.apiUrl;

  // ── Técnicos ──────────────────────────────────────────────────────────────
  getTecnicos(tallerId: string) {
    return this.http.get<Tecnico[]>(`${this.api}/talleres/${tallerId}/tecnicos`);
  }

  createTecnico(body: TecnicoCreate) {
    return this.http.post<Tecnico>(`${this.api}/tecnicos`, body);
  }

  updateTecnico(tecnicoId: string, body: TecnicoUpdate) {
    return this.http.patch<Tecnico>(`${this.api}/tecnicos/${tecnicoId}`, body);
  }

  deleteTecnico(tecnicoId: string) {
    return this.http.delete<void>(`${this.api}/tecnicos/${tecnicoId}`);
  }

  solicitarUbicacion(tecnicoId: string) {
    return this.http.post<void>(`${this.api}/tecnicos/${tecnicoId}/solicitar-ubicacion`, {});
  }

  // ── Turnos ────────────────────────────────────────────────────────────────
  getTurnos(tecnicoId: string) {
    return this.http.get<Turno[]>(`${this.api}/tecnicos/${tecnicoId}/turnos`);
  }

  createTurno(tecnicoId: string, body: TurnoCreate) {
    return this.http.post<Turno>(`${this.api}/tecnicos/${tecnicoId}/turnos`, body);
  }
}
