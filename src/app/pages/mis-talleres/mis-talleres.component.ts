import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TallerService }        from '../../core/services/taller.service';
import { TallerContextService } from '../../core/services/taller-context.service';
import { Taller, TIPOS_SERVICIO, TipoServicio, ServicioTaller } from '../../core/models/taller.model';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { MapPickerComponent, Coordenadas } from '../../shared/components/map-picker/map-picker.component';

type PanelTipo = 'agregar' | 'editar' | null;

@Component({
  selector: 'app-mis-talleres',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SkeletonComponent, MapPickerComponent],
  templateUrl: './mis-talleres.component.html',
})
export class MisTalleresComponent implements OnInit {
  private tallerSvc = inject(TallerService);
  private tallerCtx = inject(TallerContextService);
  private fb        = inject(FormBuilder);

  talleres         = this.tallerCtx.talleres;
  loading          = signal(true);
  panelTipo        = signal<PanelTipo>(null);
  tallerEditando   = signal<Taller | null>(null);
  guardando        = signal(false);
  errorMsg         = signal('');
  accionandoId     = signal<string | null>(null);  // desactivar o activar en curso

  // Servicios por sucursal (en el panel de edición)
  servicios        = signal<ServicioTaller[]>([]);
  loadingServicios = signal(false);
  savingServicio   = signal<TipoServicio | null>(null);
  tiposServicio    = TIPOS_SERVICIO;

  form = this.fb.group({
    nombre:    ['', [Validators.required, Validators.minLength(3)]],
    direccion: [''],
    latitud:   [null as number | null],
    longitud:  [null as number | null],
  });

  ngOnInit(): void {
    this.tallerCtx.cargarTalleres().subscribe({
      next:  () => this.loading.set(false),
      error: () => this.loading.set(false),
    });
  }

  // ── Panel agregar ────────────────────────────────────────────────────────
  abrirAgregar(): void {
    this.form.reset();
    this.tallerEditando.set(null);
    this.servicios.set([]);
    this.panelTipo.set('agregar');
    this.errorMsg.set('');
  }

  // ── Panel editar ─────────────────────────────────────────────────────────
  abrirEditar(t: Taller): void {
    this.form.patchValue({
      nombre:    t.nombre,
      direccion: t.direccion ?? '',
      latitud:   t.latitud ?? null,
      longitud:  t.longitud ?? null,
    });
    this.tallerEditando.set(t);
    this.panelTipo.set('editar');
    this.errorMsg.set('');
    // Cargar servicios de esta sucursal
    this.loadingServicios.set(true);
    this.tallerSvc.getServicios(t.id).subscribe({
      next:  s => { this.servicios.set(s); this.loadingServicios.set(false); },
      error: () => this.loadingServicios.set(false),
    });
  }

  guardar(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.guardando.set(true);
    this.errorMsg.set('');
    const val = this.form.value;

    if (this.panelTipo() === 'agregar') {
      this.tallerSvc.createTaller({
        nombre:    val.nombre!,
        direccion: val.direccion || undefined,
        latitud:   val.latitud   ?? undefined,
        longitud:  val.longitud  ?? undefined,
      }).subscribe({
        next: nuevo => {
          this.tallerCtx.agregarTaller(nuevo);
          this.cerrarPanel();
          this.guardando.set(false);
        },
        error: e => {
          this.errorMsg.set(e?.error?.detail ?? 'Error al crear el taller');
          this.guardando.set(false);
        },
      });
    } else {
      const t = this.tallerEditando();
      if (!t) return;
      this.tallerSvc.updateTaller(t.id, {
        nombre:    val.nombre ?? undefined,
        direccion: val.direccion || undefined,
        latitud:   val.latitud   ?? undefined,
        longitud:  val.longitud  ?? undefined,
      }).subscribe({
        next: actualizado => {
          this.tallerCtx.actualizarTaller(actualizado);
          this.cerrarPanel();
          this.guardando.set(false);
        },
        error: e => {
          this.errorMsg.set(e?.error?.detail ?? 'Error al actualizar');
          this.guardando.set(false);
        },
      });
    }
  }

  // ── Activar / Desactivar ─────────────────────────────────────────────────
  toggleActivo(t: Taller): void {
    if (t.activo) {
      if (!confirm(`¿Desactivar "${t.nombre}"? Dejará de recibir asignaciones.`)) return;
      this.accionandoId.set(t.id);
      this.tallerSvc.deleteTaller(t.id).subscribe({
        next: () => {
          this.tallerCtx.cargarTalleres().subscribe();
          this.accionandoId.set(null);
        },
        error: e => {
          alert(e?.error?.detail ?? 'Error al desactivar');
          this.accionandoId.set(null);
        },
      });
    } else {
      this.accionandoId.set(t.id);
      this.tallerSvc.activarTaller(t.id).subscribe({
        next: actualizado => {
          this.tallerCtx.actualizarTaller(actualizado);
          this.accionandoId.set(null);
        },
        error: e => {
          alert(e?.error?.detail ?? 'Error al activar');
          this.accionandoId.set(null);
        },
      });
    }
  }

  // ── Toggle disponible ────────────────────────────────────────────────────
  toggleDisponible(): void {
    const t = this.tallerEditando();
    if (!t) return;
    this.accionandoId.set(t.id);
    this.tallerSvc.updateTaller(t.id, { disponible: !t.disponible }).subscribe({
      next: actualizado => {
        this.tallerCtx.actualizarTaller(actualizado);
        this.tallerEditando.set(actualizado);
        this.accionandoId.set(null);
      },
      error: () => this.accionandoId.set(null),
    });
  }

  // ── Servicios ────────────────────────────────────────────────────────────
  isServicioActivo(tipo: TipoServicio): boolean {
    return this.servicios().some(s => s.tipo_servicio === tipo && s.disponible);
  }

  toggleServicio(tipo: TipoServicio): void {
    const t = this.tallerEditando();
    if (!t) return;
    if (this.isServicioActivo(tipo)) return; // solo activar por ahora
    this.savingServicio.set(tipo);
    this.tallerSvc.addServicio(t.id, { tipo_servicio: tipo, disponible: true }).subscribe({
      next: s => {
        this.servicios.update(prev => [...prev, s]);
        this.savingServicio.set(null);
      },
      error: () => this.savingServicio.set(null),
    });
  }

  onCoordenadas(coords: Coordenadas): void {
    this.form.patchValue({ latitud: coords.lat, longitud: coords.lng });
  }

  cerrarPanel(): void {
    this.panelTipo.set(null);
    this.tallerEditando.set(null);
    this.servicios.set([]);
  }

  badgeAprobacion(estado: string | null): string {
    return { aprobado: 'badge-success', pendiente: 'badge-warning', rechazado: 'badge-danger' }[estado ?? ''] ?? 'badge-neutral';
  }

  labelAprobacion(estado: string | null): string {
    return { aprobado: 'Aprobado', pendiente: 'Pendiente', rechazado: 'Rechazado' }[estado ?? ''] ?? 'Sin estado';
  }
}
