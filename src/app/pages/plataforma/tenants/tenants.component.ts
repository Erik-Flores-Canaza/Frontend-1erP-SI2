import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormGroup,
} from '@angular/forms';
import { PlataformaService } from '../../../core/services/plataforma.service';
import {
  Tenant,
  TenantCreateConAdmin,
  TenantCreateResponse,
  TenantUpdate,
} from '../../../core/models/tenant.model';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';

type ModalTipo = 'crear' | 'editar' | 'credenciales' | null;
type FiltroActivo = '' | 'true' | 'false';

@Component({
  selector: 'app-tenants',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SkeletonComponent],
  templateUrl: './tenants.component.html',
})
export class TenantsComponent implements OnInit {
  private svc = inject(PlataformaService);
  private fb  = inject(FormBuilder);

  // ── Estado de página ────────────────────────────────────────────────────
  tenants       = signal<Tenant[]>([]);
  loading       = signal(true);
  filtroActivo  = signal<FiltroActivo>('');
  filtroBusq    = signal('');
  modalTipo     = signal<ModalTipo>(null);
  tenantEdit    = signal<Tenant | null>(null);
  creadoResp    = signal<TenantCreateResponse | null>(null);
  accionLoading = signal(false);
  accionando    = signal<string | null>(null); // id del tenant en proceso de toggle
  errorAccion   = signal('');
  errorMsg      = signal('');
  copiado       = signal(false);

  // ── Forms ───────────────────────────────────────────────────────────────
  crearForm: FormGroup = this.fb.group({
    nombre:               ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
    slug:                 ['', [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), Validators.maxLength(60)]],
    correo_contacto:      ['', [Validators.email]],
    telefono_contacto:    [''],
    plan:                 ['basico', [Validators.required]],
    admin_nombre_completo:['', [Validators.required, Validators.minLength(2)]],
    admin_correo:         ['', [Validators.required, Validators.email]],
    admin_contrasena:     ['', [Validators.required, Validators.minLength(6)]],
    admin_telefono:       [''],
  });

  editarForm: FormGroup = this.fb.group({
    nombre:           ['', [Validators.required, Validators.minLength(2)]],
    correo_contacto:  ['', [Validators.email]],
    telefono_contacto:[''],
    plan:             ['basico'],
  });

  // ── Derived ─────────────────────────────────────────────────────────────
  tenantsFiltrados = computed(() => {
    let list = this.tenants();
    const a = this.filtroActivo();
    if (a === 'true')  list = list.filter(t => t.activo);
    if (a === 'false') list = list.filter(t => !t.activo);
    const q = this.filtroBusq().trim().toLowerCase();
    if (q) {
      list = list.filter(t =>
        t.nombre.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        (t.correo_contacto?.toLowerCase().includes(q) ?? false),
      );
    }
    return list;
  });

  totalActivos    = computed(() => this.tenants().filter(t => t.activo).length);
  totalInactivos  = computed(() => this.tenants().filter(t => !t.activo).length);

  readonly planes = ['basico', 'pro', 'enterprise'];

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.loading.set(true);
    this.errorMsg.set('');
    this.svc.listarTenants().subscribe({
      next: list => { this.tenants.set(list); this.loading.set(false); },
      error: e => {
        this.errorMsg.set(e?.error?.detail ?? 'Error cargando tenants');
        this.loading.set(false);
      },
    });
  }

  // ── Crear ───────────────────────────────────────────────────────────────
  abrirCrear(): void {
    this.crearForm.reset({ plan: 'basico' });
    this.errorAccion.set('');
    this.modalTipo.set('crear');
  }

  generarContrasena(): void {
    // 12 caracteres alfanuméricos legibles
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let pass = '';
    for (let i = 0; i < 12; i++) pass += chars[Math.floor(Math.random() * chars.length)];
    this.crearForm.patchValue({ admin_contrasena: pass });
  }

  sugerirSlug(): void {
    const nombre = (this.crearForm.value.nombre as string | null)?.trim() ?? '';
    if (!nombre) return;
    const slug = nombre
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '') // tildes
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (slug && !this.crearForm.value.slug) {
      this.crearForm.patchValue({ slug });
    }
  }

  confirmarCreacion(): void {
    if (this.crearForm.invalid) {
      this.crearForm.markAllAsTouched();
      return;
    }
    this.accionLoading.set(true);
    this.errorAccion.set('');
    const v = this.crearForm.value;
    const body: TenantCreateConAdmin = {
      nombre:                v.nombre!,
      slug:                  v.slug!,
      correo_contacto:       v.correo_contacto || undefined,
      telefono_contacto:     v.telefono_contacto || undefined,
      plan:                  v.plan || 'basico',
      admin_nombre_completo: v.admin_nombre_completo!,
      admin_correo:          v.admin_correo!,
      admin_contrasena:      v.admin_contrasena!,
      admin_telefono:        v.admin_telefono || undefined,
    };
    this.svc.crearTenantConAdmin(body).subscribe({
      next: resp => {
        // Inyectar contraseña a la respuesta porque el endpoint con-admin no la devuelve
        // (la generó el operador en el form, así que la mostramos en el modal de credenciales).
        const respConPass: TenantCreateResponse = {
          ...resp,
          contrasena_temporal: resp.contrasena_temporal ?? body.admin_contrasena,
        };
        this.creadoResp.set(respConPass);
        this.tenants.update(list => [resp.tenant, ...list]);
        this.modalTipo.set('credenciales');
        this.accionLoading.set(false);
      },
      error: e => {
        this.errorAccion.set(e?.error?.detail ?? 'Error al crear el tenant');
        this.accionLoading.set(false);
      },
    });
  }

  // ── Editar ──────────────────────────────────────────────────────────────
  abrirEditar(t: Tenant): void {
    this.tenantEdit.set(t);
    this.editarForm.reset({
      nombre:            t.nombre,
      correo_contacto:   t.correo_contacto ?? '',
      telefono_contacto: t.telefono_contacto ?? '',
      plan:              t.plan,
    });
    this.errorAccion.set('');
    this.modalTipo.set('editar');
  }

  confirmarEdicion(): void {
    const t = this.tenantEdit();
    if (!t) return;
    if (this.editarForm.invalid) {
      this.editarForm.markAllAsTouched();
      return;
    }
    this.accionLoading.set(true);
    const v = this.editarForm.value;
    const body: TenantUpdate = {
      nombre:            v.nombre ?? undefined,
      correo_contacto:   v.correo_contacto || null,
      telefono_contacto: v.telefono_contacto || null,
      plan:              v.plan ?? undefined,
    };
    this.svc.actualizarTenant(t.id, body).subscribe({
      next: actualizado => {
        this.tenants.update(list => list.map(x => x.id === actualizado.id ? actualizado : x));
        this.cerrarModal();
        this.accionLoading.set(false);
      },
      error: e => {
        this.errorAccion.set(e?.error?.detail ?? 'Error al actualizar');
        this.accionLoading.set(false);
      },
    });
  }

  // ── Activar / Desactivar ────────────────────────────────────────────────
  toggleActivo(t: Tenant): void {
    this.accionando.set(t.id);
    this.errorMsg.set('');
    const req = t.activo
      ? this.svc.desactivarTenant(t.id)
      : this.svc.activarTenant(t.id);
    req.subscribe({
      next: actualizado => {
        this.tenants.update(list => list.map(x => x.id === actualizado.id ? actualizado : x));
        this.accionando.set(null);
      },
      error: e => {
        this.errorMsg.set(e?.error?.detail ?? `Error al ${t.activo ? 'desactivar' : 'activar'} tenant`);
        this.accionando.set(null);
      },
    });
  }

  // ── Helpers UI ──────────────────────────────────────────────────────────
  copiarContrasena(): void {
    const pass = this.creadoResp()?.contrasena_temporal;
    if (!pass) return;
    navigator.clipboard.writeText(pass).then(() => {
      this.copiado.set(true);
      setTimeout(() => this.copiado.set(false), 2000);
    });
  }

  cerrarModal(): void {
    this.modalTipo.set(null);
    this.tenantEdit.set(null);
    this.creadoResp.set(null);
    this.errorAccion.set('');
    this.copiado.set(false);
  }

  fechaCorta(iso: string): string {
    return new Date(iso).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  planBadge(plan: string): string {
    const map: Record<string, string> = {
      basico:     'text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-400',
      pro:        'text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400',
      enterprise: 'text-[10px] font-medium px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400',
    };
    return map[plan] ?? map['basico'];
  }
}
