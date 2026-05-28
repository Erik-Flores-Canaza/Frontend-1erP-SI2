import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConnectivityService } from '../../../core/offline/connectivity.service';

/**
 * Barra superior compacta que aparece automáticamente cuando el navegador
 * pierde conexión. Avisa al usuario que está viendo datos guardados y que
 * las acciones de guardar no funcionarán hasta que recupere internet.
 */
@Component({
  selector: 'app-offline-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (!conn.enLinea()) {
      <div class="offline-banner">
        <span class="material-icons text-base">cloud_off</span>
        <span class="text-sm">
          Sin conexión — estás viendo datos guardados.
          Los cambios no se podrán guardar hasta que recuperes internet.
        </span>
      </div>
    }
  `,
  styles: [`
    .offline-banner {
      position: sticky;
      top: 0;
      z-index: 60;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background-color: rgba(248, 81, 73, 0.12);
      border-bottom: 1px solid rgba(248, 81, 73, 0.35);
      color: #F85149;
    }
  `],
})
export class OfflineBannerComponent {
  protected readonly conn = inject(ConnectivityService);
}
