import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, Subscription } from 'rxjs';
import { CambiosInscripcionesService } from '../../../../comunes/inscripciones/cambios-inscripciones.service';
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
  private readonly cambios = inject(CambiosInscripcionesService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cargandoEventosIniciales = signal(true);
  private readonly cargandoParticipantesIniciales = signal(true);
  private consultaEventos?: Subscription;
  private consultaParticipantes?: Subscription;
  private preseleccionarEventoOrigen = true;

  readonly eventos = signal<EventoOpcion[]>([]);
  readonly participantes = signal<ParticipanteOpcion[]>([]);
  readonly cargandoCatalogos = computed(() => this.cargandoEventosIniciales() || this.cargandoParticipantesIniciales());
  readonly guardando = signal(false);
  readonly envioIntentado = signal(false);
  readonly errorEventos = signal(false);
  readonly errorParticipantes = signal(false);
  readonly participanteSeleccionado = signal<ParticipanteOpcion | null>(null);
  readonly eventoOrigen = Number(this.ruta.snapshot.queryParamMap.get('eventoId')) || null;

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

    this.cargarEventos();
    this.cargarParticipantes();
    this.cambios.cambios.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.cargarEventos(true);
      this.cargarParticipantes(true);
    });
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

    const evento = this.eventos().find((elemento) => elemento.id === eventoId);

    if (!evento || this.eventoNoDisponible(evento)) {
      this.notificaciones.mostrar('Selecciona un evento con cupos disponibles.', 'error');
      this.cargarEventos();
      return;
    }

    this.guardando.set(true);

    this.servicio.crear({ eventoId, participanteId }).subscribe({
      next: () => {
        this.notificaciones.mostrar('La inscripción fue registrada.');
        this.guardando.set(false);
        const destino = eventoId === this.eventoOrigen
          ? ['/admin/eventos', eventoId]
          : ['/admin/inscripciones'];
        void this.router.navigate(destino);
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

  // Refresca cupos sin reemplazar una elección que sigue disponible.
  cargarEventos(enSegundoPlano = false): void {
    const cargaInicial = this.cargandoEventosIniciales();
    this.consultaEventos?.unsubscribe();
    this.cargandoEventosIniciales.set(cargaInicial);

    this.consultaEventos = this.servicio.obtenerEventos().pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.cargandoEventosIniciales.set(false))
    ).subscribe({
      next: (eventos) => {
        this.errorEventos.set(false);
        this.eventos.set(eventos);
        const control = this.formulario.controls.eventoId;
        const eventoId = Number(control.value) || (this.preseleccionarEventoOrigen ? this.eventoOrigen : null);
        const evento = eventos.find((elemento) => elemento.id === eventoId);
        this.preseleccionarEventoOrigen = false;

        if (eventoId) {
          control.setValue(evento && !this.eventoNoDisponible(evento) ? String(evento.id) : '');
        }
      },
      error: (error: HttpErrorResponse) => {
        if (!enSegundoPlano || cargaInicial || error.status === 401 || error.status === 403) {
          this.errorEventos.set(true);
          this.notificaciones.mostrar(
            `No se pudieron cargar los eventos. ${this.obtenerMensajeError(error)}`,
            'error'
          );
        }
      }
    });
  }

  cargarParticipantes(enSegundoPlano = false): void {
    const cargaInicial = this.cargandoParticipantesIniciales();
    this.consultaParticipantes?.unsubscribe();
    this.cargandoParticipantesIniciales.set(cargaInicial);

    this.consultaParticipantes = this.servicio.obtenerParticipantes().pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.cargandoParticipantesIniciales.set(false))
    ).subscribe({
      next: (participantes) => {
        this.errorParticipantes.set(false);
        this.participantes.set(participantes);
        const control = this.formulario.controls.participanteId;
        this.actualizarParticipanteSeleccionado(control.value);

        if (control.value && !this.participanteSeleccionado()) {
          control.setValue('');
        }
      },
      error: (error: HttpErrorResponse) => {
        if (!enSegundoPlano || cargaInicial || error.status === 401 || error.status === 403) {
          this.errorParticipantes.set(true);
          this.notificaciones.mostrar(
            `No se pudieron cargar los participantes. ${this.obtenerMensajeError(error)}`,
            'error'
          );
        }
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
