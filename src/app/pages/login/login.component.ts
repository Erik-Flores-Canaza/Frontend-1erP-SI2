import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';
import { TallerService } from '../../core/services/taller.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private auth      = inject(AuthService);
  private tallerSvc = inject(TallerService);
  private router    = inject(Router);
  private fb        = inject(FormBuilder);

  loading  = signal(false);
  error    = signal('');
  showPass = signal(false);

  form = this.fb.group({
    correo:    ['', [Validators.required, Validators.email]],
    contrasena:['', [Validators.required, Validators.minLength(6)]],
  });

  get correo()     { return this.form.get('correo')!; }
  get contrasena() { return this.form.get('contrasena')!; }

  submit(): void {
    if (this.form.invalid || this.loading()) return;

    this.loading.set(true);
    this.error.set('');

    this.auth.login(this.form.value as { correo: string; contrasena: string }).subscribe({
      next: () => {
        this.auth.loadCurrentUser().subscribe({
          next: (user) => {
            // Bloquear acceso si no es admin_taller
            if (user.rol.nombre !== 'admin_taller') {
              this.auth.clearTokens();
              this.loading.set(false);
              this.error.set('Este panel es exclusivo para administradores de taller.');
              return;
            }
            // loadMyTaller() devuelve EMPTY en 404 (admin sin taller):
            // EMPTY completa sin emitir, así que se necesita 'complete' además de 'next'.
            this.tallerSvc.loadMyTaller().subscribe({
              next:     () => this.router.navigate(['/dashboard']),
              error:    () => this.router.navigate(['/dashboard']),
              complete: () => this.router.navigate(['/dashboard']),
            });
          },
          error: () => {
            this.loading.set(false);
            this.error.set('Error cargando datos del usuario.');
          },
        });
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(
          err.status === 401
            ? 'Correo o contraseña incorrectos.'
            : 'Error de conexión. Intenta de nuevo.',
        );
      },
    });
  }
}
