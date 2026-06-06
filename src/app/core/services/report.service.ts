import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/** CU-44 — descarga el reporte operacional del tenant en PDF / Excel / HTML. */
@Injectable({ providedIn: 'root' })
export class ReportService {
  private http = inject(HttpClient);
  private api  = environment.apiUrl;

  descargarAdmin(
    formato: 'pdf' | 'excel' | 'html',
    desde?: string,
    hasta?: string,
    secciones?: string[],
  ) {
    let params = new HttpParams().set('formato', formato);
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    if (secciones && secciones.length) {
      params = params.set('secciones', secciones.join(','));
    }
    return this.http.get(`${this.api}/reportes/admin`, {
      params,
      responseType: 'blob',
    });
  }
}
