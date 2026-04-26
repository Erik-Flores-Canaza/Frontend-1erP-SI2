import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { SolicitudRegistro, AprobacionResponse } from '../../../core/models/solicitud-registro.model';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';

type FiltroEstado = 'todas' | 'pendiente' | 'aprobado' | 'rechazado';
type ModalTipo    = 'detalle' | 'aprobar' | 'rechazar' | 'credenciales' | null;

@Component({
  selector: 'app-solicitudes-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SkeletonComponent],
  templateUrl: './solicitudes-admin.component.html',
})
export class SolicitudesAdminComponent implements OnInit {
  private adminSvc = inject(AdminService);
  private fb       = inject(FormBuilder);

  solicitudes    = signal<SolicitudRegistro[]>([]);
  loading        = signal(true);
  filtro         = signal<FiltroEstado>('todas');
  modalTipo      = signal<ModalTipo>(null);
  solicitudActual = signal<SolicitudRegistro | null>(null);
  aprobacionResp  = signal<AprobacionResponse | null>(null);
  accionLoading   = signal(false);
  errorAccion     = signal('');
  copiado         = signal(false);

  rechazarForm = this.fb.group({
    motivo: ['', [Validators.required, Validators.minLength(10)]],
  });

  filtros: { label: string; value: FiltroEstado }[] = [
    { label: 'Todas',      value: 'todas' },
    { label: 'Pendientes', value: 'pendiente' },
    { label: 'Aprobadas',  value: 'aprobado' },
    { label: 'Rechazadas', value: 'rechazado' },
  ];

  get solicitudesFiltradas() {
    const f = this.filtro();
    if (f === 'todas') return this.solicitudes();
    return this.solicitudes().filter(s => s.estado === f);
  }

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.loading.set(true);
    this.adminSvc.getSolicitudes().subscribe({
      next:  list => { this.solicitudes.set(list); this.loading.set(false); },
      error: ()   => this.loading.set(false),
    });
  }

  // ── Ver detalle ──────────────────────────────────────────────────────────
  verDetalle(s: SolicitudRegistro): void {
    this.solicitudActual.set(s);
    this.modalTipo.set('detalle');
  }

  // ── Aprobar ───────────────────────────────────────────────────────────────
  iniciarAprobacion(s: SolicitudRegistro): void {
    this.solicitudActual.set(s);
    this.modalTipo.set('aprobar');
    this.errorAccion.set('');
  }

  confirmarAprobacion(): void {
    const s = this.solicitudActual();
    if (!s) return;
    this.accionLoading.set(true);
    this.adminSvc.aprobarSolicitud(s.id).subscribe({
      next: resp => {
        this.aprobacionResp.set(resp);
        this.modalTipo.set('credenciales');
        this.accionLoading.set(false);
        // Actualizar la solicitud en la lista local
        this.solicitudes.update(list =>
          list.map(x => x.id === s.id ? { ...x, estado: 'aprobado' } : x),
        );
      },
      error: e => {
        this.errorAccion.set(e?.error?.detail ?? 'Error al aprobar');
        this.accionLoading.set(false);
      },
    });
  }

  // ── Rechazar ──────────────────────────────────────────────────────────────
  iniciarRechazo(s: SolicitudRegistro): void {
    this.solicitudActual.set(s);
    this.rechazarForm.reset();
    this.modalTipo.set('rechazar');
    this.errorAccion.set('');
  }

  confirmarRechazo(): void {
    if (this.rechazarForm.invalid) { this.rechazarForm.markAllAsTouched(); return; }
    const s = this.solicitudActual();
    if (!s) return;
    this.accionLoading.set(true);
    this.adminSvc.rechazarSolicitud(s.id, this.rechazarForm.value.motivo!).subscribe({
      next: actualizado => {
        this.solicitudes.update(list =>
          list.map(x => x.id === s.id ? actualizado : x),
        );
        this.cerrarModal();
        this.accionLoading.set(false);
      },
      error: e => {
        this.errorAccion.set(e?.error?.detail ?? 'Error al rechazar');
        this.accionLoading.set(false);
      },
    });
  }

  // ── Copiar contraseña ─────────────────────────────────────────────────────
  copiarContrasena(): void {
    const pass = this.aprobacionResp()?.contrasena_temporal;
    if (!pass) return;
    navigator.clipboard.writeText(pass).then(() => {
      this.copiado.set(true);
      setTimeout(() => this.copiado.set(false), 2000);
    });
  }

  cerrarModal(): void {
    this.modalTipo.set(null);
    this.solicitudActual.set(null);
    this.aprobacionResp.set(null);
    this.errorAccion.set('');
  }

  badgeCss(estado: string): string {
    return { pendiente: 'badge-warning', aprobado: 'badge-success', rechazado: 'badge-danger' }[estado] ?? 'badge-neutral';
  }

  fechaCorta(iso: string): string {
    return new Date(iso).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
