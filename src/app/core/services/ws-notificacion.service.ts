import { Injectable, inject, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { NotificacionService } from './notificacion.service';
import { ToastService } from './toast.service';

export interface WsMensaje {
  titulo: string;
  cuerpo: string;
  incidente_id?: string;
  evento?: string;
}

@Injectable({ providedIn: 'root' })
export class WsNotificacionService implements OnDestroy {
  private auth    = inject(AuthService);
  private notifSvc = inject(NotificacionService);
  private toast   = inject(ToastService);

  private ws?: WebSocket;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private intentos = 0;
  private readonly MAX_INTENTOS = 5;

  private _mensajes$ = new Subject<WsMensaje>();
  /** Stream de mensajes WS recibidos. Útil para que componentes reaccionen a eventos específicos. */
  readonly mensajes$ = this._mensajes$.asObservable();

  /** Conectar al WebSocket de notificaciones. Llamar tras el login. */
  connect(): void {
    const token = this.auth.getAccessToken();
    if (!token || this.ws?.readyState === WebSocket.OPEN) return;

    const wsUrl = environment.apiUrl
      .replace('http://', 'ws://')
      .replace('https://', 'wss://');

    this.ws = new WebSocket(`${wsUrl}/ws/notificaciones?token=${token}`);

    this.ws.onopen = () => {
      this.intentos = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WsMensaje;
        // Los eventos de badge de chat son silenciosos: solo se emiten al stream
        if (data.evento !== 'nuevo_mensaje_chat') {
          // Incrementa badge de notificaciones
          this.notifSvc.incrementarNoLeidas();
          // Muestra toast
          this.toast.info(`${data.titulo}: ${data.cuerpo}`);
        }
        // Emite al stream para que los componentes suscritos reaccionen
        this._mensajes$.next(data);
      } catch {
        // mensaje no JSON — ignorar
      }
    };

    this.ws.onclose = () => {
      this._programarReconexion();
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  /** Desconectar (llamar en logout). */
  disconnect(): void {
    clearTimeout(this.reconnectTimer);
    this.intentos = this.MAX_INTENTOS; // evitar reconexión
    this.ws?.close();
    this.ws = undefined;
  }

  private _programarReconexion(): void {
    if (this.intentos >= this.MAX_INTENTOS) return;
    if (!this.auth.getAccessToken()) return;
    const delay = Math.min(1000 * 2 ** this.intentos, 30_000);
    this.intentos++;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
