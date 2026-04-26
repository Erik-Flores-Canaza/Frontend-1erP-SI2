import {
  Component, inject, signal, OnDestroy, effect, untracked,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';

import { TallerContextService } from '../../core/services/taller-context.service';
import { TecnicoService }   from '../../core/services/tecnico.service';
import { SolicitudService } from '../../core/services/solicitud.service';
import { IncidenteService } from '../../core/services/incidente.service';
import { PagoService }      from '../../core/services/pago.service';
import { ChatService }          from '../../core/services/chat.service';
import { ToastService }         from '../../core/services/toast.service';
import { WsNotificacionService } from '../../core/services/ws-notificacion.service';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../shared/components/confirm-dialog/confirm-dialog.component';

import {
  Incidente, AsignacionResumen, EstadoIncidente,
  ESTADO_META, PRIORIDAD_META, CLASIFICACION_META,
} from '../../core/models/incidente.model';
import { Pago } from '../../core/models/pago.model';
import { environment } from '../../../environments/environment';
import { Tecnico } from '../../core/models/tecnico.model';
import { horaBO, tiempoDesdeBO } from '../../core/utils/fecha.utils';

interface TecnicoConDistancia extends Tecnico {
  distKm: number | null;
  eta:    number | null;
}

@Component({
  selector: 'app-ordenes',
  standalone: true,
  imports: [CommonModule, FormsModule, MatTooltipModule, SkeletonComponent],
  templateUrl: './ordenes.component.html',
})
export class OrdenesComponent implements OnDestroy {
  private tallerCtx    = inject(TallerContextService);
  private tecnicoSvc   = inject(TecnicoService);
  private solicitudSvc = inject(SolicitudService);
  private incidenteSvc = inject(IncidenteService);
  private pagoSvc      = inject(PagoService);
  readonly chatSvc     = inject(ChatService);
  private toast        = inject(ToastService);
  private dialog       = inject(MatDialog);
  private wsNotif      = inject(WsNotificacionService);

  ordenes   = signal<Incidente[]>([]);
  tecnicos  = signal<Tecnico[]>([]);
  loading   = signal(true);
  accionando = signal<string | null>(null);

  // ── Modal: asignar técnico ────────────────────────────────────────────────
  modalAbierto      = signal(false);
  ordenSeleccionada = signal<Incidente | null>(null);
  asigSeleccionada  = signal<AsignacionResumen | null>(null);
  tecnicoElegido    = signal<string>('');
  asignandoTecnico  = signal(false);
  notificandoTecnico = signal<string | null>(null);

  // ── Estado de pago por incidente ─────────────────────────────────────────
  // El técnico fija el monto; el admin solo consulta el estado.
  pagos = signal<Record<string, Pago | null>>({});

  // ── Chat inline ───────────────────────────────────────────────────────────
  chatAbierto  = signal<string | null>(null);  // incidente_id con chat abierto
  chatInput    = '';
  /** Mensajes no leídos por incidente (se acumulan cuando el chat está cerrado). */
  noLeidos     = signal<Record<string, number>>({});

  noLeidosDe(incId: string): number {
    return this.noLeidos()[incId] ?? 0;
  }

  readonly apiBase           = environment.apiUrl.replace(/\/api$/, '');
  readonly estadoMeta        = ESTADO_META;
  readonly prioridadMeta     = PRIORIDAD_META;
  readonly clasificacionMeta = CLASIFICACION_META;

  readonly ESTADOS_AVANZAR: Record<EstadoIncidente, EstadoIncidente | null> = {
    pendiente:  'en_proceso',
    en_proceso: 'atendido',
    atendido:   null,
    cancelado:  null,
  };

  private tallerId = '';
  private wsSub?: Subscription;

  constructor() {
    effect(() => {
      const t = this.tallerCtx.tallerActivo();
      if (t) {
        this.loading.set(true);
        this.ordenes.set([]);
        this.pagos.set({});
        untracked(() => { this.tallerId = t.id; this.cargarDatos(); });
      } else if (this.tallerCtx.sinTalleres()) {
        this.loading.set(false);
      }
    });

    // Reaccionar a eventos WS: pago confirmado y nuevos mensajes de chat
    this.wsSub = this.wsNotif.mensajes$.subscribe(msg => {
      if (msg.evento === 'pago_confirmado' && msg.incidente_id) {
        const incId = msg.incidente_id;
        if (this.ordenes().some(o => o.id === incId)) {
          this.pagoSvc.getPago(incId).subscribe({
            next:  pago => this.pagos.update(m => ({ ...m, [incId]: pago })),
            error: ()   => {},
          });
        }
      }

      if (msg.evento === 'nuevo_mensaje_chat' && msg.incidente_id) {
        const incId = msg.incidente_id;
        // Solo incrementar badge si el chat de ese incidente no está abierto ahora mismo
        if (this.chatAbierto() !== incId) {
          this.noLeidos.update(m => ({ ...m, [incId]: (m[incId] ?? 0) + 1 }));
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.chatSvc.disconnect();
    this.wsSub?.unsubscribe();
  }

  private cargarDatos(): void {
    let done = 0;
    const check = () => { if (++done === 2) this.loading.set(false); };
    this.cargarOrdenes(check);
    this.tecnicoSvc.getTecnicos(this.tallerId).subscribe({
      next: t => { this.tecnicos.set(t); check(); },
      error: () => check(),
    });
  }

  private cargarOrdenes(done?: () => void): void {
    this.solicitudSvc.getOrdenes(this.tallerId).subscribe({
      next: lista => {
        this.ordenes.set(lista);
        this.cargarEstadosPago(lista);
        done?.();
      },
      error: () => done?.(),
    });
  }

  refrescar(): void {
    this.loading.set(true);
    this.cargarDatos();
  }

  // ── Modal: asignar técnico ────────────────────────────────────────────────

  abrirModalTecnico(inc: Incidente): void {
    const asig = this.asignacionAceptadaSinTecnico(inc);
    if (!asig) return;
    this.ordenSeleccionada.set(inc);
    this.asigSeleccionada.set(asig);
    this.tecnicoElegido.set('');
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
    this.ordenSeleccionada.set(null);
    this.asigSeleccionada.set(null);
    this.tecnicoElegido.set('');
    this.notificandoTecnico.set(null);
  }

  notificarUbicacion(tecnicoId: string): void {
    if (this.notificandoTecnico() === tecnicoId) return;
    this.notificandoTecnico.set(tecnicoId);
    this.tecnicoSvc.solicitarUbicacion(tecnicoId).subscribe({
      next: () => this.toast.success('Notificación enviada al técnico.'),
      error: () => {
        this.toast.error('No se pudo enviar la notificación.');
        this.notificandoTecnico.set(null);
      },
    });
  }

  confirmarAsignacion(): void {
    const asig = this.asigSeleccionada();
    if (!asig || !this.tecnicoElegido()) return;
    this.asignandoTecnico.set(true);
    this.solicitudSvc.asignarTecnico(asig.id, { tecnico_id: this.tecnicoElegido() }).subscribe({
      next: () => {
        this.toast.success('Técnico asignado. El cliente fue notificado.');
        this.asignandoTecnico.set(false);
        this.cerrarModal();
        this.refrescar();
      },
      error: (err) => {
        this.toast.error(err?.error?.detail ?? 'No se pudo asignar el técnico.');
        this.asignandoTecnico.set(false);
      },
    });
  }

  // ── Actualizar estado ─────────────────────────────────────────────────────

  avanzarEstado(inc: Incidente): void {
    const siguiente = this.ESTADOS_AVANZAR[inc.estado];
    if (!siguiente) return;
    const eMeta = this.estadoMeta[siguiente];
    const ref = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
      ConfirmDialogComponent,
      { data: {
          titulo:  `Cambiar estado a "${eMeta.label}"`,
          mensaje: `¿Confirmas el cambio de estado del incidente a "${eMeta.label}"?`,
          accion:  `Cambiar a ${eMeta.label}`,
        },
      },
    );
    ref.afterClosed().subscribe(ok => {
      if (!ok) return;
      this.accionando.set(inc.id);
      this.incidenteSvc.actualizarEstado(inc.id, siguiente).subscribe({
        next: updated => {
          this.ordenes.update(list => list.map(o => o.id === updated.id ? updated : o));
          this.toast.success(`Estado actualizado a "${eMeta.label}"`);
          this.accionando.set(null);
        },
        error: () => {
          this.toast.error('No se pudo actualizar el estado.');
          this.accionando.set(null);
        },
      });
    });
  }

  // ── Pago: solo lectura del estado (el técnico fija el monto) ─────────────

  /** Carga el estado de pago de las órdenes atendidas. */
  cargarEstadosPago(ordenes: Incidente[]): void {
    const atendidas = ordenes.filter(o => o.estado === 'atendido');
    atendidas.forEach(inc => {
      this.pagoSvc.getPago(inc.id).subscribe({
        next:  pago => this.pagos.update(m => ({ ...m, [inc.id]: pago })),
        error: ()   => this.pagos.update(m => ({ ...m, [inc.id]: null })),
      });
    });
  }

  pagoDeOrden(incId: string): Pago | null {
    return this.pagos()[incId] ?? null;
  }

  // ── Chat ──────────────────────────────────────────────────────────────────

  toggleChat(incidenteId: string): void {
    if (this.chatAbierto() === incidenteId) {
      this.chatSvc.disconnect();
      this.chatAbierto.set(null);
    } else {
      this.chatAbierto.set(incidenteId);
      this.chatSvc.connect(incidenteId);
      this.chatInput = '';
      // Limpiar badge al abrir el chat
      this.noLeidos.update(m => ({ ...m, [incidenteId]: 0 }));
    }
  }

  enviarMensaje(): void {
    if (!this.chatInput.trim()) return;
    this.chatSvc.send(this.chatInput);
    this.chatInput = '';
  }

  onChatKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.enviarMensaje();
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  asignacionAceptada(inc: Incidente): AsignacionResumen | undefined {
    return inc.asignaciones.find(a => a.accion_taller === 'aceptado');
  }

  asignacionAceptadaSinTecnico(inc: Incidente): AsignacionResumen | undefined {
    return inc.asignaciones.find(a => a.accion_taller === 'aceptado' && !a.tecnico_id);
  }

  tecnicosDisponibles(): TecnicoConDistancia[] {
    const inc  = this.ordenSeleccionada();
    const lat0 = inc?.latitud ?? null;
    const lon0 = inc?.longitud ?? null;
    return this.tecnicos()
      .filter(t => t.disponible)
      .map(t => {
        const distKm =
          lat0 !== null && lon0 !== null &&
          t.latitud_actual !== null && t.longitud_actual !== null
            ? this.haversineKm(lat0, lon0, t.latitud_actual, t.longitud_actual)
            : null;
        const eta = distKm !== null ? Math.max(5, Math.ceil(distKm / 0.5)) : null;
        return { ...t, distKm, eta };
      })
      .sort((a, b) => {
        // Primero los que están en turno ahora, luego por distancia
        if (a.disponible_ahora !== b.disponible_ahora) return a.disponible_ahora ? -1 : 1;
        if (a.distKm === null && b.distKm === null) return 0;
        if (a.distKm === null) return 1;
        if (b.distKm === null) return -1;
        return a.distKm - b.distKm;
      });
  }

  private haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  tecnicoNombre(tecnicoId: string): string {
    return this.tecnicos().find(t => t.id === tecnicoId)?.usuario.nombre_completo ?? '—';
  }

  tiempoDesde(iso: string): string { return tiempoDesdeBO(iso); }
  horaMsg(iso: string): string     { return horaBO(iso); }
}
