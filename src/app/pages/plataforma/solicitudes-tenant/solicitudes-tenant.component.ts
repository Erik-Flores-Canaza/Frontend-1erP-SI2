import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { PlataformaService } from '../../../core/services/plataforma.service';
import {
  SolicitudTenant,
  SolicitudTenantEstado,
} from '../../../core/models/solicitud-tenant.model';
import { TenantCreateResponse } from '../../../core/models/tenant.model';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';

type FiltroEstado = 'todas' | SolicitudTenantEstado;
type ModalTipo    = 'detalle' | 'aprobar' | 'rechazar' | 'credenciales' | null;

@Component({
  selector: 'app-solicitudes-tenant',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SkeletonComponent],
  templateUrl: './solicitudes-tenant.component.html',
})
export class SolicitudesTenantComponent implements OnInit {
  private svc = inject(PlataformaService);
  private fb  = inject(FormBuilder);

  solicitudes     = signal<SolicitudTenant[]>([]);
  loading         = signal(true);
  filtro          = signal<FiltroEstado>('todas');
  modalTipo       = signal<ModalTipo>(null);
  solicitudActual = signal<SolicitudTenant | null>(null);
  aprobacionResp  = signal<TenantCreateResponse | null>(null);
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

  solicitudesFiltradas = computed(() => {
    const f = this.filtro();
    if (f === 'todas') return this.solicitudes();
    return this.solicitudes().filter(s => s.estado === f);
  });

  pendientesCount = computed(
    () => this.solicitudes().filter(s => s.estado === 'pendiente').length,
  );

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.loading.set(true);
    this.svc.listarSolicitudesTenant().subscribe({
      next:  list => { this.solicitudes.set(list); this.loading.set(false); },
      error: ()   => this.loading.set(false),
    });
  }

  // ── Ver detalle ─────────────────────────────────────────────────────────
  verDetalle(s: SolicitudTenant): void {
    this.solicitudActual.set(s);
    this.modalTipo.set('detalle');
  }

  // ── Aprobar ─────────────────────────────────────────────────────────────
  iniciarAprobacion(s: SolicitudTenant): void {
    this.solicitudActual.set(s);
    this.modalTipo.set('aprobar');
    this.errorAccion.set('');
  }

  confirmarAprobacion(): void {
    const s = this.solicitudActual();
    if (!s) return;
    this.accionLoading.set(true);
    this.svc.aprobarSolicitudTenant(s.id).subscribe({
      next: resp => {
        this.aprobacionResp.set(resp);
        this.modalTipo.set('credenciales');
        this.accionLoading.set(false);
        this.solicitudes.update(list =>
          list.map(x => x.id === s.id ? { ...x, estado: 'aprobado' as const } : x),
        );
      },
      error: e => {
        this.errorAccion.set(e?.error?.detail ?? 'Error al aprobar');
        this.accionLoading.set(false);
      },
    });
  }

  // ── Rechazar ────────────────────────────────────────────────────────────
  iniciarRechazo(s: SolicitudTenant): void {
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
    this.svc.rechazarSolicitudTenant(s.id, this.rechazarForm.value.motivo!).subscribe({
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

  // ── Copiar contraseña ───────────────────────────────────────────────────
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
    this.copiado.set(false);
  }

  badgeCss(estado: string): string {
    return { pendiente: 'badge-warning', aprobado: 'badge-success', rechazado: 'badge-danger' }[estado] ?? 'badge-neutral';
  }

  fechaCorta(iso: string): string {
    return new Date(iso).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
