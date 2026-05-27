import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LandingService } from '../../core/services/landing.service';
import { MapPickerComponent, Coordenadas } from '../../shared/components/map-picker/map-picker.component';
import { PhoneInputComponent } from '../../shared/components/phone-input/phone-input.component';

type EnvioEstado = 'idle' | 'loading' | 'success' | 'error';
type TipoSolicitud = 'taller' | 'tenant';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MapPickerComponent, PhoneInputComponent],
  templateUrl: './landing.component.html',
})
export class LandingComponent {
  private fb      = inject(FormBuilder);
  private landing = inject(LandingService);

  // Estado UI: pestaña activa + estado del envío (compartido entre ambos forms)
  tipoSolicitud = signal<TipoSolicitud>('taller');
  envioEstado   = signal<EnvioEstado>('idle');
  errorMsg      = signal('');

  // CU-22 — Solicitud de taller individual
  form = this.fb.group({
    solicitante_nombre:   ['', [Validators.required, Validators.minLength(3)]],
    solicitante_correo:   ['', [Validators.required, Validators.email]],
    solicitante_telefono: [''],
    nombre_taller:        ['', [Validators.required, Validators.minLength(3)]],
    direccion:            [''],
    latitud:              [null as number | null],
    longitud:             [null as number | null],
    descripcion:          [''],
  });

  // CU-29 — Solicitud de alta como red de talleres
  formTenant = this.fb.group({
    solicitante_nombre:   ['', [Validators.required, Validators.minLength(3)]],
    solicitante_correo:   ['', [Validators.required, Validators.email]],
    solicitante_telefono: [''],
    nombre_red:           ['', [Validators.required, Validators.minLength(3)]],
    descripcion:          [''],
  });

  onCoordenadas(coords: Coordenadas): void {
    this.form.patchValue({ latitud: coords.lat, longitud: coords.lng });
  }

  cambiarTipo(tipo: TipoSolicitud): void {
    this.tipoSolicitud.set(tipo);
    this.envioEstado.set('idle');
    this.errorMsg.set('');
  }

  // ── Getters CU-22 ─────────────────────────────────────────────────────────
  get nombre()       { return this.form.get('solicitante_nombre')!; }
  get correo()       { return this.form.get('solicitante_correo')!; }
  get nombreTaller() { return this.form.get('nombre_taller')!; }

  // ── Getters CU-29 ─────────────────────────────────────────────────────────
  get nombreT()       { return this.formTenant.get('solicitante_nombre')!; }
  get correoT()       { return this.formTenant.get('solicitante_correo')!; }
  get nombreRed()     { return this.formTenant.get('nombre_red')!; }

  readonly steps = [
    {
      num: 1, icon: 'smartphone', title: 'El cliente reporta',
      desc: 'El conductor sube fotos, audio o texto describiendo la emergencia desde la app móvil.',
      bg: 'rgba(230,57,70,0.12)', color: '#E63946',
    },
    {
      num: 2, icon: 'psychology', title: 'La IA clasifica',
      desc: 'El sistema analiza el incidente, asigna prioridad y selecciona el taller más adecuado.',
      bg: 'rgba(244,162,97,0.12)', color: '#F4A261',
    },
    {
      num: 3, icon: 'build', title: 'El taller responde',
      desc: 'Recibes la solicitud, asignas un técnico y el cliente puede seguir el progreso en tiempo real.',
      bg: 'rgba(63,185,80,0.12)', color: '#3FB950',
    },
  ];

  readonly beneficios = [
    {
      icon: 'people',
      title: 'Clientes verificados',
      desc: 'Cada solicitud proviene de usuarios registrados en la plataforma con datos validados.',
    },
    {
      icon: 'payments',
      title: 'Pagos seguros',
      desc: 'Los pagos se procesan digitalmente. Recibes el neto directamente, sin efectivo.',
    },
    {
      icon: 'bar_chart',
      title: 'Métricas en tiempo real',
      desc: 'Visualiza el rendimiento de tu taller: atenciones, tiempos de respuesta e ingresos.',
    },
    {
      icon: 'add_business',
      title: 'Gestiona sucursales',
      desc: 'Un solo panel para administrar múltiples talleres. Técnicos y turnos por sucursal.',
    },
  ];

  scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.envioEstado.set('loading');
    const val = this.form.value;
    this.landing.enviarSolicitud({
      solicitante_nombre:   val.solicitante_nombre!,
      solicitante_correo:   val.solicitante_correo!,
      solicitante_telefono: val.solicitante_telefono ?? undefined,
      nombre_taller:        val.nombre_taller!,
      direccion:            val.direccion ?? undefined,
      latitud:              val.latitud   ?? undefined,
      longitud:             val.longitud  ?? undefined,
      descripcion:          val.descripcion ?? undefined,
    }).subscribe({
      next:  () => this.envioEstado.set('success'),
      error: (e) => {
        this.errorMsg.set(e?.error?.detail ?? 'Ocurrió un error. Intenta nuevamente.');
        this.envioEstado.set('error');
      },
    });
  }

  onSubmitTenant(): void {
    if (this.formTenant.invalid) {
      this.formTenant.markAllAsTouched();
      return;
    }
    this.envioEstado.set('loading');
    const val = this.formTenant.value;
    this.landing.enviarSolicitudTenant({
      solicitante_nombre:   val.solicitante_nombre!,
      solicitante_correo:   val.solicitante_correo!,
      solicitante_telefono: val.solicitante_telefono ?? undefined,
      nombre_red:           val.nombre_red!,
      descripcion:          val.descripcion ?? undefined,
    }).subscribe({
      next:  () => this.envioEstado.set('success'),
      error: (e) => {
        this.errorMsg.set(e?.error?.detail ?? 'Ocurrió un error. Intenta nuevamente.');
        this.envioEstado.set('error');
      },
    });
  }
}
