import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificacionService } from '../../core/services/notificacion.service';
import { ToastService }        from '../../core/services/toast.service';
import { SkeletonComponent }   from '../../shared/components/skeleton/skeleton.component';
import { Notificacion }        from '../../core/models/notificacion.model';

interface NotifMeta { icon: string; color: string; }

const TITULO_META: Record<string, NotifMeta> = {
  'Emergencia reportada':  { icon: 'warning',        color: 'text-warning' },
  'Taller asignado':       { icon: 'store',           color: 'text-accent' },
  'Nueva solicitud':       { icon: 'notification_important', color: 'text-accent' },
  'Taller confirmado':     { icon: 'check_circle',    color: 'text-success' },
  'Reasignando taller':    { icon: 'sync',            color: 'text-accent-orange' },
  'Técnico en camino':     { icon: 'directions_car',  color: 'text-accent' },
  'Servicio completado':   { icon: 'verified',        color: 'text-success' },
};

function getMeta(titulo: string): NotifMeta {
  const key = Object.keys(TITULO_META).find(k => titulo.startsWith(k));
  return key ? TITULO_META[key] : { icon: 'notifications', color: 'text-app-muted' };
}

@Component({
  selector: 'app-notificaciones',
  standalone: true,
  imports: [CommonModule, SkeletonComponent],
  templateUrl: './notificaciones.component.html',
})
export class NotificacionesComponent implements OnInit {
  private notifSvc = inject(NotificacionService);
  private toast    = inject(ToastService);

  notificaciones = signal<Notificacion[]>([]);
  loading        = signal(true);
  marcandoTodas  = signal(false);

  noLeidas = computed(() => this.notificaciones().filter(n => !n.leida).length);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.notifSvc.getNotificaciones().subscribe({
      next: lista => { this.notificaciones.set(lista); this.loading.set(false); },
      error: ()   => this.loading.set(false),
    });
  }

  marcarLeida(notif: Notificacion): void {
    if (notif.leida) return;
    this.notifSvc.marcarLeida(notif.id).subscribe({
      next: updated => {
        this.notificaciones.update(list =>
          list.map(n => n.id === updated.id ? updated : n),
        );
      },
    });
  }

  marcarTodasLeidas(): void {
    if (this.noLeidas() === 0) return;
    this.marcandoTodas.set(true);
    this.notifSvc.marcarTodasLeidas().subscribe({
      next: () => {
        this.notificaciones.update(list => list.map(n => ({ ...n, leida: true })));
        this.marcandoTodas.set(false);
        this.toast.success('Todas las notificaciones marcadas como leídas');
      },
      error: () => this.marcandoTodas.set(false),
    });
  }

  getMeta = getMeta;

  tiempoDesde(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const min  = Math.floor(diff / 60_000);
    if (min < 1)  return 'hace un momento';
    if (min < 60) return `hace ${min} min`;
    const h = Math.floor(min / 60);
    if (h  < 24)  return `hace ${h}h`;
    return `hace ${Math.floor(h / 24)}d`;
  }
}
