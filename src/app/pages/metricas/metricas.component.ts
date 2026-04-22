import {
  AfterViewInit, Component, ElementRef, inject,
  OnDestroy, OnInit, signal, ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  BarController, BarElement, CategoryScale, Chart,
  Legend, LinearScale, LineController, LineElement,
  PointElement, Tooltip,
} from 'chart.js';

import { TallerService }    from '../../core/services/taller.service';
import { SolicitudService } from '../../core/services/solicitud.service';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { MetricasTaller }   from '../../core/models/historial.model';

// Registrar solo los componentes necesarios (tree-shaking)
Chart.register(
  BarController, BarElement,
  LineController, LineElement, PointElement,
  CategoryScale, LinearScale,
  Tooltip, Legend,
);

const MESES_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const CHART_DEFAULTS = {
  bgColor:   '#1C2128',
  gridColor: '#30363D55',
  tickColor: '#6b7280',
  tooltipBg: '#0D1117',
};

@Component({
  selector: 'app-metricas',
  standalone: true,
  imports: [CommonModule, SkeletonComponent],
  templateUrl: './metricas.component.html',
})
export class MetricasComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('barCanvas')      barCanvas!:      ElementRef<HTMLCanvasElement>;
  @ViewChild('lineCanvas')     lineCanvas!:     ElementRef<HTMLCanvasElement>;
  @ViewChild('ingresosCanvas') ingresosCanvas!: ElementRef<HTMLCanvasElement>;

  private tallerSvc    = inject(TallerService);
  private solicitudSvc = inject(SolicitudService);

  metricas = signal<MetricasTaller | null>(null);
  loading  = signal(true);

  private tallerId  = '';
  private barChart?:      Chart;
  private lineChart?:     Chart;
  private ingresosChart?: Chart;
  private viewReady = false;

  ngOnInit(): void {
    const t = this.tallerSvc.taller();
    if (t) {
      this.tallerId = t.id;
      this.cargar();
    } else {
      this.tallerSvc.loadMyTaller().subscribe({
        next:  taller => { this.tallerId = taller.id; this.cargar(); },
        error: ()     => this.loading.set(false),
      });
    }
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    // Si los datos ya llegaron antes que el view, construir charts ahora
    if (this.metricas()) this.buildCharts();
  }

  ngOnDestroy(): void {
    this.barChart?.destroy();
    this.lineChart?.destroy();
    this.ingresosChart?.destroy();
  }

  private cargar(): void {
    this.solicitudSvc.getMetricas(this.tallerId).subscribe({
      next: m => {
        this.metricas.set(m);
        this.loading.set(false);
        // Construir charts después del next tick (DOM re-render)
        setTimeout(() => { if (this.viewReady) this.buildCharts(); }, 0);
      },
      error: () => this.loading.set(false),
    });
  }

  private buildCharts(): void {
    const m = this.metricas();
    if (!m) return;
    this.buildBarChart(m);
    this.buildLineChart(m);
    this.buildIngresosChart(m);
  }

  private buildBarChart(m: MetricasTaller): void {
    this.barChart?.destroy();
    if (!this.barCanvas?.nativeElement) return;

    this.barChart = new Chart(this.barCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: m.atenciones_por_tipo.map(t => t.clasificacion),
        datasets: [{
          label: 'Atenciones',
          data: m.atenciones_por_tipo.map(t => t.total),
          backgroundColor: '#E63946bb',
          borderColor: '#E63946',
          borderWidth: 1,
          borderRadius: 6,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: CHART_DEFAULTS.tooltipBg,
            titleColor: '#e2e8f0',
            bodyColor: '#6b7280',
            borderColor: '#30363D',
            borderWidth: 1,
          },
        },
        scales: {
          x: {
            ticks: { color: CHART_DEFAULTS.tickColor },
            grid:  { color: CHART_DEFAULTS.gridColor },
          },
          y: {
            ticks: { color: CHART_DEFAULTS.tickColor, stepSize: 1 },
            grid:  { color: CHART_DEFAULTS.gridColor },
            beginAtZero: true,
          },
        },
      },
    });
  }

  private buildLineChart(m: MetricasTaller): void {
    this.lineChart?.destroy();
    if (!this.lineCanvas?.nativeElement) return;

    this.lineChart = new Chart(this.lineCanvas.nativeElement, {
      type: 'line',
      data: {
        labels: m.atenciones_por_mes.map(
          p => `${MESES_ES[p.mes - 1]} ${p.anio}`,
        ),
        datasets: [{
          label: 'Atenciones',
          data: m.atenciones_por_mes.map(p => p.total),
          borderColor: '#F4A261',
          backgroundColor: '#F4A26120',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#F4A261',
          pointBorderColor: '#F4A261',
          pointRadius: 4,
          pointHoverRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: CHART_DEFAULTS.tooltipBg,
            titleColor: '#e2e8f0',
            bodyColor: '#6b7280',
            borderColor: '#30363D',
            borderWidth: 1,
          },
        },
        scales: {
          x: {
            ticks: { color: CHART_DEFAULTS.tickColor },
            grid:  { color: CHART_DEFAULTS.gridColor },
          },
          y: {
            ticks: { color: CHART_DEFAULTS.tickColor, stepSize: 1 },
            grid:  { color: CHART_DEFAULTS.gridColor },
            beginAtZero: true,
          },
        },
      },
    });
  }

  private buildIngresosChart(m: MetricasTaller): void {
    this.ingresosChart?.destroy();
    if (!this.ingresosCanvas?.nativeElement) return;
    if (!m.ingresos_por_mes?.length) return;

    this.ingresosChart = new Chart(this.ingresosCanvas.nativeElement, {
      type: 'line',
      data: {
        labels: m.ingresos_por_mes.map(
          p => `${MESES_ES[p.mes - 1]} ${p.anio}`,
        ),
        datasets: [{
          label: 'Ingresos ($)',
          data: m.ingresos_por_mes.map(p => p.total),
          borderColor: '#22c55e',
          backgroundColor: '#22c55e20',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#22c55e',
          pointBorderColor: '#22c55e',
          pointRadius: 4,
          pointHoverRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: CHART_DEFAULTS.tooltipBg,
            titleColor: '#e2e8f0',
            bodyColor: '#6b7280',
            borderColor: '#30363D',
            borderWidth: 1,
            callbacks: {
              label: ctx => ` $${(ctx.parsed.y as number).toFixed(2)}`,
            },
          },
        },
        scales: {
          x: {
            ticks: { color: CHART_DEFAULTS.tickColor },
            grid:  { color: CHART_DEFAULTS.gridColor },
          },
          y: {
            ticks: {
              color: CHART_DEFAULTS.tickColor,
              callback: v => `$${v}`,
            },
            grid:  { color: CHART_DEFAULTS.gridColor },
            beginAtZero: true,
          },
        },
      },
    });
  }

  formatMoney(val: number | null): string {
    if (val === null || val === undefined) return '—';
    return `$${val.toFixed(2)}`;
  }

  formatMin(min: number | null): string {
    if (min === null || min === undefined) return '—';
    if (min < 60) return `${Math.round(min)} min`;
    return `${(min / 60).toFixed(1)} h`;
  }

  formatPorcentaje(val: number | null): string {
    if (val === null || val === undefined) return '—';
    return `${val.toFixed(1)}%`;
  }
}
