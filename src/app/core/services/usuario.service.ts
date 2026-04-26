import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Usuario } from '../models/usuario.model';

export interface UsuarioUpdate {
  nombre_completo?: string;
  telefono?: string;
}

export interface CambiarContrasenaRequest {
  contrasena_actual: string;
  nueva_contrasena: string;
}

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private http = inject(HttpClient);
  private api  = environment.apiUrl;

  getMe() {
    return this.http.get<Usuario>(`${this.api}/usuarios/me`);
  }

  updateMe(body: UsuarioUpdate) {
    return this.http.patch<Usuario>(`${this.api}/usuarios/me`, body);
  }

  cambiarContrasena(body: CambiarContrasenaRequest) {
    return this.http.patch(`${this.api}/usuarios/me/contrasena`, body, {
      responseType: 'text',  // 204 no devuelve body
    });
  }
}
