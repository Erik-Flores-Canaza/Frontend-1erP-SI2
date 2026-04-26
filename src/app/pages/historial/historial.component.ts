import { Component, inject, signal, computed, OnDestroy, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule }  from '@angular/forms';
import { Subscription } from 'rxjs';

import { TallerContextService }  from '../../core/services/taller-context.service';
import { SolicitudService }      from '../../core/services/solicitud.service';
import { WsNotificacionService } from '../../core/services/ws-notificacion.service';
import { SkeletonComponent }     from '../../shared/components/skeleton/skeleton.component';
import { HistorialItem }         from '../../core/models/historial.model';
import {
  CLASIFICACION_META, PRIORIDAD_META, ClasificacionIA,
} from '../../core/models/incidente.model';
import { fechaHoraBO } from '../../core/utils/fecha.utils';

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonComponent],
  templateUrl: './historial.component.html',
})
export class HistorialComponent implements OnDestroy {
  private tallerCtx    = inject(TallerContextService);
  private solicitudSvc = inject(SolicitudService);
  private wsNotif      = inject(WsNotificacionService);

  private wsSub?: Subscription;
  private tallerId = '';

  historial   = signal<HistorialItem[]>([]);
  loading     = signal(true);
  expandedId  = signal<string | null>(null);

  // Filtros — deben ser signals para que computed() los rastree
  filtroClasificacion = signal('');
  filtroDesde         = signal('');
  filtroHasta         = signal('');

  readonly clasificacionMeta = CLASIFICACION_META;
  readonly prioridadMeta     = PRIORIDAD_META;

  readonly clasificaciones: ClasificacionIA[] = ['bateria', 'llanta', 'choque', 'motor', 'otro'];

  historialFiltrado = computed(() => {
    let lista = this.historial();

    const clf = this.filtroClasificacion();
    if (clf) {
      lista = lista.filter(h => h.clasificacion_ia === clf);
    }

    const desde = this.filtroDesde();
    if (desde) {
      const t = new Date(desde).getTime();
      lista = lista.filter(h => new Date(h.fecha).getTime() >= t);
    }

    const hasta = this.filtroHasta();
    if (hasta) {
      const t = new Date(hasta).getTime() + 86_400_000; // incluye todo el día final
      lista = lista.filter(h => new Date(h.fecha).getTime() <= t);
    }

    return lista;
  });

  constructor() {
    effect(() => {
      const t = this.tallerCtx.tallerActivo();
      if (t) {
        this.loading.set(true);
        this.historial.set([]);
        untracked(() => { this.tallerId = t.id; this.cargar(); });
      } else if (this.tallerCtx.sinTalleres()) {
        this.loading.set(false);
      }
    });

    // Auto-refresh cuando el cliente paga desde la app móvil
    this.wsSub = this.wsNotif.mensajes$.subscribe(msg => {
      if (msg.evento === 'pago_confirmado') {
        this.cargar();
      }
    });
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
  }

  private cargar(): void {
    this.solicitudSvc.getHistorial(this.tallerId).subscribe({
      next:  lista => { this.historial.set(lista); this.loading.set(false); },
      error: ()    => this.loading.set(false),
    });
  }

  toggleDetalle(id: string): void {
    this.expandedId.update(cur => cur === id ? null : id);
  }

  limpiarFiltros(): void {
    this.filtroClasificacion.set('');
    this.filtroDesde.set('');
    this.filtroHasta.set('');
  }

  countEstado(estado: string): number {
    return this.historial().filter(h => h.estado_final === estado).length;
  }

  tasaExito(): string {
    const total = this.historial().length;
    if (total === 0) return '0';
    return ((this.countEstado('atendido') / total) * 100).toFixed(0);
  }

  formatDuracion(min: number | null): string {
    if (min === null) return '—';
    if (min < 60) return `${min} min`;
    return `${(min / 60).toFixed(1)} h`;
  }

  fechaCorta(iso: string): string {
    return fechaHoraBO(iso);
  }
}
