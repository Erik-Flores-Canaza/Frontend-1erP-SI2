import {
  AfterViewInit, Component, ElementRef, inject,
  OnDestroy, OnInit, signal, ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  BarController, BarElement, CategoryScale, Chart,
  DoughnutController, ArcElement, Legend, LinearScale, Tooltip,
} from 'chart.js';
import { AdminService } from '../../../core/services/admin.service';
import { MetricasGlobales } from '../../../core/models/solicitud-registro.model';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';

Chart.register(
  BarController, BarElement,
  DoughnutController, ArcElement,
  CategoryScale, LinearScale,
  Tooltip, Legend,
);

const CHART_OPTS = {
  tooltipBg: '#0D1117',
  gridColor: '#30363D55',
  tickColor: '#6b7280',
};

@Component({
  selector: 'app-metricas-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonComponent],
  templateUrl: './metricas-admin.component.html',
})
export class MetricasAdminComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('barCanvas')   barCanvas!:  ElementRef<HTMLCanvasElement>;
  @ViewChild('donutCanvas') donutCanvas!: ElementRef<HTMLCanvasElement>;

  private adminSvc = inject(AdminService);

  metricas  = signal<MetricasGlobales | null>(null);
  loading   = signal(true);
  fechaInicio = signal('');
  fechaFin    = signal('');

  private barChart?:   Chart;
  private donutChart?: Chart;
  private viewReady  = false;

  ngOnInit(): void { this.cargar(); }
  ngAfterViewInit(): void { this.viewReady = true; if (this.metricas()) this.buildCharts(); }
  ngOnDestroy(): void { this.barChart?.destroy(); this.donutChart?.destroy(); }

  cargar(): void {
    this.loading.set(true);
    this.adminSvc.getMetricasGlobales(
      this.fechaInicio() || undefined,
      this.fechaFin()    || undefined,
    ).subscribe({
      next: m => {
        this.metricas.set(m);
        this.loading.set(false);
        setTimeout(() => { if (this.viewReady) this.buildCharts(); }, 0);
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

  private buildCharts(): void {
    const m = this.metricas();
    if (!m) return;
    this.buildBarChart(m);
    this.buildDonutChart(m);
  }

  private buildBarChart(m: MetricasGlobales): void {
    this.barChart?.destroy();
    if (!this.barCanvas?.nativeElement) return;
    const labels = Object.keys(m.incidentes.por_clasificacion_ia);
    const data   = Object.values(m.incidentes.por_clasificacion_ia);
    if (!labels.length) return;

    this.barChart = new Chart(this.barCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Incidentes',
          data,
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

  private buildDonutChart(m: MetricasGlobales): void {
    this.donutChart?.destroy();
    if (!this.donutCanvas?.nativeElement) return;

    // Para admin_tenant, los roles `cliente` y `superadmin_plataforma` son
    // cross-tenant (tenant_id NULL) y siempre vienen en 0; los ocultamos del
    // donut para no llenar la leyenda de categorías vacías.
    const ROLES_CROSS_TENANT = new Set(['cliente', 'superadmin_plataforma']);
    const ROL_LABEL: Record<string, string> = {
      admin_taller: 'Admin de taller',
      tecnico:      'Técnicos',
      admin_tenant: 'Admin del tenant',
      cliente:      'Clientes',
      superadmin_plataforma: 'Superadmin plataforma',
    };

    const rolesData = m.usuarios.por_rol;
    const entradas = Object.entries(rolesData)
      .filter(([rol, count]) => (count ?? 0) > 0 && !ROLES_CROSS_TENANT.has(rol));
    const labels = entradas.map(([rol]) => ROL_LABEL[rol] ?? rol);
    const data   = entradas.map(([, count]) => count ?? 0);
    if (!labels.length) return;

    const COLORS = ['#6366f1', '#E63946', '#F4A261', '#3FB950'];
    this.donutChart = new Chart(this.donutCanvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: COLORS.map(c => c + 'cc'),
          borderColor: COLORS,
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#8B949E', padding: 12, boxWidth: 12 } },
          tooltip: { backgroundColor: CHART_OPTS.tooltipBg, titleColor: '#e2e8f0', bodyColor: '#6b7280', borderColor: '#30363D', borderWidth: 1 },
        },
      },
    });
  }

  formatMoney(v: number): string { return `$${v.toFixed(2)}`; }
  formatMin(v: number | null): string {
    if (!v) return '—';
    return v < 60 ? `${Math.round(v)} min` : `${(v/60).toFixed(1)} h`;
  }

  // Exponer Object al template
  readonly Object = Object;
}
