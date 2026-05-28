import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SlaService } from '../../../core/services/sla.service';
import { ToastService } from '../../../core/services/toast.service';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import {
  SlaConfig,
  TIPOS_SERVICIO,
  TipoServicio,
} from '../../../core/models/sla.model';

interface TipoMeta {
  tipo: TipoServicio;
  nombre: string;
  descripcion: string;
  icon: string;
  color: string;
}

interface FilaEditable {
  meta: TipoMeta;
  configurado: boolean;
  minutos_asignacion: number | null;
  minutos_llegada: number | null;
  minutos_resolucion: number | null;
  // Valores originales tras la última carga / save — para detectar cambios
  base_asignacion: number | null;
  base_llegada: number | null;
  base_resolucion: number | null;
  guardando: boolean;
  errorMsg: string;
}

const TIPOS_META: TipoMeta[] = [
  { tipo: 'bateria', nombre: 'Batería',          descripcion: 'Falla eléctrica o arranque',          icon: 'battery_charging_full', color: 'text-warning' },
  { tipo: 'llanta',  nombre: 'Llanta',           descripcion: 'Pinchazo, reventón o cambio',         icon: 'circle',                color: 'text-orange' },
  { tipo: 'motor',   nombre: 'Motor',            descripcion: 'Sobrecalentamiento, falla mecánica',  icon: 'engineering',           color: 'text-accent' },
  { tipo: 'choque',  nombre: 'Choque',           descripcion: 'Colisión leve o moderada',            icon: 'car_crash',             color: 'text-danger' },
  { tipo: 'otro',    nombre: 'Otros servicios',  descripcion: 'Casos no clasificados específicamente', icon: 'help_outline',         color: 'text-app-muted' },
];

@Component({
  selector: 'app-sla',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonComponent],
  templateUrl: './sla.component.html',
})
export class SlaComponent implements OnInit {
  private slaSvc = inject(SlaService);
  private toast  = inject(ToastService);

  loading = signal(true);
  filas   = signal<FilaEditable[]>([]);

  totalConfigurados = computed(() => this.filas().filter(f => f.configurado).length);

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.loading.set(true);
    this.slaSvc.listarSla().subscribe({
      next: (list: SlaConfig[]) => {
        const porTipo = new Map<TipoServicio, SlaConfig>();
        list.forEach(c => porTipo.set(c.tipo_servicio, c));

        const filas: FilaEditable[] = TIPOS_META.map(meta => {
          const c = porTipo.get(meta.tipo);
          return {
            meta,
            configurado: !!c,
            minutos_asignacion: c?.minutos_asignacion_objetivo ?? null,
            minutos_llegada:    c?.minutos_llegada_objetivo    ?? null,
            minutos_resolucion: c?.minutos_resolucion_objetivo ?? null,
            base_asignacion:    c?.minutos_asignacion_objetivo ?? null,
            base_llegada:       c?.minutos_llegada_objetivo    ?? null,
            base_resolucion:    c?.minutos_resolucion_objetivo ?? null,
            guardando: false,
            errorMsg: '',
          };
        });
        this.filas.set(filas);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('No se pudo cargar la configuración');
        this.loading.set(false);
      },
    });
  }

  tieneCambios(f: FilaEditable): boolean {
    if (!f.configurado) {
      return f.minutos_asignacion != null
          && f.minutos_llegada    != null
          && f.minutos_resolucion != null;
    }
    return f.minutos_asignacion !== f.base_asignacion
        || f.minutos_llegada    !== f.base_llegada
        || f.minutos_resolucion !== f.base_resolucion;
  }

  esValido(f: FilaEditable): boolean {
    const ok = (n: number | null): boolean => n != null && n > 0 && n <= 1440;
    return ok(f.minutos_asignacion) && ok(f.minutos_llegada) && ok(f.minutos_resolucion);
  }

  guardar(f: FilaEditable): void {
    if (!this.esValido(f) || !this.tieneCambios(f) || f.guardando) return;

    f.guardando = true;
    f.errorMsg  = '';
    this.slaSvc.upsertSla(f.meta.tipo, {
      minutos_asignacion_objetivo: f.minutos_asignacion!,
      minutos_llegada_objetivo:    f.minutos_llegada!,
      minutos_resolucion_objetivo: f.minutos_resolucion!,
    }).subscribe({
      next: c => {
        f.configurado         = true;
        f.base_asignacion     = c.minutos_asignacion_objetivo;
        f.base_llegada        = c.minutos_llegada_objetivo;
        f.base_resolucion     = c.minutos_resolucion_objetivo;
        f.minutos_asignacion  = c.minutos_asignacion_objetivo;
        f.minutos_llegada     = c.minutos_llegada_objetivo;
        f.minutos_resolucion  = c.minutos_resolucion_objetivo;
        f.guardando = false;
        this.toast.success(`${f.meta.nombre}: tiempos guardados`);
      },
      error: e => {
        f.errorMsg  = e?.error?.detail ?? 'No se pudo guardar';
        f.guardando = false;
      },
    });
  }

  descartar(f: FilaEditable): void {
    f.minutos_asignacion = f.base_asignacion;
    f.minutos_llegada    = f.base_llegada;
    f.minutos_resolucion = f.base_resolucion;
    f.errorMsg = '';
  }

  readonly TIPOS_SERVICIO = TIPOS_SERVICIO;
}
