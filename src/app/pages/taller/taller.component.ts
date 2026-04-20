import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { TallerService } from '../../core/services/taller.service';
import { ToastService } from '../../core/services/toast.service';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { ServicioTaller, TIPOS_SERVICIO, TipoServicio } from '../../core/models/taller.model';

type GeoStatus = 'idle' | 'loading' | 'success' | 'error';

@Component({
  selector: 'app-taller',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SkeletonComponent],
  templateUrl: './taller.component.html',
})
export class TallerComponent implements OnInit {
  private tallerSvc = inject(TallerService);
  private toast     = inject(ToastService);
  private fb        = inject(FormBuilder);

  taller    = this.tallerSvc.taller;
  sinTaller = this.tallerSvc.sinTaller;
  loading   = signal(true);
  saving    = signal(false);
  editMode  = signal(false);

  servicios      = signal<ServicioTaller[]>([]);
  tiposConfig    = TIPOS_SERVICIO;
  savingServicio = signal<TipoServicio | null>(null);
  geoStatus      = signal<GeoStatus>('idle');

  form = this.fb.group({
    nombre:    ['', Validators.required],
    direccion: [''],
    latitud:   [null as number | null],
    longitud:  [null as number | null],
    disponible:[true],
  });

  ngOnInit(): void {
    const t = this.taller();
    if (t) {
      this.patchForm(t);
      this.loadServicios(t.id);
    } else if (this.sinTaller()) {
      // admin sin taller → modo creación
      this.loading.set(false);
      this.editMode.set(true);
    } else {
      this.tallerSvc.loadMyTaller().subscribe({
        next:     t  => { this.patchForm(t); this.loadServicios(t.id); },
        error:    ()  => this.loading.set(false),
        complete: ()  => { if (this.sinTaller()) { this.loading.set(false); this.editMode.set(true); } },
      });
    }
  }

  private patchForm(t: ReturnType<typeof this.taller>): void {
    if (!t) return;
    this.form.patchValue({
      nombre:    t.nombre,
      direccion: t.direccion ?? '',
      latitud:   t.latitud,
      longitud:  t.longitud,
      disponible:t.disponible,
    });
    this.loading.set(false);
  }

  private loadServicios(id: string): void {
    this.tallerSvc.getServicios(id).subscribe({
      next: s => this.servicios.set(s),
    });
  }

  usarMiUbicacion(): void {
    if (!navigator.geolocation) {
      this.toast.error('Tu navegador no soporta geolocalización.');
      return;
    }
    this.geoStatus.set('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.form.patchValue({
          latitud:  pos.coords.latitude,
          longitud: pos.coords.longitude,
        });
        this.geoStatus.set('success');
      },
      () => {
        this.toast.error('No se pudo obtener la ubicación. Verifica los permisos del navegador.');
        this.geoStatus.set('error');
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  save(): void {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    const t = this.taller();

    const op = t
      ? this.tallerSvc.updateTaller(t.id, this.form.value as any)
      : this.tallerSvc.createTaller(this.form.value as any);

    const mensajeOk = t ? 'Taller actualizado correctamente.' : 'Taller creado correctamente.';

    op.subscribe({
      next: (taller) => {
        this.toast.success(mensajeOk);
        this.editMode.set(false);
        this.saving.set(false);
        if (!t) this.loadServicios(taller.id);
      },
      error: () => {
        this.toast.error(t ? 'No se pudo actualizar el taller.' : 'No se pudo crear el taller.');
        this.saving.set(false);
      },
    });
  }

  cancelEdit(): void {
    const t = this.taller();
    if (t) this.patchForm(t);
    this.editMode.set(false);
  }

  /** Activa/desactiva un tipo de servicio */
  toggleServicio(tipo: TipoServicio): void {
    const t = this.taller();
    if (!t) return;

    const existente = this.servicios().find(s => s.tipo_servicio === tipo);
    if (existente) {
      // Ya existe: no se puede desactivar con el endpoint actual (solo crear)
      // En el Ciclo 2 se añadirá PATCH /talleres/{id}/servicios/{sid}
      this.toast.info('Para desactivar un servicio usa el panel de administración.');
      return;
    }

    this.savingServicio.set(tipo);
    this.tallerSvc.addServicio(t.id, { tipo_servicio: tipo, disponible: true }).subscribe({
      next: s => {
        this.servicios.update(prev => [...prev, s]);
        this.toast.success(`Servicio "${tipo}" activado.`);
        this.savingServicio.set(null);
      },
      error: () => {
        this.toast.error('No se pudo agregar el servicio.');
        this.savingServicio.set(null);
      },
    });
  }

  isServicioActivo(tipo: TipoServicio): boolean {
    return this.servicios().some(s => s.tipo_servicio === tipo && s.disponible);
  }
}
