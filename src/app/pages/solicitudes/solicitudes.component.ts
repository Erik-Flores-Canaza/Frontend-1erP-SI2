import {
  Component, inject, signal, OnDestroy, effect, untracked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { interval, Subscription } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';

import { TallerContextService }  from '../../core/services/taller-context.service';
import { CotizacionService }     from '../../core/services/cotizacion.service';
import { ToastService }          from '../../core/services/toast.service';
import { WsNotificacionService } from '../../core/services/ws-notificacion.service';
import { tiempoDesdeBO } from '../../core/utils/fecha.utils';
import { SkeletonComponent }     from '../../shared/components/skeleton/skeleton.component';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../shared/components/confirm-dialog/confirm-dialog.component';

import {
  PRIORIDAD_META, CLASIFICACION_META, ClasificacionIA, PrioridadIncidente,
} from '../../core/models/incidente.model';
import { IncidentePendienteParaCotizar, CotizacionCreate } from '../../core/models/cotizacion.model';

// Poll cada 30s — los incidentes en buscando_taller cambian rápido (TTL 15 min)
const POLL_INTERVAL_MS = 30_000;

@Component({
  selector: 'app-solicitudes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatTooltipModule, SkeletonComponent],
  templateUrl: './solicitudes.component.html',
})
export class SolicitudesComponent implements OnDestroy {
  private tallerCtx    = inject(TallerContextService);
  private cotizSvc     = inject(CotizacionService);
  private toast        = inject(ToastService);
  private dialog       = inject(MatDialog);
  private sanitizer    = inject(DomSanitizer);
  private wsNotif      = inject(WsNotificacionService);
  private fb           = inject(FormBuilder);

  pendientes   = signal<IncidentePendienteParaCotizar[]>([]);
  loading      = signal(true);
  actualizando = signal(false);

  // Estado de UI por card: cuál tiene el form de cotización expandido y cuál está en acción
  expandedId   = signal<string | null>(null);
  enviando     = signal<string | null>(null); // incidente_id en proceso de envío
  retirando    = signal<string | null>(null); // cotizacion_id en proceso de retiro

  // Un form único reutilizable: se resetea al expandir/cerrar otra card
  form = this.fb.group({
    monto_estimado:        [null as number | null, [Validators.required, Validators.min(0.01), Validators.max(99999.99)]],
    tiempo_estimado_horas: [null as number | null, [Validators.min(0.01), Validators.max(999.99)]],
    observaciones:         ['', [Validators.maxLength(1000)]],
  });

  private pollSub?: Subscription;
  private wsSub?:  Subscription;
  private tallerId = '';

  readonly prioridadMeta     = PRIORIDAD_META;
  readonly clasificacionMeta = CLASIFICACION_META;

  constructor() {
    effect(() => {
      const t = this.tallerCtx.tallerActivo();
      if (t) {
        untracked(() => {
          this.tallerId = t.id;
          this.pollSub?.unsubscribe();
          this.loading.set(true);
          this.pendientes.set([]);
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
    this.pollSub = interval(POLL_INTERVAL_MS)
      .pipe(
        startWith(0),
        switchMap(() => {
          if (!this.loading()) this.actualizando.set(true);
          return this.cotizSvc.getPendientes(this.tallerId);
        }),
      )
      .subscribe({
        next: lista => {
          this.pendientes.set(lista);
          this.loading.set(false);
          this.actualizando.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.actualizando.set(false);
        },
      });

    // Refresh inmediato cuando llega un nuevo incidente para cotizar
    this.wsSub = this.wsNotif.mensajes$.subscribe(msg => {
      if (msg.evento === 'nueva_solicitud' || msg.evento === 'solicitud_cotizacion') {
        this.refrescar();
      }
    });
  }

  refrescar(): void {
    this.actualizando.set(true);
    this.cotizSvc.getPendientes(this.tallerId).subscribe({
      next: lista => { this.pendientes.set(lista); this.actualizando.set(false); },
      error: ()    => this.actualizando.set(false),
    });
  }

  // ── UI de expand/collapse del form de cotización ─────────────────────────
  toggleExpand(incidenteId: string): void {
    const cur = this.expandedId();
    if (cur === incidenteId) {
      this.expandedId.set(null);
    } else {
      this.expandedId.set(incidenteId);
      this.form.reset({ monto_estimado: null, tiempo_estimado_horas: null, observaciones: '' });
    }
  }

  // ── Enviar cotización ─────────────────────────────────────────────────────
  enviarCotizacion(inc: IncidentePendienteParaCotizar): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.value;
    const body: CotizacionCreate = {
      monto_estimado:        Number(v.monto_estimado),
      tiempo_estimado_horas: v.tiempo_estimado_horas != null ? Number(v.tiempo_estimado_horas) : undefined,
      observaciones:         v.observaciones?.trim() || undefined,
    };
    this.enviando.set(inc.id);
    this.cotizSvc.crearCotizacion(inc.id, this.tallerId, body).subscribe({
      next: cot => {
        this.toast.success('Cotización enviada. El cliente la verá entre las opciones.');
        // Marcar la cotización como propia (sin recargar todo)
        this.pendientes.update(list =>
          list.map(x => x.id === inc.id ? { ...x, cotizacion_propia_id: cot.id } : x),
        );
        this.expandedId.set(null);
        this.enviando.set(null);
      },
      error: e => {
        this.toast.error(e?.error?.detail ?? 'No se pudo enviar la cotización.');
        this.enviando.set(null);
      },
    });
  }

  // ── Retirar cotización propia ────────────────────────────────────────────
  retirarCotizacion(inc: IncidentePendienteParaCotizar): void {
    const cotizId = inc.cotizacion_propia_id;
    if (!cotizId) return;

    const ref = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
      ConfirmDialogComponent,
      {
        data: {
          titulo:  'Retirar cotización',
          mensaje: 'El cliente ya no verá tu cotización entre las opciones. ¿Confirmas?',
          accion:  'Retirar',
          peligro: true,
        },
      },
    );

    ref.afterClosed().subscribe(ok => {
      if (!ok) return;
      this.retirando.set(cotizId);
      this.cotizSvc.retirarCotizacion(cotizId).subscribe({
        next: () => {
          this.toast.info('Cotización retirada.');
          this.pendientes.update(list =>
            list.map(x => x.id === inc.id ? { ...x, cotizacion_propia_id: null } : x),
          );
          this.retirando.set(null);
        },
        error: e => {
          this.toast.error(e?.error?.detail ?? 'No se pudo retirar la cotización.');
          this.retirando.set(null);
        },
      });
    });
  }

  // ── Helpers UI ────────────────────────────────────────────────────────────

  prioridadCss(p: PrioridadIncidente | null): string {
    return p ? this.prioridadMeta[p].css : 'badge-neutral';
  }
  prioridadLabel(p: PrioridadIncidente | null): string {
    return p ? this.prioridadMeta[p].label : '—';
  }
  clasifIcon(c: ClasificacionIA | null): string | null {
    return c ? this.clasificacionMeta[c].icon : null;
  }
  clasifLabel(c: ClasificacionIA | null): string {
    return c ? this.clasificacionMeta[c].label : 'Sin clasificar';
  }

  /** URL segura para iframe de OpenStreetMap */
  mapUrl(lat: number, lon: number): SafeResourceUrl {
    const url = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.003},${lat - 0.003},${lon + 0.003},${lat + 0.003}&layer=mapnik&marker=${lat},${lon}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  googleMapsUrl(lat: number, lon: number): string {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
  }

  tiempoDesde(iso: string): string { return tiempoDesdeBO(iso); }
}
