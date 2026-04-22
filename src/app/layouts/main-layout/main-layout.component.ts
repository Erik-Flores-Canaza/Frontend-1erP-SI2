import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { interval, Subscription } from 'rxjs';
import { startWith } from 'rxjs/operators';
import { AuthService }         from '../../core/auth/auth.service';
import { TallerService }       from '../../core/services/taller.service';
import { NotificacionService } from '../../core/services/notificacion.service';

interface NavItem {
  label: string;
  icon:  string;
  route: string;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, MatTooltipModule],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css',
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  private auth      = inject(AuthService);
  private tallerSvc = inject(TallerService);
  private notifSvc  = inject(NotificacionService);

  collapsed    = signal(false);
  user         = this.auth.currentUser;
  taller       = this.tallerSvc.taller;
  tallerNombre = computed(() => this.taller()?.nombre ?? 'Mi Taller');
  noLeidas     = this.notifSvc.noLeidas;

  navItems: NavItem[] = [
    { label: 'Dashboard',          icon: 'dashboard',            route: '/dashboard' },
    { label: 'Solicitudes',        icon: 'inbox',                route: '/solicitudes' },
    { label: 'Órdenes activas',    icon: 'assignment_turned_in', route: '/ordenes' },
    { label: 'Mi Taller',          icon: 'store',                route: '/taller' },
    { label: 'Técnicos',           icon: 'engineering',          route: '/tecnicos' },
    { label: 'Turnos',             icon: 'calendar_month',       route: '/turnos' },
    { label: 'Historial',          icon: 'history',              route: '/historial' },
    { label: 'Métricas',           icon: 'bar_chart',            route: '/metricas' },
  ];

  private pollSub?: Subscription;

  ngOnInit(): void {
    if (!this.taller()) {
      this.tallerSvc.loadMyTaller().subscribe({ error: () => {} });
    }
    // Refresca el contador de notificaciones cada 30 s
    this.pollSub = interval(30_000)
      .pipe(startWith(0))
      .subscribe(() => this.notifSvc.refrescarContador());
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }

  toggleSidebar(): void {
    this.collapsed.update(v => !v);
  }

  logout(): void {
    this.auth.logout();
  }
}
