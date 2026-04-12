import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { TallerService } from '../../core/services/taller.service';
import { TecnicoService } from '../../core/services/tecnico.service';
import { ToastService } from '../../core/services/toast.service';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { Tecnico, Turno } from '../../core/models/tecnico.model';

@Component({
  selector: 'app-turnos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SkeletonComponent],
  templateUrl: './turnos.component.html',
})
export class TurnosComponent implements OnInit {
  private tallerSvc  = inject(TallerService);
  private tecnicoSvc = inject(TecnicoService);
  private toast      = inject(ToastService);
  private fb         = inject(FormBuilder);

  taller          = this.tallerSvc.taller;
  loadingTecnicos = signal(true);
  loadingTurnos   = signal(false);
  saving          = signal(false);
  showForm        = signal(false);

  tecnicos         = signal<Tecnico[]>([]);
  selectedTecnico  = signal<Tecnico | null>(null);
  turnos           = signal<Turno[]>([]);

  today = new Date().toISOString().split('T')[0];

  turnoForm = this.fb.group({
    fecha_turno: [this.today, Validators.required],
    hora_inicio: ['08:00', Validators.required],
    hora_fin:    ['17:00', Validators.required],
  });

  turnosHoy = computed(() => {
    const hoy = this.today;
    return this.turnos().filter(t => t.fecha_turno === hoy);
  });

  turnosFuturos = computed(() => {
    const hoy = this.today;
    return this.turnos().filter(t => t.fecha_turno > hoy);
  });

  ngOnInit(): void {
    const t = this.taller();
    if (t) this.loadTecnicos(t.id);
    else {
      this.tallerSvc.loadMyTaller().subscribe({
        next: t => this.loadTecnicos(t.id),
        error: () => this.loadingTecnicos.set(false),
      });
    }
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
      next: t => {
        // Ordenar: hoy primero, luego futuro, luego pasado
        const sorted = [...t].sort((a, b) => b.fecha_turno.localeCompare(a.fecha_turno));
        this.turnos.set(sorted);
        this.loadingTurnos.set(false);
      },
      error: () => this.loadingTurnos.set(false),
    });
  }

  saveTurno(): void {
    const tec = this.selectedTecnico();
    if (!tec || this.turnoForm.invalid || this.saving()) return;

    this.saving.set(true);
    const body = {
      fecha_turno: this.turnoForm.value.fecha_turno!,
      hora_inicio: this.turnoForm.value.hora_inicio! + ':00',
      hora_fin:    this.turnoForm.value.hora_fin!    + ':00',
    };

    this.tecnicoSvc.createTurno(tec.id, body).subscribe({
      next: turno => {
        this.turnos.update(prev => [turno, ...prev].sort((a, b) => b.fecha_turno.localeCompare(a.fecha_turno)));
        this.toast.success('Turno registrado correctamente.');
        this.saving.set(false);
        this.showForm.set(false);
        this.turnoForm.reset({ fecha_turno: this.today, hora_inicio: '08:00', hora_fin: '17:00' });
      },
      error: () => {
        this.toast.error('No se pudo registrar el turno.');
        this.saving.set(false);
      },
    });
  }

  formatHora(hora: string): string {
    return hora.substring(0, 5);
  }

  isToday(fecha: string): boolean {
    return fecha === this.today;
  }

  isPast(fecha: string): boolean {
    return fecha < this.today;
  }
}
