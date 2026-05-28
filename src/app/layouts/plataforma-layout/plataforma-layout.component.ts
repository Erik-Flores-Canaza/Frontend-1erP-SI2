import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../core/auth/auth.service';
import { NotificacionService } from '../../core/services/notificacion.service';
import { WsNotificacionService } from '../../core/services/ws-notificacion.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { OfflineBannerComponent } from '../../shared/components/offline-banner/offline-banner.component';

@Component({
  selector: 'app-plataforma-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, MatTooltipModule, OfflineBannerComponent],
  templateUrl: './plataforma-layout.component.html',
  styleUrl: './plataforma-layout.component.css',
})
export class PlataformaLayoutComponent implements OnInit {
  private auth     = inject(AuthService);
  private dialog   = inject(MatDialog);
  private notifSvc = inject(NotificacionService);
  private wsNotif  = inject(WsNotificacionService);

  collapsed = signal(false);
  user      = this.auth.currentUser;

  navItems = [
    { label: 'Tenants',             icon: 'domain',  route: '/plataforma/tenants' },
    { label: 'Solicitudes de red',  icon: 'inbox',   route: '/plataforma/solicitudes-tenant' },
  ];

  ngOnInit(): void {
    // Inicializa el contador con las pendientes actuales del backend (one-shot).
    // De ahí en adelante, el WebSocket es la única fuente de actualizaciones.
    this.notifSvc.refrescarContador();
    this.wsNotif.connect();
  }

  toggleSidebar(): void { this.collapsed.update(v => !v); }

  logout(): void {
    this.dialog.open<ConfirmDialogComponent, { titulo: string; mensaje: string; accion: string }, boolean>(
      ConfirmDialogComponent,
      { data: { titulo: 'Cerrar sesión', mensaje: '¿Seguro que quieres cerrar sesión?', accion: 'Cerrar sesión' } },
    ).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.wsNotif.disconnect();
      this.auth.logout();
    });
  }
}
