import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule }  from '@angular/forms';

import { TallerService }    from '../../core/services/taller.service';
import { SolicitudService } from '../../core/services/solicitud.service';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { HistorialItem }    from '../../core/models/historial.model';
import {
  CLASIFICACION_META, PRIORIDAD_META, ClasificacionIA,
} from '../../core/models/incidente.model';

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonComponent],
  templateUrl: './historial.component.html',
})
export class HistorialComponent implements OnInit {
  private tallerSvc    = inject(TallerService);
  private solicitudSvc = inject(SolicitudService);

  historial   = signal<HistorialItem[]>([]);
  loading     = signal(true);
  tallerId    = '';
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

  ngOnInit(): void {
    const t = this.tallerSvc.taller();
    if (t) {
      this.tallerId = t.id;
      this.cargar();
    } else {
      this.tallerSvc.loadMyTaller().subscribe({
        next:     taller => { this.tallerId = taller.id; this.cargar(); },
        error:    () => this.loading.set(false),
        complete: () => { if (!this.tallerId) this.loading.set(false); },
      });
    }
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
    return new Date(iso).toLocaleDateString('es', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }
}
