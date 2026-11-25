import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, distinctUntilChanged, filter, map, merge, of, startWith, Subject, switchMap, takeUntil } from 'rxjs';
import { ConfirmacionDialogComponent } from '../../../admin/inscripciones/componentes/confirmacion/confirmacion.component';
import { CambiosInscripcionesService } from '../../../comunes/inscripciones/cambios-inscripciones.service';
import { NotificacionesService } from '../../../comunes/notificaciones/notificaciones.service';
import { SesionService } from '../../../comunes/sesion/sesion.service';
import { CabeceraPublicaComponent } from '../../componentes/cabecera/cabecera-publica';
import { IconoCatalogoComponent } from '../../componentes/icono-catalogo';
import { EventoPublico, InscripcionPropia } from '../../modelos/catalogo.model';
import { CancelarInscripcionService } from '../../servicios/cancelar-inscripcion.service';
import { CatalogoService } from '../../servicios/catalogo.service';
import {
  enlaceEvento,
  estadoEvento,
  fechaDia,
  horarioEvento,
  nombresEstado,
  nombresModalidad,
  plataformaEvento,
  relojCatalogo,
  textoCupos
} from '../../utilidades/presentacion-evento';

type ErrorEvento = 'no-encontrado' | 'error' | null;
type ConsultaInscripcion = 'inactiva' | 'cargando' | 'lista' | 'ponente-asignado' | 'error';

interface ContextoInscripcion {
  eventoId: number;
  usuario: string;
}

const esPonenteAsignado = (error: HttpErrorResponse): boolean => {
  return error.status === 409 && error.error?.codigo === 'PONENTE_ASIGNADO';
};

@Component({
  selector: 'app-catalogo-detalle',
  imports: [ReactiveFormsModule, RouterLink, CabeceraPublicaComponent, IconoCatalogoComponent, ConfirmacionDialogComponent],
  providers: [CancelarInscripcionService],
  templateUrl: './detalle.html',
  styleUrls: ['../../componentes/catalogo-publico.css', './detalle.css']
})
export class CatalogoDetalleComponent {
  private readonly ruta = inject(ActivatedRoute);
  private readonly catalogo = inject(CatalogoService);
  private readonly sesionService = inject(SesionService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly cambios = inject(CambiosInscripcionesService);
  private readonly cancelar = inject(CancelarInscripcionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly reloj = relojCatalogo();

  private readonly recargasEvento = new Subject<void>();
  private readonly recargasInscripcion = new Subject<void>();
  private readonly registro = signal<EventoPublico | null>(null);
  private readonly tituloInscripcion = viewChild<ElementRef<HTMLHeadingElement>>('tituloInscripcion');

  private readonly eventoId = toSignal(this.ruta.paramMap.pipe(
    map((parametros) => Number(parametros.get('id'))),
    distinctUntilChanged()
  ), { requireSync: true });

  protected readonly evento = computed(() => {
    const registro = this.registro();

    return registro?.id === this.eventoId() ? registro : null;
  });

  protected readonly sesion = this.sesionService.sesion;
  protected readonly comprobandoSesion = toSignal(
    this.sesionService.comprobar().pipe(map(() => false)),
    { initialValue: true }
  );

  protected readonly estado = computed(() => {
    const evento = this.evento();

    return evento ? estadoEvento(evento, this.reloj()) : null;
  });

  protected readonly enlaceVirtual = computed(() => enlaceEvento(this.evento()?.enlace ?? ''));
  protected readonly plataformaVirtual = computed(() => plataformaEvento(this.evento()?.enlace ?? ''));
  protected readonly errorEvento = signal<ErrorEvento>(null);
  protected readonly cargandoEvento = signal(true);
  protected readonly consultaInscripcion = signal<ConsultaInscripcion>('inactiva');
  protected readonly inscripcion = signal<InscripcionPropia | null>(null);
  protected readonly procesando = signal(false);
  protected readonly cancelando = this.cancelar.eventoEnProceso;
  protected readonly puedeCancelar = computed(() => {
    const evento = this.evento();

    return Boolean(evento && this.inscripcion()?.estado === 'CONFIRMADA' && Date.parse(evento.inicio) > this.reloj());
  });
  protected readonly formulario = new FormGroup({
    confirmacion: new FormControl(true, { nonNullable: true, validators: Validators.requiredTrue })
  });

  protected readonly confirmacion = this.formulario.controls.confirmacion;

  private readonly contexto = computed<ContextoInscripcion | null>(() => {
    const evento = this.evento();
    const sesion = this.sesion();

    if (!evento || this.comprobandoSesion() || sesion?.rol !== 'USUARIO') {
      return null;
    }

    return { eventoId: evento.id, usuario: sesion.usuario };
  }, {
    equal: (anterior, actual) => anterior?.eventoId === actual?.eventoId && anterior?.usuario === actual?.usuario
  });

  private readonly cambiosContexto = toObservable(this.contexto);

  protected readonly nombresEstado = nombresEstado;
  protected readonly nombresModalidad = nombresModalidad;
  protected readonly fechaDia = fechaDia;
  protected readonly horarioEvento = horarioEvento;
  protected readonly textoCupos = textoCupos;

  constructor() {
    this.observarEvento();
    this.observarInscripcion();
  }

  protected cargarEvento(): void {
    this.recargasEvento.next();
  }

  protected cargarInscripcion(): void {
    this.recargasInscripcion.next();
  }

  protected confirmarInscripcion(): void {
    const contexto = this.contexto();
    const evento = this.evento();

    if (!contexto || !evento || this.confirmacion.invalid || this.procesando() || this.cancelando() !== null
      || this.cargandoEvento() || this.errorEvento() || this.consultaInscripcion() !== 'lista'
      || this.inscripcion()?.estado === 'CONFIRMADA' || estadoEvento(evento, Date.now()) !== 'PROXIMO') {
      return;
    }

    this.procesando.set(true);

    this.catalogo.confirmarInscripcion(contexto.eventoId).pipe(
      takeUntil(this.cambiosContexto.pipe(filter((actual) => actual !== contexto))),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (inscripcion) => {
        this.inscripcion.set(inscripcion);
        this.procesando.set(false);
        this.notificaciones.mostrar('Tu inscripción fue confirmada.');
        this.cargarEvento();
        this.cargarInscripcion();
      },
      error: (error: HttpErrorResponse) => {
        this.procesando.set(false);

        // La asignación pudo cambiar desde la consulta inicial de la inscripción.
        if (esPonenteAsignado(error)) {
          this.inscripcion.set(null);
          this.consultaInscripcion.set('ponente-asignado');
          this.cargarEvento();
          return;
        }

        this.notificaciones.mostrar(error.error?.mensaje || 'No se pudo registrar la inscripción.', 'error');

        if (error.status === 401) {
          this.sesion.set(null);
        } else if (error.status === 409) {
          this.cargarEvento();
          this.cargarInscripcion();
        }
      }
    });
  }

  protected async cancelarInscripcion(origen: HTMLButtonElement): Promise<void> {
    const contexto = this.contexto();
    const evento = this.evento();

    if (!contexto || !evento || !this.puedeCancelar() || this.procesando()) {
      return;
    }

    const recargar = () => {
      this.cargarEvento();
      this.cargarInscripcion();
    };
    const cancelacion = await this.cancelar.solicitar(evento, () => this.contexto() === contexto, recargar);

    if (!cancelacion || this.contexto() !== contexto) {
      return;
    }

    const documento = origen.ownerDocument;

    if (documento.activeElement === origen || (documento.activeElement === documento.body && !origen.isConnected)) {
      this.tituloInscripcion()?.nativeElement.focus();
    }

    this.inscripcion.set({ estado: cancelacion.estado });
    this.registro.update((registro) => registro ? { ...registro, cuposDisponibles: cancelacion.cuposDisponibles } : null);
    recargar();
  }

  // Al cambiar de evento se descartan las consultas anteriores.
  private observarEvento(): void {
    toObservable(this.eventoId).pipe(
      switchMap((eventoId) => {
        this.registro.set(null);

        if (!Number.isSafeInteger(eventoId) || eventoId < 1) {
          this.errorEvento.set('no-encontrado');
          this.cargandoEvento.set(false);

          return of(null);
        }

        return merge(this.recargasEvento, this.cambios.cambios).pipe(
          startWith(undefined),
          switchMap(() => {
            this.cargandoEvento.set(!this.registro());
            this.errorEvento.set(null);

            return this.catalogo.obtener(eventoId).pipe(catchError((error: HttpErrorResponse) => {
              const encontrado = error.status !== 404;

              if (!encontrado) {
                this.registro.set(null);
              }

              if (!encontrado || !this.registro()) {
                this.errorEvento.set(encontrado ? 'error' : 'no-encontrado');
              }

              return of(this.registro());
            }));
          })
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((evento) => {
      this.registro.set(evento);
      this.cargandoEvento.set(false);
    });
  }

  private observarInscripcion(): void {
    this.cambiosContexto.pipe(
      switchMap((contexto) => {
        this.confirmacion.reset(true);
        this.inscripcion.set(null);
        this.procesando.set(false);
        this.consultaInscripcion.set(contexto ? 'cargando' : 'inactiva');

        if (!contexto) {
          return of(null);
        }

        return merge(this.recargasInscripcion, this.cambios.cambios).pipe(
          startWith(undefined),
          switchMap(() => {
            const consultaAnterior = this.consultaInscripcion();

            if (consultaAnterior !== 'lista' && consultaAnterior !== 'ponente-asignado') {
              this.consultaInscripcion.set('cargando');
            }

            return this.catalogo.consultarInscripcion(contexto.eventoId).pipe(
              map((inscripcion) => {
                this.consultaInscripcion.set('lista');

                return inscripcion;
              }),
              catchError((error: HttpErrorResponse) => {
                if (error.status !== 401 && !esPonenteAsignado(error)
                  && (consultaAnterior === 'lista' || consultaAnterior === 'ponente-asignado')) {
                  return of(this.inscripcion());
                }

                this.consultaInscripcion.set(esPonenteAsignado(error) ? 'ponente-asignado' : 'error');

                if (error.status === 401) {
                  this.sesion.set(null);
                }

                return of(null);
              })
            );
          })
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((inscripcion) => this.inscripcion.set(inscripcion));
  }
}
