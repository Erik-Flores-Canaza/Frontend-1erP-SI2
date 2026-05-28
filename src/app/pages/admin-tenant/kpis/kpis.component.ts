import {
  AfterViewInit, Component, ElementRef, OnDestroy, OnInit,
  ViewChild, computed, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  BarController, BarElement, CategoryScale, Chart,
  Legend, LinearScale, Tooltip,
} from 'chart.js';
import { SlaService } from '../../../core/services/sla.service';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { KpisDashboard } from '../../../core/models/sla.model';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const CHART_OPTS = {
  tooltipBg: '#0D1117',
  gridColor: '#30363D55',
  tickColor: '#6b7280',
};

const TIPO_LABEL: Record<string, string> = {
  bateria: 'Batería',
  llanta: 'Llanta',
  motor: 'Motor',
  choque: 'Choque',
  otro: 'Otros',
  sin_clasificar: 'Sin clasificar',
};

@Component({
  selector: 'app-kpis',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonComponent],
  templateUrl: './kpis.component.html',
})
export class KpisComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('barCanvas') barCanvas!: ElementRef<HTMLCanvasElement>;

  private slaSvc = inject(SlaService);

  loading      = signal(true);
  kpis         = signal<KpisDashboard | null>(null);
  fechaInicio  = signal('');
  fechaFin     = signal('');

  private barChart?: Chart;
  private viewReady = false;

  // Etiqueta amigable para tipos de servicio
  etiquetaTipo = (k: string) => TIPO_LABEL[k] ?? k;

  porTipoOrdenado = computed(() => {
    const k = this.kpis();
    if (!k) return [];
    return Object.entries(k.incidentes_por_tipo)
      .map(([tipo, count]) => ({ tipo, label: this.etiquetaTipo(tipo), count }))
      .sort((a, b) => b.count - a.count);
  });

  cumplimientoPorTipo = computed(() => {
    const k = this.kpis();
    if (!k) return [];
    return Object.entries(k.cumplimiento_sla.por_tipo)
      .map(([tipo, c]) => ({ tipo, label: this.etiquetaTipo(tipo), ...c }))
      .sort((a, b) => (b.aplicables - a.aplicables));
  });

  hayDatos = computed(() => (this.kpis()?.totales.incidentes ?? 0) > 0);

  ngOnInit(): void { this.cargar(); }
  ngAfterViewInit(): void {
    this.viewReady = true;
    if (this.kpis()) this.buildBarChart();
  }
  ngOnDestroy(): void { this.barChart?.destroy(); }

  cargar(): void {
    this.loading.set(true);
    this.slaSvc.getKpis(
      this.fechaInicio() || undefined,
      this.fechaFin()    || undefined,
    ).subscribe({
      next: k => {
        this.kpis.set(k);
        this.loading.set(false);
        setTimeout(() => { if (this.viewReady) this.buildBarChart(); }, 0);
      },
      error: () => this.loading.set(false),
    });
  }

  aplicarFiltro(): void { this.cargar(); }

  limpiarFiltro(): void {
    this.fechaInicio.set('');
    this.fechaFin.set('');
    this.cargar();
  }

  formatMin(v: number | null): string {
    if (v == null) return '—';
    if (v < 60)   return `${Math.round(v)} min`;
    if (v < 1440) return `${(v / 60).toFixed(1)} h`;
    return `${(v / 1440).toFixed(1)} d`;
  }

  formatPct(v: number | null): string {
    return v == null ? '—' : `${v.toFixed(1)}%`;
  }

  cumplimientoColor(v: number | null): string {
    if (v == null)  return 'text-app-muted';
    if (v >= 80)    return 'text-success';
    if (v >= 50)    return 'text-warning';
    return 'text-danger';
  }

  cumplimientoBarBg(v: number | null): string {
    if (v == null) return 'bg-app-faint';
    if (v >= 80)   return 'bg-success';
    if (v >= 50)   return 'bg-warning';
    return 'bg-danger';
  }

  private buildBarChart(): void {
    this.barChart?.destroy();
    if (!this.barCanvas?.nativeElement) return;
    const data = this.porTipoOrdenado();
    if (!data.length) return;

    this.barChart = new Chart(this.barCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: data.map(d => d.label),
        datasets: [{
          label: 'Casos',
          data: data.map(d => d.count),
          backgroundColor: '#6366f1bb',
          borderColor: '#6366f1',
          borderWidth: 1,
          borderRadius: 6,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: CHART_OPTS.tooltipBg, titleColor: '#e2e8f0', bodyColor: '#6b7280', borderColor: '#30363D', borderWidth: 1 },
        },
        scales: {
          x: { ticks: { color: CHART_OPTS.tickColor }, grid: { color: CHART_OPTS.gridColor } },
          y: { beginAtZero: true, ticks: { color: CHART_OPTS.tickColor, stepSize: 1 }, grid: { color: CHART_OPTS.gridColor } },
        },
      },
    });
  }
}
