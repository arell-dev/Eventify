import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NotificacionesService } from '../../../../comunes/notificaciones/notificaciones.service';
import { EventoOpcion, ParticipanteOpcion } from '../../modelos/inscripcion.model';
import { InscripcionesService } from '../../servicios/inscripciones.service';

// Registra una inscripción después de validar sus referencias y catálogos.
@Component({
  selector: 'app-inscripcion-formulario',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './formulario.html',
  styleUrl: './formulario.css'
})

export class InscripcionFormularioComponent implements OnInit {
  private readonly formularioBuilder = inject(NonNullableFormBuilder);
  private readonly servicio = inject(InscripcionesService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly eventos = signal<EventoOpcion[]>([]);
  readonly participantes = signal<ParticipanteOpcion[]>([]);
  readonly cargandoCatalogos = signal(true);
  readonly guardando = signal(false);
  readonly envioIntentado = signal(false);
  readonly errorEventos = signal(false);
  readonly errorParticipantes = signal(false);
  readonly participanteSeleccionado = signal<ParticipanteOpcion | null>(null);

  readonly formulario = this.formularioBuilder.group({
    eventoId: ['', [Validators.required]],
    participanteId: ['', [Validators.required]]
  });

  ngOnInit(): void {
    this.formulario.controls.participanteId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((valor) => {
        this.actualizarParticipanteSeleccionado(valor);
      });

    this.cargarCatalogos();
  }

  // Valida los catálogos y el formulario antes de crear la inscripción.
  guardar(): void {
    if (this.formulario.invalid) {
      this.envioIntentado.set(true);
      this.formulario.markAllAsTouched();
      const primerCampoInvalido = this.formulario.controls.eventoId.invalid
        ? 'eventoId'
        : 'participanteId';
      document.getElementById(primerCampoInvalido)?.focus();
      return;
    }

    if (
      this.guardando() || this.errorEventos() || this.errorParticipantes() || !this.hayEventosDisponibles()
    ) {
      return;
    }

    const eventoId = Number(this.formulario.controls.eventoId.value);
    const participanteId = Number(this.formulario.controls.participanteId.value);

    if (!Number.isInteger(eventoId) || !Number.isInteger(participanteId)) {
      this.notificaciones.mostrar('Selecciona un evento y un participante válidos.', 'error');
      return;
    }

    this.guardando.set(true);

    this.servicio.crear({ eventoId, participanteId }).subscribe({
      next: () => {
        this.notificaciones.mostrar('La inscripción fue registrada.');
        this.guardando.set(false);
        void this.router.navigate(['/admin/inscripciones']);
      },
      error: (error: HttpErrorResponse) => {
        this.notificaciones.mostrar(this.obtenerMensajeError(error), 'error');

        if (error.status === 409) {
          this.cargarEventos();
        }

        this.guardando.set(false);
      }
    });
  }

  // Carga ambos catálogos y conserva el estado de error de cada uno por separado.
  cargarCatalogos(): void {
    this.cargandoCatalogos.set(true);
    this.errorEventos.set(false);
    this.errorParticipantes.set(false);

    forkJoin({
      eventos: this.servicio.obtenerEventos().pipe(
        catchError((error: HttpErrorResponse) => {
          this.errorEventos.set(true);
          this.notificaciones.mostrar(
            `No se pudieron cargar los eventos. ${this.obtenerMensajeError(error)}`,
            'error'
          );

          return of(null);
        })
      ),
      participantes: this.servicio.obtenerParticipantes().pipe(
        catchError((error: HttpErrorResponse) => {
          this.errorParticipantes.set(true);
          this.notificaciones.mostrar(
            `No se pudieron cargar los participantes. ${this.obtenerMensajeError(error)}`,
            'error'
          );

          return of(null);
        })
      )
    }).subscribe(({ eventos, participantes }) => {
      if (eventos) {
        this.eventos.set(eventos);
      }

      if (participantes) {
        this.participantes.set(participantes);
        this.actualizarParticipanteSeleccionado(this.formulario.controls.participanteId.value);
      }

      this.cargandoCatalogos.set(false);
    });
  }

  cargarEventos(): void {
    this.errorEventos.set(false);

    this.servicio.obtenerEventos().subscribe({
      next: (eventos) => {
        this.eventos.set(eventos);
      },
      error: (error: HttpErrorResponse) => {
        this.errorEventos.set(true);
        this.notificaciones.mostrar(
          `No se pudieron cargar los eventos. ${this.obtenerMensajeError(error)}`,
          'error'
        );
      }
    });
  }

  cargarParticipantes(): void {
    this.errorParticipantes.set(false);

    this.servicio.obtenerParticipantes().subscribe({
      next: (participantes) => {
        this.participantes.set(participantes);
        this.actualizarParticipanteSeleccionado(this.formulario.controls.participanteId.value);
      },
      error: (error: HttpErrorResponse) => {
        this.errorParticipantes.set(true);
        this.notificaciones.mostrar(
          `No se pudieron cargar los participantes. ${this.obtenerMensajeError(error)}`,
          'error'
        );
      }
    });
  }

  hayEventosDisponibles(): boolean {
    return this.eventos().some((evento) => !this.eventoNoDisponible(evento));
  }

  // Un evento deja de aceptar inscripciones si ya comenzó o agotó sus cupos.
  eventoNoDisponible(evento: EventoOpcion): boolean {
    const inicio = new Date(evento.inicio).getTime();

    return evento.cuposDisponibles <= 0 || !Number.isFinite(inicio) || inicio <= Date.now();
  }

  mostrarError(campo: 'eventoId' | 'participanteId'): boolean {
    const control = this.formulario.controls[campo];

    return control.invalid && (control.touched || this.envioIntentado());
  }

  private actualizarParticipanteSeleccionado(valor: string): void {
    const participanteId = Number(valor);
    const participante = this.participantes().find((elemento) => elemento.id === participanteId) || null;

    this.participanteSeleccionado.set(participante);
  }

  // Unifica fallos de red y mensajes de negocio de la API.
  private obtenerMensajeError(error: HttpErrorResponse): string {
    if (error.status === 0) {
      return 'No se pudo conectar con el servidor. Comprueba que la API esté iniciada.';
    }

    return error.error?.mensaje || 'No se pudo completar la operación.';
  }
}
