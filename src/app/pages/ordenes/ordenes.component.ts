import {
  Component, inject, signal, OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';

import { TallerService }    from '../../core/services/taller.service';
import { TecnicoService }   from '../../core/services/tecnico.service';
import { SolicitudService } from '../../core/services/solicitud.service';
import { IncidenteService } from '../../core/services/incidente.service';
import { ToastService }     from '../../core/services/toast.service';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../shared/components/confirm-dialog/confirm-dialog.component';

import {
  Incidente, AsignacionResumen, EstadoIncidente,
  ESTADO_META, PRIORIDAD_META, CLASIFICACION_META,
} from '../../core/models/incidente.model';
import { environment } from '../../../environments/environment';
import { Tecnico } from '../../core/models/tecnico.model';

interface TecnicoConDistancia extends Tecnico {
  distKm: number | null;  // distancia al incidente en km
  eta:    number | null;  // minutos estimados (30 km/h)
}

@Component({
  selector: 'app-ordenes',
  standalone: true,
  imports: [CommonModule, FormsModule, MatTooltipModule, SkeletonComponent],
  templateUrl: './ordenes.component.html',
})
export class OrdenesComponent implements OnInit {
  private tallerSvc    = inject(TallerService);
  private tecnicoSvc   = inject(TecnicoService);
  private solicitudSvc = inject(SolicitudService);
  private incidenteSvc = inject(IncidenteService);
  private toast        = inject(ToastService);
  private dialog       = inject(MatDialog);

  ordenes   = signal<Incidente[]>([]);
  tecnicos  = signal<Tecnico[]>([]);
  loading   = signal(true);
  accionando = signal<string | null>(null);

  // Modal asignar técnico
  modalAbierto   = signal(false);
  ordenSeleccionada = signal<Incidente | null>(null);
  asigSeleccionada  = signal<AsignacionResumen | null>(null);
  tecnicoElegido      = signal<string>('');
  asignandoTecnico    = signal(false);
  notificandoTecnico  = signal<string | null>(null); // id del técnico al que se notificó

  // Base URL para construir URLs absolutas de evidencias
  readonly apiBase = environment.apiUrl.replace(/\/api$/, '');

  // Metadatos de UI
  readonly estadoMeta        = ESTADO_META;
  readonly prioridadMeta     = PRIORIDAD_META;
  readonly clasificacionMeta = CLASIFICACION_META;

  readonly ESTADOS_AVANZAR: Record<EstadoIncidente, EstadoIncidente | null> = {
    pendiente:  'en_proceso',
    en_proceso: 'atendido',
    atendido:   null,
    cancelado:  null,
  };

  private tallerId = '';

  ngOnInit(): void {
    const t = this.tallerSvc.taller();
    if (t) {
      this.tallerId = t.id;
      this.cargarDatos();
    } else {
      this.tallerSvc.loadMyTaller().subscribe({
        next:     taller => { this.tallerId = taller.id; this.cargarDatos(); },
        error:    () => this.loading.set(false),
        complete: () => { if (!this.tallerId) this.loading.set(false); },
      });
    }
  }

  private cargarDatos(): void {
    let done = 0;
    const check = () => { if (++done === 2) this.loading.set(false); };

    // Cargamos todas las solicitudes con estado en_proceso o pendiente (aceptadas)
    this.cargarOrdenes(check);
    this.tecnicoSvc.getTecnicos(this.tallerId).subscribe({
      next: t => { this.tecnicos.set(t); check(); },
      error: () => check(),
    });
  }

  private cargarOrdenes(done?: () => void): void {
    this.solicitudSvc.getOrdenes(this.tallerId).subscribe({
      next: lista => { this.ordenes.set(lista); done?.(); },
      error: () => done?.(),
    });
  }

  refrescar(): void {
    this.loading.set(true);
    this.cargarDatos();
  }

  // ── Asignar técnico ──────────────────────────────────────────────────────

  abrirModalTecnico(inc: Incidente): void {
    const asig = this.asignacionAceptadaSinTecnico(inc);
    if (!asig) return;
    this.ordenSeleccionada.set(inc);
    this.asigSeleccionada.set(asig);
    this.tecnicoElegido.set('');
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
    this.ordenSeleccionada.set(null);
    this.asigSeleccionada.set(null);
    this.tecnicoElegido.set('');
    this.notificandoTecnico.set(null);
  }

  notificarUbicacion(tecnicoId: string): void {
    if (this.notificandoTecnico() === tecnicoId) return;
    this.notificandoTecnico.set(tecnicoId);
    this.tecnicoSvc.solicitarUbicacion(tecnicoId).subscribe({
      next: () => this.toast.success('Notificación enviada al técnico.'),
      error: ()  => {
        this.toast.error('No se pudo enviar la notificación.');
        this.notificandoTecnico.set(null);
      },
    });
  }

  confirmarAsignacion(): void {
    const asig = this.asigSeleccionada();
    if (!asig || !this.tecnicoElegido()) return;

    this.asignandoTecnico.set(true);
    this.solicitudSvc.asignarTecnico(asig.id, { tecnico_id: this.tecnicoElegido() }).subscribe({
      next: () => {
        this.toast.success('Técnico asignado. El cliente fue notificado.');
        this.asignandoTecnico.set(false);
        this.cerrarModal();
        this.refrescar();
      },
      error: (err) => {
        const msg = err?.error?.detail ?? 'No se pudo asignar el técnico.';
        this.toast.error(msg);
        this.asignandoTecnico.set(false);
      },
    });
  }

  // ── Actualizar estado ─────────────────────────────────────────────────────

  avanzarEstado(inc: Incidente): void {
    const siguiente = this.ESTADOS_AVANZAR[inc.estado];
    if (!siguiente) return;

    const eMeta = this.estadoMeta[siguiente];
    const ref = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
      ConfirmDialogComponent,
      {
        data: {
          titulo:  `Cambiar estado a "${eMeta.label}"`,
          mensaje: `¿Confirmas el cambio de estado del incidente a "${eMeta.label}"?`,
          accion:  `Cambiar a ${eMeta.label}`,
        },
      },
    );

    ref.afterClosed().subscribe(ok => {
      if (!ok) return;
      this.accionando.set(inc.id);
      this.incidenteSvc.actualizarEstado(inc.id, siguiente).subscribe({
        next: updated => {
          // Actualizar en la lista local
          this.ordenes.update(list =>
            list.map(o => o.id === updated.id ? updated : o),
          );
          this.toast.success(`Estado actualizado a "${eMeta.label}"`);
          this.accionando.set(null);
        },
        error: () => {
          this.toast.error('No se pudo actualizar el estado.');
          this.accionando.set(null);
        },
      });
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  asignacionAceptada(inc: Incidente): AsignacionResumen | undefined {
    return inc.asignaciones.find(a => a.accion_taller === 'aceptado');
  }

  asignacionAceptadaSinTecnico(inc: Incidente): AsignacionResumen | undefined {
    return inc.asignaciones.find(a => a.accion_taller === 'aceptado' && !a.tecnico_id);
  }

  tecnicosDisponibles(): TecnicoConDistancia[] {
    const inc = this.ordenSeleccionada();
    const lat0 = inc?.latitud ?? null;
    const lon0 = inc?.longitud ?? null;

    return this.tecnicos()
      .filter(t => t.disponible)
      .map(t => {
        const distKm = (lat0 !== null && lon0 !== null &&
                        t.latitud_actual !== null && t.longitud_actual !== null)
          ? this.haversineKm(lat0, lon0, t.latitud_actual, t.longitud_actual)
          : null;
        const eta = distKm !== null ? Math.max(5, Math.ceil(distKm / 0.5)) : null;
        return { ...t, distKm, eta };
      })
      .sort((a, b) => {
        if (a.distKm === null && b.distKm === null) return 0;
        if (a.distKm === null) return 1;
        if (b.distKm === null) return -1;
        return a.distKm - b.distKm;
      });
  }

  private haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  tecnicoNombre(tecnicoId: string): string {
    return this.tecnicos().find(t => t.id === tecnicoId)?.usuario.nombre_completo ?? '—';
  }

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
