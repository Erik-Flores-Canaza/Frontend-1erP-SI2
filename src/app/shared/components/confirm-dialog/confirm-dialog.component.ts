import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';

export interface ConfirmDialogData {
  titulo:  string;
  mensaje: string;
  accion:  string;  // texto del botón de confirmación
  peligro?: boolean;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  template: `
    <div class="p-6 min-w-[340px] max-w-md">
      <h2 class="text-lg font-bold text-app-text mb-2">{{ data.titulo }}</h2>
      <p class="text-app-muted text-sm leading-relaxed mb-6">{{ data.mensaje }}</p>
      <div class="flex justify-end gap-3">
        <button
          (click)="cancel()"
          class="btn-ghost text-sm"
        >Cancelar</button>
        <button
          (click)="confirm()"
          [class]="data.peligro ? 'btn-danger' : 'btn-primary'"
          class="text-sm"
        >{{ data.accion }}</button>
      </div>
    </div>
  `,
})
export class ConfirmDialogComponent {
  data    = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<ConfirmDialogComponent>);

  confirm(): void { this.ref.close(true); }
  cancel():  void { this.ref.close(false); }
}
