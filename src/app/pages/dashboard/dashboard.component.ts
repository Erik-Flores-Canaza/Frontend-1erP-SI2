import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService }       from '../../core/auth/auth.service';
import { TallerService }     from '../../core/services/taller.service';
import { TecnicoService }    from '../../core/services/tecnico.service';
import { SolicitudService }  from '../../core/services/solicitud.service';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { Tecnico }           from '../../core/models/tecnico.model';
import { ServicioTaller }    from '../../core/models/taller.model';
import { Incidente }         from '../../core/models/incidente.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, SkeletonComponent],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private auth         = inject(AuthService);
  private tallerSvc    = inject(TallerService);
  private tecnicoSvc   = inject(TecnicoService);
  private solicitudSvc = inject(SolicitudService);

  user      = this.auth.currentUser;
  taller    = this.tallerSvc.taller;
  sinTaller = this.tallerSvc.sinTaller;
  loading   = signal(true);

  tecnicos     = signal<Tecnico[]>([]);
  servicios    = signal<ServicioTaller[]>([]);
  solicitudes  = signal<Incidente[]>([]);

  totalTecnicos        = computed(() => this.tecnicos().length);
  tecnicosDisponibles  = computed(() => this.tecnicos().filter(t => t.disponible).length);
  serviciosActivos     = computed(() => this.servicios().filter(s => s.disponible).length);
  solicitudesPendientes = computed(() => this.solicitudes().length);

  accesosRapidos = [
    { label: 'Solicitudes',       icon: 'inbox',                route: '/solicitudes', color: 'bg-accent/10 text-accent border-accent/20' },
    { label: 'Órdenes activas',   icon: 'assignment_turned_in', route: '/ordenes',     color: 'bg-accent-orange/10 text-accent-orange border-accent-orange/20' },
    { label: 'Técnicos',          icon: 'engineering',          route: '/tecnicos',    color: 'bg-success/10 text-success border-success/20' },
    { label: 'Mi Taller',         icon: 'store',                route: '/taller',      color: 'bg-app-elevated text-app-muted border-app-border' },
  ];

  ngOnInit(): void {
    const t = this.taller();
    if (t) {
      this.loadData(t.id);
    } else if (this.sinTaller()) {
      this.loading.set(false);
    } else {
      this.tallerSvc.loadMyTaller().subscribe({
        next:     taller => this.loadData(taller.id),
        error:    ()     => this.loading.set(false),
        complete: ()     => { if (this.sinTaller()) this.loading.set(false); },
      });
    }
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
    this.solicitudSvc.getSolicitudes(tallerId).subscribe({
      next: s => { this.solicitudes.set(s); check(); },
      error: () => check(),
    });
  }
}
