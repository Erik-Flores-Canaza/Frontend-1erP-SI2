import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: '',
    loadComponent: () =>
      import('./layouts/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'taller',
        loadComponent: () =>
          import('./pages/taller/taller.component').then(m => m.TallerComponent),
      },
      {
        path: 'tecnicos',
        loadComponent: () =>
          import('./pages/tecnicos/tecnicos.component').then(m => m.TecnicosComponent),
      },
      {
        path: 'turnos',
        loadComponent: () =>
          import('./pages/turnos/turnos.component').then(m => m.TurnosComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
