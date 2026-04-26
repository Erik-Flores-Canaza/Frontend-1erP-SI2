import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthService }    from '../../core/auth/auth.service';
import { UsuarioService } from '../../core/services/usuario.service';
import { ToastService }   from '../../core/services/toast.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './perfil.component.html',
})
export class PerfilComponent implements OnInit {
  private auth       = inject(AuthService);
  private usuarioSvc = inject(UsuarioService);
  private toast      = inject(ToastService);
  private fb         = inject(FormBuilder);

  user = this.auth.currentUser;

  // ── Formulario de datos personales ────────────────────────────────────────
  perfilForm!: FormGroup;
  savingPerfil = signal(false);

  // ── Formulario de contraseña ───────────────────────────────────────────────
  passForm!: FormGroup;
  savingPass  = signal(false);
  showActual  = signal(false);
  showNueva   = signal(false);
  showConfirm = signal(false);

  ngOnInit(): void {
    const u = this.user();
    this.perfilForm = this.fb.group({
      nombre_completo: [u?.nombre_completo ?? '', [Validators.required, Validators.minLength(3)]],
      telefono:        [u?.telefono ?? ''],
    });

    this.passForm = this.fb.group(
      {
        contrasena_actual: ['', Validators.required],
        nueva_contrasena:  ['', [Validators.required, Validators.minLength(8)]],
        confirmar:         ['', Validators.required],
      },
      { validators: this.matchValidator },
    );
  }

  private matchValidator(g: AbstractControl): ValidationErrors | null {
    return g.get('nueva_contrasena')?.value === g.get('confirmar')?.value
      ? null
      : { mismatch: true };
  }

  // ── Guardar perfil ────────────────────────────────────────────────────────
  guardarPerfil(): void {
    if (this.perfilForm.invalid) return;
    this.savingPerfil.set(true);
    this.usuarioSvc.updateMe(this.perfilForm.value).subscribe({
      next: (user) => {
        this.auth.setUser(user);
        this.toast.success('Perfil actualizado correctamente.');
        this.savingPerfil.set(false);
      },
      error: () => {
        this.toast.error('No se pudo actualizar el perfil.');
        this.savingPerfil.set(false);
      },
    });
  }

  // ── Cambiar contraseña ────────────────────────────────────────────────────
  cambiarContrasena(): void {
    if (this.passForm.invalid) return;
    this.savingPass.set(true);
    const { contrasena_actual, nueva_contrasena } = this.passForm.value;
    this.usuarioSvc.cambiarContrasena({ contrasena_actual, nueva_contrasena }).subscribe({
      next: () => {
        this.toast.success('Contraseña cambiada correctamente.');
        this.passForm.reset();
        this.savingPass.set(false);
      },
      error: (err) => {
        this.toast.error(err?.error?.detail ?? 'La contraseña actual es incorrecta.');
        this.savingPass.set(false);
      },
    });
  }
}
