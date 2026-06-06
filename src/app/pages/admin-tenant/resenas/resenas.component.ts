import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalificacionService } from '../../../core/services/calificacion.service';
import { ToastService } from '../../../core/services/toast.service';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { CalificacionModeracion } from '../../../core/models/calificacion.model';

type Filtro = 'todas' | 'visibles' | 'ocultas';

@Component({
  selector: 'app-resenas',
  standalone: true,
  imports: [CommonModule, SkeletonComponent],
  templateUrl: './resenas.component.html',
})
export class ResenasComponent implements OnInit {
  private svc   = inject(CalificacionService);
  private toast = inject(ToastService);

  loading   = signal(true);
  resenas   = signal<CalificacionModeracion[]>([]);
  filtro    = signal<Filtro>('todas');
  moderando = signal<string | null>(null);

  visibles = computed(() => this.resenas().filter(r => !r.oculta));

  filtradas = computed(() => {
    const f = this.filtro();
    const list = this.resenas();
    if (f === 'visibles') return list.filter(r => !r.oculta);
    if (f === 'ocultas')  return list.filter(r => r.oculta);
    return list;
  });

  promedioVisible = computed(() => {
    const vis = this.visibles();
    if (vis.length === 0) return null;
    const suma = vis.reduce((acc, r) => acc + r.puntuacion, 0);
    return Math.round((suma / vis.length) * 100) / 100;
  });

  totalOcultas = computed(() => this.resenas().filter(r => r.oculta).length);

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.loading.set(true);
    this.svc.listarModeracion().subscribe({
      next: list => {
        this.resenas.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('No se pudieron cargar las reseñas');
        this.loading.set(false);
      },
    });
  }

  setFiltro(f: Filtro): void { this.filtro.set(f); }

  toggle(r: CalificacionModeracion): void {
    if (this.moderando()) return;
    this.moderando.set(r.id);
    const accion = r.oculta ? this.svc.mostrar(r.id) : this.svc.ocultar(r.id);
    accion.subscribe({
      next: () => {
        this.resenas.update(list =>
          list.map(x => (x.id === r.id ? { ...x, oculta: !x.oculta } : x)),
        );
        this.moderando.set(null);
        this.toast.success(r.oculta ? 'Reseña visible nuevamente' : 'Reseña ocultada');
      },
      error: () => {
        this.moderando.set(null);
        this.toast.error('No se pudo actualizar la reseña');
      },
    });
  }

  estrellas(n: number): number[] {
    return Array.from({ length: 5 }, (_, i) => (i < n ? 1 : 0));
  }
}
