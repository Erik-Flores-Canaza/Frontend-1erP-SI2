import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError, EMPTY } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, TokenResponse } from '../models/auth.model';
import { Usuario } from '../models/usuario.model';

const ACCESS_KEY  = 'ev_access';
const REFRESH_KEY = 'ev_refresh';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http   = inject(HttpClient);
  private router = inject(Router);

  private _user = signal<Usuario | null>(null);
  readonly currentUser     = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);

  // ── Tokens ────────────────────────────────────────────────────────────────
  getAccessToken():  string | null { return localStorage.getItem(ACCESS_KEY); }
  getRefreshToken(): string | null { return localStorage.getItem(REFRESH_KEY); }
  hasToken():        boolean       { return !!this.getAccessToken(); }

  private saveTokens(t: TokenResponse): void {
    localStorage.setItem(ACCESS_KEY,  t.access_token);
    localStorage.setItem(REFRESH_KEY, t.refresh_token);
  }

  clearTokens(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  }

  // ── Auth actions ──────────────────────────────────────────────────────────
  login(body: LoginRequest) {
    return this.http
      .post<TokenResponse>(`${environment.apiUrl}/auth/login`, body)
      .pipe(tap(tokens => this.saveTokens(tokens)));
  }

  logout(): void {
    this.http.post(`${environment.apiUrl}/auth/logout`, {}).pipe(catchError(() => EMPTY)).subscribe();
    this.clearTokens();
    this._user.set(null);
    this.router.navigate(['/login']);
  }

  // ── User loading ──────────────────────────────────────────────────────────
  loadCurrentUser() {
    return this.http
      .get<Usuario>(`${environment.apiUrl}/usuarios/me`)
      .pipe(tap(user => this._user.set(user)));
  }

  setUser(user: Usuario): void {
    this._user.set(user);
  }
}
