import { Component, inject, signal, computed, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService }          from '../../core/auth/auth.service';
import { TallerContextService } from '../../core/services/taller-context.service';
import { TecnicoService }       from '../../core/services/tecnico.service';
import { TallerService }        from '../../core/services/taller.service';
import { CotizacionService }    from '../../core/services/cotizacion.service';
import { SkeletonComponent }    from '../../shared/components/skeleton/skeleton.component';
import { Tecnico }              from '../../core/models/tecnico.model';
import { ServicioTaller }       from '../../core/models/taller.model';
import { IncidentePendienteParaCotizar } from '../../core/models/cotizacion.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, SkeletonComponent],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  private auth         = inject(AuthService);
  private tallerCtx    = inject(TallerContextService);
  private tallerSvc    = inject(TallerService);
  private tecnicoSvc   = inject(TecnicoService);
  private cotizSvc     = inject(CotizacionService);

  user      = this.auth.currentUser;
  taller    = this.tallerCtx.tallerActivo;
  sinTaller = this.tallerCtx.sinTalleres;
  loading   = signal(true);

  tecnicos     = signal<Tecnico[]>([]);
  servicios    = signal<ServicioTaller[]>([]);
  /** Incidentes en `buscando_taller` candidatos para cotizar (CU-34). */
  porCotizar   = signal<IncidentePendienteParaCotizar[]>([]);

  totalTecnicos         = computed(() => this.tecnicos().length);
  tecnicosDisponibles   = computed(() => this.tecnicos().filter(t => t.disponible).length);
  serviciosActivos      = computed(() => this.servicios().filter(s => s.disponible).length);
  cotizacionesPendientes = computed(() => this.porCotizar().filter(p => !p.cotizacion_propia_id).length);
  yaCotizadas            = computed(() => this.porCotizar().filter(p => !!p.cotizacion_propia_id).length);

  accesosRapidos = [
    { label: 'Cotizar',           icon: 'request_quote',        route: '/solicitudes', color: 'bg-accent/10 text-accent border-accent/20' },
    { label: 'Órdenes activas',   icon: 'assignment_turned_in', route: '/ordenes',     color: 'bg-accent-orange/10 text-accent-orange border-accent-orange/20' },
    { label: 'Técnicos',          icon: 'engineering',          route: '/tecnicos',    color: 'bg-success/10 text-success border-success/20' },
    { label: 'Mis Talleres',      icon: 'store',                route: '/talleres',    color: 'bg-app-elevated text-app-muted border-app-border' },
  ];

  constructor() {
    effect(() => {
      const t = this.tallerCtx.tallerActivo();
      if (t) {
        this.loading.set(true);
        untracked(() => this.loadData(t.id));
      } else if (this.tallerCtx.sinTalleres()) {
        this.loading.set(false);
      }
    });
  }

  private loadData(tallerId: string): void {
    let done = 0;
    const check = () => { if (++done === 3) this.loading.set(false); };

    this.tecnicoSvc.getTecnicos(tallerId).subscribe({
      next: t => { this.tecnicos.set(t); check(); },
      error: () => check(),
    });
    this.tallerSvc.getServicios(tallerId).subscribe({
      next: s => { this.servicios.set(s); check(); },
      error: () => check(),
    });
    this.cotizSvc.getPendientes(tallerId).subscribe({
      next: list => { this.porCotizar.set(list); check(); },
      error: () => check(),
    });
  }
}
