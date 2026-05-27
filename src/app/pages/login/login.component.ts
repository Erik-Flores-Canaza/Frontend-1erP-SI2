import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';
import { TallerService } from '../../core/services/taller.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
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
            const rol = user.rol.nombre;

            // Superadmin de plataforma → panel /plataforma (CU-28/CU-29)
            if (rol === 'superadmin_plataforma') {
              this.router.navigate(['/plataforma']);
              return;
            }

            // Admin del tenant → panel /admin-tenant (CU-23/24/25 scoped)
            if (rol === 'admin_tenant') {
              this.router.navigate(['/admin-tenant']);
              return;
            }

            // Admin de taller → panel principal
            if (rol === 'admin_taller') {
              this.tallerSvc.loadMyTaller().subscribe({
                next:     () => this.router.navigate(['/dashboard']),
                error:    () => this.router.navigate(['/dashboard']),
                complete: () => this.router.navigate(['/dashboard']),
              });
              return;
            }

            // Cualquier otro rol (cliente, tecnico) no tiene acceso a este panel
            this.auth.clearTokens();
            this.loading.set(false);
            this.error.set('Este panel es exclusivo para administradores de taller, del tenant o de la plataforma.');
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
