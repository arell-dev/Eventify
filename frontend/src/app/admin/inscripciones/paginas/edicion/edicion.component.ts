import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NotificacionesService } from '../../../../comunes/notificaciones/notificaciones.service';
import { ConfirmacionService } from '../../componentes/confirmacion/confirmacion.service';
import { EstadoInscripcion, Inscripcion } from '../../modelos/inscripcion.model';
import { InscripcionesService } from '../../servicios/inscripciones.service';
import { formatearFechaInscripcion } from '../../utilidades/fecha';

// Cambia el estado de una inscripción con confirmación antes de persistirlo.
@Component({
  selector: 'app-inscripcion-edicion',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './edicion.html',
  styleUrl: './edicion.css'
})

export class InscripcionEdicionComponent implements OnInit {
  private readonly formularioBuilder = inject(NonNullableFormBuilder);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly servicio = inject(InscripcionesService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly confirmacion = inject(ConfirmacionService);
  private readonly destroyRef = inject(DestroyRef);

  readonly inscripcion = signal<Inscripcion | null>(null);
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly formatearFecha = formatearFechaInscripcion;

  readonly formulario = this.formularioBuilder.group({
    estado: ['CONFIRMADA' as EstadoInscripcion, [Validators.required]]
  });

  ngOnInit(): void {
    // Valida el identificador antes de cargar el estado que se puede editar.
    this.ruta.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((parametros) => {
      const id = Number(parametros.get('id'));

      if (!Number.isInteger(id) || id <= 0) {
        this.cargando.set(false);
        this.notificaciones.mostrar('El identificador de inscripción no es válido.', 'error');
        return;
      }

      this.cargarInscripcion(id);
    });
  }

  // Pide confirmación solo si el usuario solicita cambiar el estado actual.
  async guardar(): Promise<void> {
    const inscripcion = this.inscripcion();

    if (!inscripcion || this.guardando()) {
      return;
    }

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      document.getElementById('estado')?.focus();
      return;
    }

    const estado = this.formulario.controls.estado.value;

    if (estado !== inscripcion.estado) {
      this.guardando.set(true);
      const accion = estado === 'CANCELADA' ? 'cancelar' : 'reactivar';
      const confirma = await this.confirmacion.solicitar(
        `¿Deseas ${accion} la inscripción de ${inscripcion.participanteNombre} para ${inscripcion.eventoTitulo}?`
      );

      if (!confirma) {
        this.guardando.set(false);
        return;
      }
    } else {
      this.guardando.set(true);
    }

    this.servicio.actualizarEstado(inscripcion.id, { estado }).subscribe({
      next: () => {
        this.notificaciones.mostrar(`El estado de la inscripción se cambió a ${estado.toLocaleLowerCase('es')}.`);
        this.guardando.set(false);
        void this.router.navigate(['/admin/inscripciones', inscripcion.id]);
      },
      error: (error: HttpErrorResponse) => {
        this.notificaciones.mostrar(this.obtenerMensajeError(error), 'error');
        this.guardando.set(false);
      }
    });
  }

  mostrarError(): boolean {
    const control = this.formulario.controls.estado;

    return control.invalid && (control.touched || control.dirty);
  }

  // Carga el registro y sincroniza su estado con el formulario reactivo.
  cargarInscripcion(id: number): void {
    this.cargando.set(true);
    this.inscripcion.set(null);

    this.servicio.obtenerPorId(id).subscribe({
      next: (inscripcion) => {
        this.inscripcion.set(inscripcion);
        this.formulario.controls.estado.setValue(inscripcion.estado);
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.notificaciones.mostrar(this.obtenerMensajeError(error), 'error');
        this.cargando.set(false);
      }
    });
  }

  // Repite la consulta para el ID presente en la ruta.
  reintentar(): void {
    const id = Number(this.ruta.snapshot.paramMap.get('id'));

    if (Number.isInteger(id) && id > 0) {
      this.cargarInscripcion(id);
      return;
    }

    this.notificaciones.mostrar('El identificador de inscripción no es válido.', 'error');
  }

  // Presenta de forma consistente errores de conectividad y respuestas de la API.
  private obtenerMensajeError(error: HttpErrorResponse): string {
    if (error.status === 0) {
      return 'No se pudo conectar con el servidor. Comprueba que la API esté iniciada.';
    }

    return error.error?.mensaje || 'No se pudo completar la operación.';
  }
}
