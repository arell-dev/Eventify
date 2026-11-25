import { HttpErrorResponse } from '@angular/common/http';
import { afterNextRender, Component, DestroyRef, ElementRef, inject, Injector, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, ValidatorFn } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NotificacionesService } from '../../../../comunes/notificaciones/notificaciones.service';
import { DatosEdicionPonente, Ponente } from '../../modelos/ponente.model';
import { mensajeErrorPonentes } from '../../modelos/ponentes-presentacion';
import { PonentesService } from '../../servicios/ponentes.service';

const textoObligatorio: ValidatorFn = (control) => control.value.trim() ? null : { required: true };

const correoValido: ValidatorFn = (control) => {
  const correo: string = control.value.trim();

  return !correo || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) ? null : { email: true };
};

const mensajesObligatorios: Record<keyof DatosEdicionPonente, string> = {
  nombre: 'Ingresa el nombre del ponente.',
  correo: 'Ingresa el correo del ponente.',
  especialidad: 'Ingresa la especialidad del ponente.'
};

// Edita los datos propios del ponente sin cambiar su usuarioId.
@Component({
  selector: 'app-ponente-edicion',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './edicion.html',
  styleUrls: ['../ponentes.css', './edicion.css']
})
export class PonenteEdicionComponent implements OnInit {
  private readonly formularioBuilder = inject(NonNullableFormBuilder);
  private readonly servicio = inject(PonentesService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly ponente = signal<Ponente | null>(null);
  readonly cargando = signal(true);
  readonly errorCarga = signal('');
  readonly puedeReintentar = signal(false);
  readonly guardando = signal(false);
  readonly envioIntentado = signal(false);
  readonly idPonente = signal(0);

  readonly formulario = this.formularioBuilder.group({
    nombre: ['', textoObligatorio],
    correo: ['', [textoObligatorio, correoValido]],
    especialidad: ['', textoObligatorio]
  });

  ngOnInit(): void {
    const id = Number(this.ruta.snapshot.paramMap.get('id'));

    if (!Number.isSafeInteger(id) || id < 1) {
      this.errorCarga.set('El identificador del ponente no es válido.');
      this.cargando.set(false);
      return;
    }

    this.idPonente.set(id);
    this.cargarPonente();
  }

  cargarPonente(): void {
    this.cargando.set(true);
    this.errorCarga.set('');

    this.servicio.obtenerPorId(this.idPonente()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (ponente) => {
        this.ponente.set(ponente);
        this.formulario.reset({
          nombre: ponente.nombre,
          correo: ponente.correo,
          especialidad: ponente.especialidad
        });
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.ponente.set(null);
        this.errorCarga.set(mensajeErrorPonentes(error));
        this.puedeReintentar.set(error.status === 0 || error.status >= 500);
        this.cargando.set(false);
      }
    });
  }

  errorCampo(campo: keyof DatosEdicionPonente): string {
    const control = this.formulario.controls[campo];

    if (control.hasError('servidor')) {
      return control.getError('servidor');
    }

    if (control.hasError('required') && (control.touched || this.envioIntentado())) {
      return mensajesObligatorios[campo];
    }

    if (control.hasError('email') && (control.dirty || control.touched || this.envioIntentado())) {
      return 'Ingresa un correo electrónico válido.';
    }

    return '';
  }

  guardar(): void {
    if (this.guardando() || this.cargando() || this.errorCarga() || !this.ponente()) {
      return;
    }

    if (this.formulario.invalid) {
      this.envioIntentado.set(true);
      this.formulario.markAllAsTouched();
      this.enfocarPrimerCampoInvalido();
      return;
    }

    const valores = this.formulario.getRawValue();
    const datos: DatosEdicionPonente = {
      nombre: valores.nombre.trim(),
      correo: valores.correo.trim(),
      especialidad: valores.especialidad.trim()
    };

    this.guardando.set(true);

    this.servicio.actualizar(this.idPonente(), datos).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.notificaciones.mostrar('Los datos del ponente fueron actualizados.');
        this.guardando.set(false);
        void this.router.navigate(['/admin/ponentes', this.idPonente()]);
      },
      error: (error: HttpErrorResponse) => {
        const mensaje = mensajeErrorPonentes(error);

        this.guardando.set(false);

        if (error.status === 409) {
          this.formulario.controls.correo.setErrors({ servidor: mensaje });
          this.enfocarPrimerCampoInvalido();
          return;
        }

        this.notificaciones.mostrar(mensaje, { tipo: 'error', duracionMs: 0 });
      }
    });
  }

  private enfocarPrimerCampoInvalido(): void {
    const campos: (keyof DatosEdicionPonente)[] = ['nombre', 'correo', 'especialidad'];
    const primerCampoInvalido = campos.find((campo) => this.formulario.controls[campo].invalid);

    if (primerCampoInvalido) {
      afterNextRender(() => {
        this.elemento.nativeElement.querySelector<HTMLInputElement>(`#${primerCampoInvalido}`)?.focus();
      }, { injector: this.injector });
    }
  }

}
