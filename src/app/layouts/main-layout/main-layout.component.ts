import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../core/auth/auth.service';
import { TallerService } from '../../core/services/taller.service';

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
export class MainLayoutComponent implements OnInit {
  private auth   = inject(AuthService);
  private tallerSvc = inject(TallerService);

  collapsed  = signal(false);
  user       = this.auth.currentUser;
  taller     = this.tallerSvc.taller;
  tallerNombre = computed(() => this.taller()?.nombre ?? 'Mi Taller');

  navItems: NavItem[] = [
    { label: 'Dashboard',  icon: 'dashboard',        route: '/dashboard' },
    { label: 'Mi Taller',  icon: 'store',             route: '/taller' },
    { label: 'Técnicos',   icon: 'engineering',       route: '/tecnicos' },
    { label: 'Turnos',     icon: 'calendar_month',    route: '/turnos' },
  ];

  ngOnInit(): void {
    // Si el taller no está en memoria, cargarlo
    if (!this.taller()) {
      this.tallerSvc.loadMyTaller().subscribe({ error: () => {} });
    }
  }

  toggleSidebar(): void {
    this.collapsed.update(v => !v);
  }

  logout(): void {
    this.auth.logout();
  }
}
