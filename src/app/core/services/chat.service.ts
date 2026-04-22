import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { Mensaje }     from '../models/mensaje.model';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  // ws:// ó wss:// según si el backend usa http ó https
  private wsBase = environment.apiUrl.replace(/^http/, 'ws');
  private api    = environment.apiUrl;

  private ws: WebSocket | null = null;
  private currentId: string | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private intentionalClose = false;

  /** Mensajes del chat activo (se vacían al cambiar de incidente) */
  readonly messages  = signal<Mensaje[]>([]);
  readonly connected = signal(false);
  readonly connecting = signal(false);

  // ── HTTP ─────────────────────────────────────────────────────────────────

  /** CU-08 — Historial HTTP de mensajes */
  getHistorial(incidenteId: string) {
    return this.http.get<Mensaje[]>(`${this.api}/mensajes/${incidenteId}`);
  }

  // ── WebSocket ─────────────────────────────────────────────────────────────

  /** Conecta al chat del incidente dado. Si ya está conectado al mismo, no hace nada. */
  connect(incidenteId: string): void {
    if (this.currentId === incidenteId && this.ws?.readyState === WebSocket.OPEN) return;

    this.intentionalClose = false;
    this.disconnect(true); // desconectar silenciosamente el anterior

    this.currentId = incidenteId;
    this.messages.set([]);

    // Cargar historial HTTP primero
    this.getHistorial(incidenteId).subscribe({
      next:  msgs => this.messages.set(msgs),
      error: ()   => {},
    });

    this._openWs(incidenteId);
  }

  private _openWs(incidenteId: string): void {
    const token = this.auth.getAccessToken();
    if (!token) return;

    this.connecting.set(true);
    const url = `${this.wsBase}/ws/chat/${incidenteId}?token=${token}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.connected.set(true);
      this.connecting.set(false);
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = ({ data }) => {
      try {
        const msg = JSON.parse(data) as Mensaje;
        this.messages.update(list => [...list, msg]);
        this._scrollToBottom();
      } catch { /* ignore bad frames */ }
    };

    this.ws.onclose = () => {
      this.connected.set(false);
      this.connecting.set(false);
      if (!this.intentionalClose) {
        this._scheduleReconnect(incidenteId);
      }
    };

    this.ws.onerror = () => {
      this.connecting.set(false);
    };
  }

  private _scheduleReconnect(incidenteId: string): void {
    if (this.reconnectAttempts >= 5) return;
    const delayMs = Math.min(1_000 * 2 ** this.reconnectAttempts, 30_000);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      if (this.currentId === incidenteId && !this.intentionalClose) {
        this._openWs(incidenteId);
      }
    }, delayMs);
  }

  /** Envía un mensaje de texto al servidor */
  send(contenido: string): void {
    if (!contenido.trim()) return;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ contenido: contenido.trim() }));
  }

  /** Cierra la conexión WebSocket activa */
  disconnect(silent = false): void {
    if (!silent) this.intentionalClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null; // prevent reconnect loop
      this.ws.close();
      this.ws = null;
    }
    if (!silent) {
      this.currentId = null;
      this.connected.set(false);
      this.connecting.set(false);
      this.messages.set([]);
      this.reconnectAttempts = 0;
    }
  }

  private _scrollToBottom(): void {
    setTimeout(() => {
      const el = document.getElementById('chat-messages-container');
      if (el) el.scrollTop = el.scrollHeight;
    }, 30);
  }
}
