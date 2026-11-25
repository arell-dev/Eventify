import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { CambiosInscripcionesService } from '../../../../comunes/inscripciones/cambios-inscripciones.service';
import { NotificacionesService } from '../../../../comunes/notificaciones/notificaciones.service';
import { ConfirmacionService } from '../../componentes/confirmacion/confirmacion.service';
import { EstadoInscripcion, EventoOpcion, Inscripcion } from '../../modelos/inscripcion.model';
import { InscripcionesService } from '../../servicios/inscripciones.service';
import { formatearFechaInscripcion } from '../../utilidades/fecha';

// Coordina la consulta, filtros y acciones disponibles en la lista de inscripciones.
@Component({
  selector: 'app-inscripciones-lista',
  imports: [DecimalPipe, RouterLink],
  templateUrl: './lista.html',
  styleUrl: './lista.css'
})

export class InscripcionesListaComponent implements OnInit {
  private readonly servicio = inject(InscripcionesService);
  private readonly cambios = inject(CambiosInscripcionesService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly confirmacion = inject(ConfirmacionService);
  private consulta?: Subscription;

  readonly inscripciones = signal<Inscripcion[]>([]);
  readonly eventos = signal<EventoOpcion[]>([]);
  readonly busqueda = signal('');
  readonly filtroEvento = signal('');
  readonly filtroEstado = signal('');
  readonly cargando = signal(true);
  readonly cargandoEventos = signal(true);
  readonly errorCarga = signal(false);
  readonly errorCargaEventos = signal(false);
  readonly procesando = signal(false);
  readonly formatearFecha = formatearFechaInscripcion;

  readonly confirmadas = computed(() => {
    return this.inscripciones().filter((inscripcion) => inscripcion.estado === 'CONFIRMADA').length;
  });

  readonly canceladas = computed(() => {
    return this.inscripciones().filter((inscripcion) => inscripcion.estado === 'CANCELADA').length;
  });

  // Combina búsqueda y filtros sin alterar la lista original recibida de la API.
  readonly filtradas = computed(() => {
    const termino = this.busqueda().trim().toLocaleLowerCase('es');
    const eventoId = this.filtroEvento();
    const estado = this.filtroEstado();

    return this.inscripciones().filter((inscripcion) => {
      const coincideTexto = !termino
        || inscripcion.participanteNombre.toLocaleLowerCase('es').includes(termino)
        || inscripcion.participanteCorreo.toLocaleLowerCase('es').includes(termino)
        || inscripcion.eventoTitulo.toLocaleLowerCase('es').includes(termino);

      const coincideEvento = !eventoId || String(inscripcion.eventoId) === eventoId;
      const coincideEstado = !estado || inscripcion.estado === estado;

      return coincideTexto && coincideEvento && coincideEstado;
    });
  });

  ngOnInit(): void {
    this.cargarInscripciones();
    this.cargarEventos();
    this.cambios.cambios.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.cargarInscripciones(true));
  }

  // Carga inscripciones y catálogo de eventos por separado para conservar el listado ante fallos parciales.
  cargarInscripciones(enSegundoPlano = false): void {
    const mostrarCarga = !enSegundoPlano || this.cargando();
    this.consulta?.unsubscribe();

    if (mostrarCarga) {
      this.cargando.set(true);
      this.errorCarga.set(false);
    }

    this.consulta = this.servicio.obtenerTodas().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (inscripciones) => {
        this.inscripciones.set(inscripciones);
        this.errorCarga.set(false);
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        if (mostrarCarga || error.status === 401 || error.status === 403) {
          this.inscripciones.set([]);
          this.errorCarga.set(true);
          this.notificaciones.mostrar(this.obtenerMensajeError(error), 'error');
        }

        this.cargando.set(false);
      }
    });
  }

  // Proporciona las opciones del filtro de eventos.
  cargarEventos(): void {
    this.cargandoEventos.set(true);
    this.errorCargaEventos.set(false);

    this.servicio.obtenerEventos().subscribe({
      next: (eventos) => {
        this.eventos.set(eventos);
        this.cargandoEventos.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.eventos.set([]);
        this.errorCargaEventos.set(true);
        this.cargandoEventos.set(false);
        this.notificaciones.mostrar(
          `No se pudo cargar el filtro de eventos. ${this.obtenerMensajeError(error)}`,
          'error'
        );
      }
    });
  }

  // Confirma el cambio antes de enviar la actualización y refresca el resultado del servidor.
  async cambiarEstado(inscripcion: Inscripcion, estado: EstadoInscripcion): Promise<void> {
    if (this.procesando()) {
      return;
    }

    this.procesando.set(true);
    const accion = estado === 'CANCELADA' ? 'cancelar' : 'reactivar';
    const confirma = await this.confirmacion.solicitar(
      `¿Deseas ${accion} la inscripción de ${inscripcion.participanteNombre} para ${inscripcion.eventoTitulo}?`
    );

    if (!confirma) {
      this.procesando.set(false);
      return;
    }

    this.servicio.actualizarEstado(inscripcion.id, { estado }).subscribe({
      next: () => {
        const mensaje = estado === 'CANCELADA'
          ? 'La inscripción fue cancelada.'
          : 'La inscripción fue reactivada.';

        this.notificaciones.mostrar(mensaje);
        this.cargarInscripciones(true);
        this.procesando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.notificaciones.mostrar(this.obtenerMensajeError(error), 'error');
        this.procesando.set(false);
      }
    });
  }

  // Protege la eliminación con confirmación y permite borrar solo registros cancelados.
  async eliminar(inscripcion: Inscripcion): Promise<void> {
    if (inscripcion.estado !== 'CANCELADA' || this.procesando()) {
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
        this.cargarInscripciones(true);
        this.procesando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.notificaciones.mostrar(this.obtenerMensajeError(error), 'error');
        this.procesando.set(false);
      }
    });
  }

  // Convierte errores de conexión y de la API en mensajes comprensibles para el toast.
  private obtenerMensajeError(error: HttpErrorResponse): string {
    if (error.status === 0) {
      return 'No se pudo conectar con el servidor. Comprueba que la API esté iniciada.';
    }

    return error.error?.mensaje || 'No se pudo completar la operación.';
  }
}
