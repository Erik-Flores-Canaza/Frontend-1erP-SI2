import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Usuario } from '../../../core/models/usuario.model';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';

@Component({
  selector: 'app-usuarios-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonComponent],
  templateUrl: './usuarios-admin.component.html',
})
export class UsuariosAdminComponent implements OnInit {
  private adminSvc = inject(AdminService);
  private auth     = inject(AuthService);
  readonly yo      = this.auth.currentUser;

  usuarios      = signal<Usuario[]>([]);
  loading       = signal(true);
  filtroRol     = signal('');
  filtroActivo  = signal<'' | 'true' | 'false'>('');
  accionando    = signal<string | null>(null); // id del usuario en proceso
  errorMsg      = signal('');

  readonly roles = ['cliente', 'admin_taller', 'tecnico', 'superadmin'];

  usuariosFiltrados = computed(() => {
    let list = this.usuarios();
    const rol = this.filtroRol();
    if (rol) list = list.filter(u => u.rol?.nombre === rol);
    const activo = this.filtroActivo();
    if (activo === 'true')  list = list.filter(u => u.activo);
    if (activo === 'false') list = list.filter(u => !u.activo);
    return list;
  });

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.loading.set(true);
    this.adminSvc.getUsuarios().subscribe({
      next:  list => { this.usuarios.set(list); this.loading.set(false); },
      error: ()   => this.loading.set(false),
    });
  }

  toggleActivo(usuario: Usuario): void {
    const accion = usuario.activo ? 'desactivar' : 'activar';
    this.accionando.set(usuario.id);
    this.errorMsg.set('');

    const req = usuario.activo
      ? this.adminSvc.desactivarUsuario(usuario.id)
      : this.adminSvc.activarUsuario(usuario.id);

    req.subscribe({
      next: actualizado => {
        this.usuarios.update(list =>
          list.map(u => u.id === actualizado.id ? actualizado : u),
        );
        this.accionando.set(null);
      },
      error: e => {
        this.errorMsg.set(e?.error?.detail ?? `Error al ${accion} usuario`);
        this.accionando.set(null);
      },
    });
  }

  rolBadge(nombre: string): string {
    const map: Record<string, string> = {
      cliente:     'badge-neutral',
      admin_taller:'badge-warning',
      tecnico:     'badge-success',
      superadmin:  'text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400',
    };
    return map[nombre] ?? 'badge-neutral';
  }

  fechaCorta(iso: string): string {
    return new Date(iso).toLocaleDateString('es', { day: '2-digit', month: 'short', year: '2-digit' });
  }
}
