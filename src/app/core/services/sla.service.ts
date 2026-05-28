import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  KpisDashboard,
  SlaConfig,
  SlaConfigUpsert,
  TipoServicio,
} from '../models/sla.model';

@Injectable({ providedIn: 'root' })
export class SlaService {
  private http = inject(HttpClient);
  private api  = environment.apiUrl;

  listarSla() {
    return this.http.get<SlaConfig[]>(`${this.api}/admin/sla`);
  }

  upsertSla(tipo: TipoServicio, body: SlaConfigUpsert) {
    return this.http.put<SlaConfig>(`${this.api}/admin/sla/${tipo}`, body);
  }

  getKpis(fechaInicio?: string, fechaFin?: string) {
    const params: Record<string, string> = {};
    if (fechaInicio) params['fecha_inicio'] = fechaInicio;
    if (fechaFin)    params['fecha_fin']    = fechaFin;
    return this.http.get<KpisDashboard>(`${this.api}/admin/kpis`, { params });
  }
}
