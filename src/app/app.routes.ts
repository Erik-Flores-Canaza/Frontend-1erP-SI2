import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { adminTenantGuard } from './core/auth/admin-tenant.guard';
import { plataformaGuard } from './core/auth/plataforma.guard';
import { guestGuard } from './core/auth/guest.guard';

export const routes: Routes = [
  // ── Página pública (landing + formularios CU-22 / CU-29) ──────────────────
  {
    path: '',
    pathMatch: 'full',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/landing/landing.component').then(m => m.LandingComponent),
  },

  // ── Auth ──────────────────────────────────────────────────────────────────
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/login/login.component').then(m => m.LoginComponent),
  },

  // ── Panel Superadmin Plataforma (CU-28 / CU-29 revisión) ──────────────────
  {
    path: 'plataforma',
    loadComponent: () =>
      import('./layouts/plataforma-layout/plataforma-layout.component').then(
        m => m.PlataformaLayoutComponent,
      ),
    canActivate: [plataformaGuard],
    children: [
      { path: '', redirectTo: 'tenants', pathMatch: 'full' },
      {
        path: 'tenants',
        loadComponent: () =>
          import('./pages/plataforma/tenants/tenants.component').then(
            m => m.TenantsComponent,
          ),
      },
      {
        path: 'solicitudes-tenant',
        loadComponent: () =>
          import('./pages/plataforma/solicitudes-tenant/solicitudes-tenant.component').then(
            m => m.SolicitudesTenantComponent,
          ),
      },
    ],
  },

  // ── Panel Admin Tenant (CU-23 / CU-24 / CU-25 — scoped al tenant) ─────────
  {
    path: 'admin-tenant',
    loadComponent: () =>
      import('./layouts/admin-tenant-layout/admin-tenant-layout.component').then(
        m => m.AdminTenantLayoutComponent,
      ),
    canActivate: [adminTenantGuard],
    children: [
      { path: '', redirectTo: 'solicitudes', pathMatch: 'full' },
      {
        path: 'solicitudes',
        loadComponent: () =>
          import('./pages/superadmin/solicitudes-admin/solicitudes-admin.component').then(
            m => m.SolicitudesAdminComponent,
          ),
      },
      {
        path: 'usuarios',
        loadComponent: () =>
          import('./pages/superadmin/usuarios-admin/usuarios-admin.component').then(
            m => m.UsuariosAdminComponent,
          ),
      },
      {
        path: 'metricas',
        loadComponent: () =>
          import('./pages/superadmin/metricas-admin/metricas-admin.component').then(
            m => m.MetricasAdminComponent,
          ),
      },
      {
        path: 'sla',
        loadComponent: () =>
          import('./pages/admin-tenant/sla/sla.component').then(m => m.SlaComponent),
      },
      {
        path: 'indicadores',
        loadComponent: () =>
          import('./pages/admin-tenant/kpis/kpis.component').then(m => m.KpisComponent),
      },
    ],
  },

  // ── Panel Admin Taller ────────────────────────────────────────────────────
  {
    path: '',
    loadComponent: () =>
      import('./layouts/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'taller',    loadComponent: () => import('./pages/taller/taller.component').then(m => m.TallerComponent) },
      { path: 'talleres',  loadComponent: () => import('./pages/mis-talleres/mis-talleres.component').then(m => m.MisTalleresComponent) },
      { path: 'tecnicos',  loadComponent: () => import('./pages/tecnicos/tecnicos.component').then(m => m.TecnicosComponent) },
      { path: 'turnos',    loadComponent: () => import('./pages/turnos/turnos.component').then(m => m.TurnosComponent) },
      { path: 'solicitudes', loadComponent: () => import('./pages/solicitudes/solicitudes.component').then(m => m.SolicitudesComponent) },
      { path: 'ordenes',   loadComponent: () => import('./pages/ordenes/ordenes.component').then(m => m.OrdenesComponent) },
      { path: 'notificaciones', loadComponent: () => import('./pages/notificaciones/notificaciones.component').then(m => m.NotificacionesComponent) },
      { path: 'historial', loadComponent: () => import('./pages/historial/historial.component').then(m => m.HistorialComponent) },
      { path: 'metricas',  loadComponent: () => import('./pages/metricas/metricas.component').then(m => m.MetricasComponent) },
      { path: 'perfil',    loadComponent: () => import('./pages/perfil/perfil.component').then(m => m.PerfilComponent) },
    ],
  },

  // ── Fallback ──────────────────────────────────────────────────────────────
  { path: '**', redirectTo: '' },
];
