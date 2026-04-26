import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { interval, Subscription } from 'rxjs';
import { startWith } from 'rxjs/operators';
import { AuthService }           from '../../core/auth/auth.service';
import { TallerService }         from '../../core/services/taller.service';
import { TallerContextService }  from '../../core/services/taller-context.service';
import { NotificacionService }   from '../../core/services/notificacion.service';
import { WsNotificacionService } from '../../core/services/ws-notificacion.service';
import { Taller } from '../../core/models/taller.model';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

interface NavItem { label: string; icon: string; route: string; }

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, MatTooltipModule],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css',
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  private auth        = inject(AuthService);
  readonly tallerSvc  = inject(TallerService);
  tallerCtx           = inject(TallerContextService);
  private notifSvc    = inject(NotificacionService);
  private wsNotif     = inject(WsNotificacionService);
  private dialog      = inject(MatDialog);

  collapsed       = signal(false);
  selectorAbierto = signal(false);
  user            = this.auth.currentUser;

  // Compatibilidad con Ciclo 1–3 (primer taller del contexto)
  taller       = this.tallerCtx.tallerActivo;
  tallerNombre = computed(() => this.taller()?.nombre ?? 'Mi Taller');
  talleres     = this.tallerCtx.talleres;
  noLeidas     = this.notifSvc.noLeidas;

  navItems: NavItem[] = [
    { label: 'Dashboard',       icon: 'dashboard',            route: '/dashboard' },
    { label: 'Solicitudes',     icon: 'inbox',                route: '/solicitudes' },
    { label: 'Órdenes activas', icon: 'assignment_turned_in', route: '/ordenes' },
    { label: 'Mis Talleres',    icon: 'store',                route: '/talleres' },
    { label: 'Técnicos',        icon: 'engineering',          route: '/tecnicos' },
    { label: 'Turnos',          icon: 'calendar_month',       route: '/turnos' },
    { label: 'Historial',       icon: 'history',              route: '/historial' },
    { label: 'Métricas',        icon: 'bar_chart',            route: '/metricas' },
    { label: 'Mi perfil',       icon: 'manage_accounts',      route: '/perfil' },
  ];

  private pollSub?: Subscription;

  ngOnInit(): void {
    // Carga la lista de talleres en el contexto y sincroniza TallerService
    this.tallerCtx.cargarTalleres().subscribe({
      next: lista => {
        // Sincronizar TallerService para compatibilidad Ciclo 1–3
        if (lista.length > 0) {
          this.tallerSvc.loadMyTaller().subscribe({ error: () => {} });
        }
      },
      error: () => {
        // Fallback: cargar como antes
        this.tallerSvc.loadMyTaller().subscribe({ error: () => {} });
      },
    });

    this.pollSub = interval(30_000)
      .pipe(startWith(0))
      .subscribe(() => this.notifSvc.refrescarContador());

    this.wsNotif.connect();
  }

  ngOnDestroy(): void { this.pollSub?.unsubscribe(); }

  toggleSidebar(): void { this.collapsed.update(v => !v); }
  toggleSelector(): void { this.selectorAbierto.update(v => !v); }

  seleccionarTaller(t: Taller): void {
    this.tallerCtx.setTallerActivo(t);
    this.tallerSvc.setActivo(t);   // sincroniza legacy TallerService
    this.selectorAbierto.set(false);
  }

  logout(): void {
    const ref = this.dialog.open<ConfirmDialogComponent, { titulo: string; mensaje: string; accion: string }, boolean>(
      ConfirmDialogComponent,
      { data: { titulo: 'Cerrar sesión', mensaje: '¿Seguro que quieres cerrar sesión?', accion: 'Cerrar sesión' } },
    );
    ref.afterClosed().subscribe(ok => {
      if (!ok) return;
      this.wsNotif.disconnect();
      this.auth.logout();
    });
  }
}
