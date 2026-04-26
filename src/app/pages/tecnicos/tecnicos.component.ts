import { Component, inject, signal, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { TallerContextService } from '../../core/services/taller-context.service';
import { TecnicoService } from '../../core/services/tecnico.service';
import { ToastService } from '../../core/services/toast.service';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { PhoneInputComponent } from '../../shared/components/phone-input/phone-input.component';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { Tecnico } from '../../core/models/tecnico.model';

@Component({
  selector: 'app-tecnicos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SkeletonComponent, PhoneInputComponent],
  templateUrl: './tecnicos.component.html',
})
export class TecnicosComponent {
  private tallerCtx  = inject(TallerContextService);
  private tecnicoSvc = inject(TecnicoService);
  private toast      = inject(ToastService);
  private dialog     = inject(MatDialog);
  private fb         = inject(FormBuilder);

  taller   = this.tallerCtx.tallerActivo;
  loading  = signal(true);
  saving   = signal(false);
  deleting = signal<string | null>(null);

  tecnicos  = signal<Tecnico[]>([]);
  panelOpen = signal(false);          // panel lateral add/edit
  editing   = signal<Tecnico | null>(null);

  form = this.fb.group({
    nombre_completo: ['', Validators.required],
    correo:          ['', [Validators.required, Validators.email]],
    contrasena:      ['', [Validators.required, Validators.minLength(6)]],
    telefono:        [''],
  });

  get nombre()     { return this.form.get('nombre_completo')!; }
  get correo()     { return this.form.get('correo')!; }
  get contrasena() { return this.form.get('contrasena')!; }

  constructor() {
    effect(() => {
      const t = this.tallerCtx.tallerActivo();
      if (t) {
        this.loading.set(true);
        untracked(() => this.loadTecnicos(t.id));
      } else if (this.tallerCtx.sinTalleres()) {
        this.loading.set(false);
      }
    });
  }

  private loadTecnicos(tallerId: string): void {
    this.tecnicoSvc.getTecnicos(tallerId).subscribe({
      next: t => { this.tecnicos.set(t); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openAdd(): void {
    this.editing.set(null);
    this.form.reset();
    this.form.get('contrasena')!.setValidators([Validators.required, Validators.minLength(6)]);
    this.form.get('contrasena')!.updateValueAndValidity();
    this.panelOpen.set(true);
  }

  openEdit(tecnico: Tecnico): void {
    this.editing.set(tecnico);
    this.form.patchValue({
      nombre_completo: tecnico.usuario.nombre_completo,
      correo:          tecnico.usuario.correo,
      telefono:        tecnico.usuario.telefono ?? '',
    });
    // Al editar no se cambia contraseña por este flujo
    this.form.get('contrasena')!.clearValidators();
    this.form.get('contrasena')!.updateValueAndValidity();
    this.panelOpen.set(true);
  }

  closePanel(): void {
    this.panelOpen.set(false);
    this.editing.set(null);
    this.form.reset();
  }

  saveForm(): void {
    if (this.form.invalid || this.saving()) return;
    const taller = this.tallerCtx.tallerActivo();
    if (!taller) return;

    this.saving.set(true);
    const ed = this.editing();

    if (ed) {
      // Editar: solo disponibilidad (contraseña se cambia por otro flujo)
      this.tecnicoSvc.updateTecnico(ed.id, { disponible: ed.disponible }).subscribe({
        next: updated => {
          this.tecnicos.update(prev => prev.map(t => t.id === updated.id ? updated : t));
          this.toast.success('Técnico actualizado.');
          this.saving.set(false);
          this.closePanel();
        },
        error: () => { this.toast.error('No se pudo actualizar.'); this.saving.set(false); },
      });
    } else {
      const body = {
        nombre_completo: this.form.value.nombre_completo!,
        correo:          this.form.value.correo!,
        contrasena:      this.form.value.contrasena!,
        telefono:        this.form.value.telefono || undefined,
        taller_id:       taller.id,
      };
      this.tecnicoSvc.createTecnico(body).subscribe({
        next: t => {
          this.tecnicos.update(prev => [...prev, t]);
          this.toast.success(`Técnico ${t.usuario.nombre_completo} creado.`);
          this.saving.set(false);
          this.closePanel();
        },
        error: (err) => {
          this.toast.error(err.error?.detail ?? 'Error al crear técnico.');
          this.saving.set(false);
        },
      });
    }
  }

  toggleDisponible(tecnico: Tecnico): void {
    const nuevo = !tecnico.disponible;
    this.tecnicoSvc.updateTecnico(tecnico.id, { disponible: nuevo }).subscribe({
      next: updated => {
        this.tecnicos.update(prev => prev.map(t => t.id === updated.id ? updated : t));
        this.toast.success(`Técnico marcado como ${nuevo ? 'disponible' : 'no disponible'}.`);
      },
      error: () => this.toast.error('No se pudo actualizar la disponibilidad.'),
    });
  }

  confirmDelete(tecnico: Tecnico): void {
    this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
      ConfirmDialogComponent,
      {
        data: {
          titulo:  'Eliminar técnico',
          mensaje: `¿Estás seguro de eliminar a "${tecnico.usuario.nombre_completo}"? Esta acción no se puede deshacer.`,
          accion:  'Eliminar',
          peligro: true,
        },
      },
    ).afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.deleting.set(tecnico.id);
      this.tecnicoSvc.deleteTecnico(tecnico.id).subscribe({
        next: () => {
          this.tecnicos.update(prev => prev.filter(t => t.id !== tecnico.id));
          this.toast.success('Técnico eliminado.');
          this.deleting.set(null);
        },
        error: () => {
          this.toast.error('No se pudo eliminar el técnico.');
          this.deleting.set(null);
        },
      });
    });
  }
}
