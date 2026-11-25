import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { CambiosInscripcionesService } from '../../../../comunes/inscripciones/cambios-inscripciones.service';
import { NotificacionesService } from '../../../../comunes/notificaciones/notificaciones.service';
import { ConfirmacionService } from '../../componentes/confirmacion/confirmacion.service';
import { Inscripcion } from '../../modelos/inscripcion.model';
import { InscripcionesService } from '../../servicios/inscripciones.service';
import { formatearFechaInscripcion } from '../../utilidades/fecha';

// Presenta la inscripción y permite su eliminación cuando está cancelada.
@Component({
  selector: 'app-inscripcion-detalle',
  imports: [RouterLink],
  templateUrl: './detalle.html',
  styleUrl: './detalle.css'
})

export class InscripcionDetalleComponent implements OnInit {
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly servicio = inject(InscripcionesService);
  private readonly cambios = inject(CambiosInscripcionesService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly confirmacion = inject(ConfirmacionService);
  private readonly destroyRef = inject(DestroyRef);
  private consulta?: Subscription;

  readonly inscripcion = signal<Inscripcion | null>(null);
  readonly cargando = signal(true);
  readonly procesando = signal(false);
  readonly formatearFecha = formatearFechaInscripcion;

  ngOnInit(): void {
    // Valida el parámetro de ruta antes de consultar la API.
    this.ruta.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((parametros) => {
      const id = Number(parametros.get('id'));

      if (!Number.isInteger(id) || id <= 0) {
        this.consulta?.unsubscribe();
        this.inscripcion.set(null);
        this.cargando.set(false);
        this.notificaciones.mostrar('El identificador de inscripción no es válido.', 'error');
        return;
      }

      this.cargarInscripcion(id);
    });

    this.cambios.cambios.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      const id = Number(this.ruta.snapshot.paramMap.get('id'));

      if (Number.isSafeInteger(id) && id > 0) {
        this.cargarInscripcion(id, true);
      }
    });
  }

  // Solo permite eliminar tras confirmar que el registro ya está cancelado.
  async eliminar(): Promise<void> {
    const inscripcion = this.inscripcion();

    if (!inscripcion || inscripcion.estado !== 'CANCELADA' || this.procesando()) {
      return;
    }

    this.procesando.set(true);
    const confirma = await this.confirmacion.solicitar(
      `¿Deseas eliminar la inscripción cancelada de ${inscripcion.participanteNombre} para ${inscripcion.eventoTitulo}? Esta acción no se puede deshacer.`
    );

    if (!confirma) {
      this.procesando.set(false);
      return;
    }

    this.servicio.eliminar(inscripcion.id).subscribe({
      next: () => {
        this.notificaciones.mostrar('La inscripción fue eliminada.');
        this.procesando.set(false);
        void this.router.navigate(['/admin/inscripciones']);
      },
      error: (error: HttpErrorResponse) => {
        this.notificaciones.mostrar(this.obtenerMensajeError(error), 'error');
        this.procesando.set(false);
      }
    });
  }

  // Solicita una representación completa para mostrar la inscripción y sus relaciones.
  cargarInscripcion(id: number, enSegundoPlano = false): void {
    const mostrarCarga = !enSegundoPlano || this.cargando();
    this.consulta?.unsubscribe();

    if (mostrarCarga) {
      this.cargando.set(true);
      this.inscripcion.set(null);
    }

    this.consulta = this.servicio.obtenerPorId(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (inscripcion) => {
        this.inscripcion.set(inscripcion);
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        if (mostrarCarga || error.status === 401 || error.status === 403 || error.status === 404) {
          this.inscripcion.set(null);
          this.notificaciones.mostrar(this.obtenerMensajeError(error), 'error');
        }

        this.cargando.set(false);
      }
    });
  }

  // Reintenta la carga usando el ID vigente de la ruta.
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
