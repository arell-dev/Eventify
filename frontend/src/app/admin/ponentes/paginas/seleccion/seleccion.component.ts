import { HttpErrorResponse } from '@angular/common/http';
import { afterNextRender, Component, computed, DestroyRef, ElementRef, inject, Injector, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { NotificacionesService } from '../../../../comunes/notificaciones/notificaciones.service';
import { UsuarioElegiblePonente } from '../../modelos/ponente.model';
import { mensajeErrorPonentes, normalizarBusqueda } from '../../modelos/ponentes-presentacion';
import { PonentesService } from '../../servicios/ponentes.service';

// Registra un usuario existente del padrón como ponente.
@Component({
  selector: 'app-ponente-seleccion',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './seleccion.html',
  styleUrls: ['../ponentes.css', './seleccion.css']
})
export class PonenteSeleccionComponent {
  private readonly formularioBuilder = inject(NonNullableFormBuilder);
  private readonly servicio = inject(PonentesService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly usuarios = signal<UsuarioElegiblePonente[]>([]);
  readonly busqueda = signal('');
  readonly cargando = signal(true);
  readonly errorCarga = signal(false);
  readonly guardando = signal(false);
  readonly envioIntentado = signal(false);

  readonly formulario = this.formularioBuilder.group({
    usuarioId: ['', Validators.required]
  });

  readonly usuarioIdSeleccionado = toSignal(this.formulario.controls.usuarioId.valueChanges, {
    initialValue: this.formulario.controls.usuarioId.value
  });

  readonly usuarioSeleccionado = computed(() => {
    return this.usuarios().find((usuario) => String(usuario.id) === this.usuarioIdSeleccionado()) ?? null;
  });

  readonly filtrados = computed(() => {
    const termino = normalizarBusqueda(this.busqueda());

    return this.usuarios().filter((usuario) => {
      return !termino
        || normalizarBusqueda(usuario.nombre).includes(termino)
        || normalizarBusqueda(usuario.correo).includes(termino)
        || normalizarBusqueda(usuario.especialidad).includes(termino);
    });
  });

  constructor() {
    this.cargarUsuarios();
  }

  cargarUsuarios(): void {
    this.cargando.set(true);
    this.errorCarga.set(false);

    this.servicio.obtenerUsuariosElegibles().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (usuarios) => {
        this.usuarios.set(usuarios);
        if (!this.usuarioSeleccionado()) {
          this.formulario.controls.usuarioId.reset();
          this.envioIntentado.set(false);
        }

        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.usuarios.set([]);
        this.errorCarga.set(true);
        this.cargando.set(false);
        this.notificaciones.mostrar(mensajeErrorPonentes(error), 'error');
      }
    });
  }

  actualizarBusqueda(evento: Event): void {
    if (evento.target instanceof HTMLInputElement) {
      this.busqueda.set(evento.target.value);
    }
  }

  mostrarError(): boolean {
    const control = this.formulario.controls.usuarioId;

    return control.invalid && (control.touched || this.envioIntentado());
  }

  guardar(): void {
    if (this.guardando() || this.cargando() || this.errorCarga() || this.usuarios().length === 0) {
      return;
    }

    const usuario = this.usuarioSeleccionado();

    if (!usuario) {
      this.envioIntentado.set(true);
      this.formulario.markAllAsTouched();
      afterNextRender(() => {
        const raiz = this.elemento.nativeElement;
        const opcion = raiz.querySelector<HTMLInputElement>('input[type="radio"]');

        (opcion ?? raiz.querySelector<HTMLInputElement>('#buscar-usuario-ponente'))?.focus();
      }, { injector: this.injector });
      return;
    }

    this.guardando.set(true);

    this.servicio.crear(usuario.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.notificaciones.mostrar('El usuario fue registrado como ponente.');
        this.guardando.set(false);
        void this.router.navigate(['/admin/ponentes']);
      },
      error: (error: HttpErrorResponse) => {
        this.guardando.set(false);
        this.notificaciones.mostrar(mensajeErrorPonentes(error), { tipo: 'error', duracionMs: 0 });

        if (error.status === 404 || error.status === 409) {
          this.cargarUsuarios();
        }

      }
    });
  }

}
