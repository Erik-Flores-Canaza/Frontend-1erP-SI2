import { Component, inject, signal, computed, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { TallerContextService } from '../../core/services/taller-context.service';
import { TecnicoService } from '../../core/services/tecnico.service';
import { ToastService }   from '../../core/services/toast.service';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { Tecnico, Turno, TurnoCreate, DIAS_SEMANA } from '../../core/models/tecnico.model';

@Component({
  selector: 'app-turnos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SkeletonComponent],
  templateUrl: './turnos.component.html',
})
export class TurnosComponent {
  private tallerCtx  = inject(TallerContextService);
  private tecnicoSvc = inject(TecnicoService);
  private toast      = inject(ToastService);
  private fb         = inject(FormBuilder);

  taller          = this.tallerCtx.tallerActivo;
  loadingTecnicos = signal(true);
  loadingTurnos   = signal(false);
  saving          = signal(false);
  deleting        = signal<string | null>(null);
  showForm        = signal(false);

  tecnicos        = signal<Tecnico[]>([]);
  selectedTecnico = signal<Tecnico | null>(null);
  turnos          = signal<Turno[]>([]);

  readonly diasSemana = DIAS_SEMANA;

  // Días que ya tienen turno asignado (para deshabilitar en el select)
  diasOcupados = computed(() => new Set(this.turnos().map(t => t.dia_semana)));

  // Día actual (0=Lun…6=Dom) para resaltar en la grilla
  readonly diaHoy = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

  turnoForm = this.fb.group({
    dia_semana:  [null as number | null, Validators.required],
    hora_inicio: ['08:00', Validators.required],
    hora_fin:    ['17:00', Validators.required],
  });

  // Grilla semanal: 7 slots, cada uno con el turno o null
  grillaSemanal = computed<(Turno | null)[]>(() => {
    const mapa = new Map(this.turnos().map(t => [t.dia_semana, t]));
    return Array.from({ length: 7 }, (_, i) => mapa.get(i) ?? null);
  });

  constructor() {
    effect(() => {
      const t = this.tallerCtx.tallerActivo();
      if (t) {
        this.loadingTecnicos.set(true);
        this.selectedTecnico.set(null);
        this.turnos.set([]);
        untracked(() => this.loadTecnicos(t.id));
      } else if (this.tallerCtx.sinTalleres()) {
        this.loadingTecnicos.set(false);
      }
    });
  }

  private loadTecnicos(tallerId: string): void {
    this.tecnicoSvc.getTecnicos(tallerId).subscribe({
      next: t => { this.tecnicos.set(t); this.loadingTecnicos.set(false); },
      error: () => this.loadingTecnicos.set(false),
    });
  }

  selectTecnico(tecnico: Tecnico): void {
    this.selectedTecnico.set(tecnico);
    this.turnos.set([]);
    this.showForm.set(false);
    this.loadingTurnos.set(true);
    this.tecnicoSvc.getTurnos(tecnico.id).subscribe({
      next:  t  => { this.turnos.set(t); this.loadingTurnos.set(false); },
      error: () => this.loadingTurnos.set(false),
    });
  }

  saveTurno(): void {
    const tec = this.selectedTecnico();
    if (!tec || this.turnoForm.invalid || this.saving()) return;

    this.saving.set(true);
    const val = this.turnoForm.value;
    const body: TurnoCreate = {
      dia_semana:  val.dia_semana!,
      hora_inicio: val.hora_inicio! + ':00',
      hora_fin:    val.hora_fin!    + ':00',
    };

    this.tecnicoSvc.createTurno(tec.id, body).subscribe({
      next: turno => {
        this.turnos.update(prev => [...prev, turno].sort((a, b) => a.dia_semana - b.dia_semana));
        this.toast.success('Turno registrado.');
        this.saving.set(false);
        this.showForm.set(false);
        this.turnoForm.reset({ dia_semana: null, hora_inicio: '08:00', hora_fin: '17:00' });
      },
      error: (e) => {
        this.toast.error(e?.error?.detail ?? 'No se pudo registrar el turno.');
        this.saving.set(false);
      },
    });
  }

  eliminarTurno(turno: Turno): void {
    const tec = this.selectedTecnico();
    if (!tec) return;
    this.deleting.set(turno.id);
    this.tecnicoSvc.deleteTurno(tec.id, turno.id).subscribe({
      next: () => {
        this.turnos.update(prev => prev.filter(t => t.id !== turno.id));
        this.toast.success('Turno eliminado.');
        this.deleting.set(null);
      },
      error: () => {
        this.toast.error('No se pudo eliminar el turno.');
        this.deleting.set(null);
      },
    });
  }

  formatHora(hora: string): string { return hora.substring(0, 5); }

  diasDisponibles() {
    return this.diasSemana
      .map((nombre, index) => ({ nombre, index }))
      .filter(d => !this.diasOcupados().has(d.index));
  }
}
