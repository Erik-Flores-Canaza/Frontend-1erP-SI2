import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-admin-tenant-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, MatTooltipModule],
  templateUrl: './admin-tenant-layout.component.html',
  styleUrl: './admin-tenant-layout.component.css',
})
export class AdminTenantLayoutComponent {
  private auth   = inject(AuthService);
  private dialog = inject(MatDialog);

  collapsed = signal(false);
  user      = this.auth.currentUser;

  navItems = [
    { label: 'Solicitudes', icon: 'inbox',      route: '/admin-tenant/solicitudes' },
    { label: 'Usuarios',    icon: 'people',     route: '/admin-tenant/usuarios' },
    { label: 'Métricas',    icon: 'bar_chart',  route: '/admin-tenant/metricas' },
    { label: 'Indicadores', icon: 'query_stats', route: '/admin-tenant/indicadores' },
    { label: 'Acuerdos',    icon: 'schedule',   route: '/admin-tenant/sla' },
  ];

  toggleSidebar(): void { this.collapsed.update(v => !v); }

  logout(): void {
    this.dialog.open<ConfirmDialogComponent, { titulo: string; mensaje: string; accion: string }, boolean>(
      ConfirmDialogComponent,
      { data: { titulo: 'Cerrar sesión', mensaje: '¿Seguro que quieres cerrar sesión?', accion: 'Cerrar sesión' } },
    ).afterClosed().subscribe(ok => {
      if (ok) this.auth.logout();
    });
  }
}
