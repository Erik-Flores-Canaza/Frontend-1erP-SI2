import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TallerService }    from '../../core/services/taller.service';
import { SolicitudService } from '../../core/services/solicitud.service';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import {
  Incidente,
  ESTADO_META, CLASIFICACION_META, PRIORIDAD_META,
} from '../../core/models/incidente.model';

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [CommonModule, SkeletonComponent],
  templateUrl: './historial.component.html',
})
export class HistorialComponent implements OnInit {
  private tallerSvc    = inject(TallerService);
  private solicitudSvc = inject(SolicitudService);

  historial   = signal<Incidente[]>([]);
  loading     = signal(true);
  tallerId    = '';
  expandedId  = signal<string | null>(null);

  readonly estadoMeta        = ESTADO_META;
  readonly clasificacionMeta = CLASIFICACION_META;
  readonly prioridadMeta     = PRIORIDAD_META;

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

  countEstado(estado: string): number {
    return this.historial().filter(i => i.estado === estado).length;
  }

  tasaExito(): string {
    const total = this.historial().length;
    if (total === 0) return '0';
    return ((this.countEstado('atendido') / total) * 100).toFixed(0);
  }

  tiempoDesde(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const min  = Math.floor(diff / 60_000);
    if (min < 1)  return 'hace un momento';
    if (min < 60) return `hace ${min} min`;
    const h = Math.floor(min / 60);
    if (h  < 24)  return `hace ${h}h`;
    const d = Math.floor(h / 24);
    if (d  < 30)  return `hace ${d}d`;
    return new Date(iso).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
