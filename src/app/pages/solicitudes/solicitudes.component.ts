import {
  Component, inject, signal, computed, OnDestroy, effect, untracked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { interval, Subscription } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';

import { TallerContextService }  from '../../core/services/taller-context.service';
import { TallerService }         from '../../core/services/taller.service';
import { SolicitudService }      from '../../core/services/solicitud.service';
import { ToastService }          from '../../core/services/toast.service';
import { WsNotificacionService } from '../../core/services/ws-notificacion.service';
import { tiempoDesdeBO } from '../../core/utils/fecha.utils';
import { SkeletonComponent }     from '../../shared/components/skeleton/skeleton.component';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../shared/components/confirm-dialog/confirm-dialog.component';

import {
  Incidente, AsignacionResumen,
  PRIORIDAD_META, CLASIFICACION_META,
} from '../../core/models/incidente.model';

// Poll de seguridad cada 5 min — el WS se encarga de los refreshes inmediatos
const POLL_INTERVAL_MS = 5 * 60_000;

@Component({
  selector: 'app-solicitudes',
  standalone: true,
  imports: [CommonModule, FormsModule, MatTooltipModule, SkeletonComponent],
  templateUrl: './solicitudes.component.html',
})
export class SolicitudesComponent implements OnDestroy {
  private tallerCtx    = inject(TallerContextService);
  private tallerSvc    = inject(TallerService);
  private solicitudSvc = inject(SolicitudService);
  private toast        = inject(ToastService);
  private dialog       = inject(MatDialog);
  private sanitizer    = inject(DomSanitizer);
  private wsNotif      = inject(WsNotificacionService);

  solicitudes  = signal<Incidente[]>([]);
  loading      = signal(true);
  actualizando = signal(false);
  accionando   = signal<string | null>(null); // id de la asignación en proceso

  private pollSub?: Subscription;
  private wsSub?:  Subscription;
  private tallerId = '';

  // Exponer metadatos para el template
  readonly prioridadMeta    = PRIORIDAD_META;
  readonly clasificacionMeta = CLASIFICACION_META;

  constructor() {
    effect(() => {
      const t = this.tallerCtx.tallerActivo();
      if (t) {
        untracked(() => {
          this.tallerId = t.id;
          // Reiniciar poll para la nueva sucursal
          this.pollSub?.unsubscribe();
          this.loading.set(true);
          this.solicitudes.set([]);
          this.startPolling();
        });
      } else if (this.tallerCtx.sinTalleres()) {
        this.loading.set(false);
      }
    });
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
    this.wsSub?.unsubscribe();
  }

  private startPolling(): void {
    // Carga inicial + poll de seguridad cada 5 min
    this.pollSub = interval(POLL_INTERVAL_MS)
      .pipe(
        startWith(0),
        switchMap(() => {
          if (!this.loading()) this.actualizando.set(true);
          return this.solicitudSvc.getSolicitudes(this.tallerId);
        }),
      )
      .subscribe({
        next: lista => {
          this.solicitudes.set(lista);
          this.loading.set(false);
          this.actualizando.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.actualizando.set(false);
        },
      });

    // Refresh inmediato cuando llega una nueva solicitud por WS
    this.wsSub = this.wsNotif.mensajes$.subscribe(msg => {
      if (msg.evento === 'nueva_solicitud') {
        this.refrescar();
      }
    });
  }

  /** Obtiene la asignación pendiente (sin respuesta) del incidente */
  asignacionPendiente(inc: Incidente): AsignacionResumen | undefined {
    return inc.asignaciones.find(a => a.accion_taller === null);
  }

  aceptar(inc: Incidente): void {
    const asig = this.asignacionPendiente(inc);
    if (!asig) return;

    const ref = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
      ConfirmDialogComponent,
      {
        data: {
          titulo:  'Aceptar solicitud',
          mensaje: `¿Confirmas que tu taller atenderá esta emergencia? Se notificará al cliente.`,
          accion:  'Aceptar',
        },
      },
    );

    ref.afterClosed().subscribe(ok => {
      if (!ok) return;
      this.accionando.set(asig.id);
      this.solicitudSvc.responderAsignacion(asig.id, { accion_taller: 'aceptado' }).subscribe({
        next: () => {
          this.toast.success('Solicitud aceptada. El cliente fue notificado.');
          this.accionando.set(null);
          this.refrescar();
        },
        error: () => {
          this.toast.error('No se pudo procesar la acción. Intenta de nuevo.');
          this.accionando.set(null);
        },
      });
    });
  }

  rechazar(inc: Incidente): void {
    const asig = this.asignacionPendiente(inc);
    if (!asig) return;

    const ref = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
      ConfirmDialogComponent,
      {
        data: {
          titulo:  'Rechazar solicitud',
          mensaje: `El sistema asignará automáticamente al siguiente taller disponible. ¿Confirmas el rechazo?`,
          accion:  'Rechazar',
          peligro: true,
        },
      },
    );

    ref.afterClosed().subscribe(ok => {
      if (!ok) return;
      this.accionando.set(asig.id);
      this.solicitudSvc.responderAsignacion(asig.id, { accion_taller: 'rechazado' }).subscribe({
        next: () => {
          this.toast.info('Solicitud rechazada. El sistema buscará otro taller.');
          this.accionando.set(null);
          this.refrescar();
        },
        error: () => {
          this.toast.error('No se pudo procesar la acción. Intenta de nuevo.');
          this.accionando.set(null);
        },
      });
    });
  }

  refrescar(): void {
    this.actualizando.set(true);
    this.solicitudSvc.getSolicitudes(this.tallerId).subscribe({
      next: lista => { this.solicitudes.set(lista); this.actualizando.set(false); },
      error: ()   => this.actualizando.set(false),
    });
  }

  /** URL segura para el iframe de OpenStreetMap */
  mapUrl(lat: number, lon: number): SafeResourceUrl {
    const url = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.003},${lat - 0.003},${lon + 0.003},${lat + 0.003}&layer=mapnik&marker=${lat},${lon}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  /** URL para abrir en Google Maps */
  googleMapsUrl(lat: number, lon: number): string {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
  }

  tiempoDesde(iso: string): string { return tiempoDesdeBO(iso); }
}
