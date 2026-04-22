import {
  Component, inject, signal, OnInit, OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
// @stripe/stripe-js — instalar con: npm install @stripe/stripe-js
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Stripe = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StripeCardElement = any;

import { TallerService }    from '../../core/services/taller.service';
import { TecnicoService }   from '../../core/services/tecnico.service';
import { SolicitudService } from '../../core/services/solicitud.service';
import { IncidenteService } from '../../core/services/incidente.service';
import { PagoService }      from '../../core/services/pago.service';
import { ChatService }      from '../../core/services/chat.service';
import { ToastService }     from '../../core/services/toast.service';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../shared/components/confirm-dialog/confirm-dialog.component';

import {
  Incidente, AsignacionResumen, EstadoIncidente,
  ESTADO_META, PRIORIDAD_META, CLASIFICACION_META,
} from '../../core/models/incidente.model';
import { CrearIntentResponse } from '../../core/models/pago.model';
import { environment } from '../../../environments/environment';
import { Tecnico } from '../../core/models/tecnico.model';

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
export class OrdenesComponent implements OnInit, OnDestroy {
  private tallerSvc    = inject(TallerService);
  private tecnicoSvc   = inject(TecnicoService);
  private solicitudSvc = inject(SolicitudService);
  private incidenteSvc = inject(IncidenteService);
  private pagoSvc      = inject(PagoService);
  readonly chatSvc     = inject(ChatService);
  private toast        = inject(ToastService);
  private dialog       = inject(MatDialog);

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

  // ── Modal: pago ───────────────────────────────────────────────────────────
  pagoModalAbierto = signal(false);
  ordenPago        = signal<Incidente | null>(null);
  pagoStep         = signal<'amount' | 'card'>('amount');
  intentData       = signal<CrearIntentResponse | null>(null);
  pagoProcessing   = signal(false);
  montoPago        = 0;   // input regular (no signal) para compatibilidad con ngModel

  private stripe: Stripe | null = null;
  private cardElement: StripeCardElement | null = null;
  private cardMounted = false;

  // ── Chat inline ───────────────────────────────────────────────────────────
  chatAbierto  = signal<string | null>(null);  // incidente_id con chat abierto
  chatInput    = '';

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

  ngOnInit(): void {
    const t = this.tallerSvc.taller();
    if (t) {
      this.tallerId = t.id;
      this.cargarDatos();
    } else {
      this.tallerSvc.loadMyTaller().subscribe({
        next:     taller => { this.tallerId = taller.id; this.cargarDatos(); },
        error:    () => this.loading.set(false),
        complete: () => { if (!this.tallerId) this.loading.set(false); },
      });
    }
  }

  ngOnDestroy(): void {
    this.chatSvc.disconnect();
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
      next: lista => { this.ordenes.set(lista); done?.(); },
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

  // ── Pago ──────────────────────────────────────────────────────────────────

  abrirModalPago(inc: Incidente): void {
    this.ordenPago.set(inc);
    this.montoPago = 0;
    this.pagoStep.set('amount');
    this.intentData.set(null);
    this.cardMounted = false;
    this.cardElement?.destroy();
    this.cardElement = null;
    this.pagoModalAbierto.set(true);
  }

  cerrarModalPago(): void {
    this.cardElement?.destroy();
    this.cardElement = null;
    this.cardMounted = false;
    this.pagoModalAbierto.set(false);
    this.ordenPago.set(null);
    this.intentData.set(null);
    this.pagoStep.set('amount');
    this.pagoProcessing.set(false);
  }

  crearIntent(): void {
    const inc = this.ordenPago();
    if (!inc || this.montoPago <= 0) {
      this.toast.error('Ingresa un monto mayor a 0.');
      return;
    }
    this.pagoProcessing.set(true);
    this.pagoSvc.crearIntent({ incidente_id: inc.id, monto: this.montoPago }).subscribe({
      next: async (data) => {
        this.intentData.set(data);
        this.pagoProcessing.set(false);
        this.pagoStep.set('card');

        // Cargar Stripe.js dinámicamente (requiere: npm install @stripe/stripe-js)
        // @ts-ignore
        const { loadStripe } = await import('@stripe/stripe-js');
        this.stripe = await loadStripe(data.publishable_key);
        if (!this.stripe) return;

        // Montar el CardElement después de que Angular renderice el div
        setTimeout(() => {
          const container = document.getElementById('stripe-card-element');
          if (!container || this.cardMounted || !this.stripe) return;
          const elements = this.stripe.elements();
          this.cardElement = elements.create('card', {
            style: {
              base: {
                color: '#e2e8f0',
                fontSize: '15px',
                fontFamily: '"Space Grotesk", sans-serif',
                '::placeholder': { color: '#6b7280' },
              },
              invalid: { color: '#f85149' },
            },
          });
          this.cardElement.mount(container);
          this.cardMounted = true;
        }, 80);
      },
      error: (err) => {
        this.toast.error(err?.error?.detail ?? 'Error al crear el intento de pago.');
        this.pagoProcessing.set(false);
      },
    });
  }

  async confirmarPago(): Promise<void> {
    if (!this.stripe || !this.cardElement) return;
    const intent = this.intentData();
    const inc    = this.ordenPago();
    if (!intent || !inc) return;

    this.pagoProcessing.set(true);
    const { error, paymentIntent } = await this.stripe.confirmCardPayment(
      intent.client_secret,
      { payment_method: { card: this.cardElement } },
    );

    if (error) {
      this.toast.error(error.message ?? 'Error al procesar el pago.');
      this.pagoProcessing.set(false);
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      this.pagoSvc.confirmarPago({
        incidente_id:       inc.id,
        payment_intent_id:  paymentIntent.id,
        metodo_pago:        'tarjeta',
      }).subscribe({
        next: () => {
          this.toast.success('¡Pago registrado correctamente!');
          this.cerrarModalPago();
          this.refrescar();
        },
        error: (err) => {
          this.toast.error(err?.error?.detail ?? 'Error al confirmar el pago en el servidor.');
          this.pagoProcessing.set(false);
        },
      });
    } else {
      this.toast.error('El pago no fue confirmado por Stripe.');
      this.pagoProcessing.set(false);
    }
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

  tiempoDesde(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const min  = Math.floor(diff / 60_000);
    if (min < 1)  return 'hace un momento';
    if (min < 60) return `hace ${min} min`;
    const h = Math.floor(min / 60);
    if (h  < 24)  return `hace ${h}h`;
    return `hace ${Math.floor(h / 24)}d`;
  }

  horaMsg(iso: string): string {
    return new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  }
}
