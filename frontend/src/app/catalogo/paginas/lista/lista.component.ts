import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, map, merge, of, startWith, Subject, switchMap } from 'rxjs';
import { ConfirmacionDialogComponent } from '../../../admin/inscripciones/componentes/confirmacion/confirmacion.component';
import { CambiosInscripcionesService } from '../../../comunes/inscripciones/cambios-inscripciones.service';
import { SesionService } from '../../../comunes/sesion/sesion.service';
import { CabeceraPublicaComponent } from '../../componentes/cabecera/cabecera-publica';
import { IconoCatalogoComponent } from '../../componentes/icono-catalogo';
import { EstadoEvento, EventoPublico, Modalidad } from '../../modelos/catalogo.model';
import { CancelarInscripcionService } from '../../servicios/cancelar-inscripcion.service';
import { CatalogoService } from '../../servicios/catalogo.service';
import {
  estadoEvento,
  fechaDia,
  horarioEvento,
  nombresEstado,
  nombresModalidad,
  relojCatalogo,
  textoCupos,
  ubicacionEvento
} from '../../utilidades/presentacion-evento';

interface ResultadoListado {
  estado: 'cargando' | 'error' | 'listo';
  eventos: EventoPublico[];
}

interface MisInscripciones {
  usuarioId: number;
  eventoIds: ReadonlySet<number>;
}

const normalizarBusqueda = (texto: string): string => {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('es').trim();
};

@Component({
  selector: 'app-catalogo-lista',
  imports: [ReactiveFormsModule, RouterLink, CabeceraPublicaComponent, IconoCatalogoComponent, ConfirmacionDialogComponent],
  providers: [CancelarInscripcionService],
  templateUrl: './lista.html',
  styleUrls: ['../../componentes/catalogo-publico.css', './lista.css']
})
export class CatalogoListaComponent {
  private readonly catalogo = inject(CatalogoService);
  private readonly sesion = inject(SesionService);
  private readonly cambios = inject(CambiosInscripcionesService);
  private readonly cancelar = inject(CancelarInscripcionService);
  private readonly reloj = relojCatalogo();
  private readonly recargas = new Subject<void>();
  private readonly actualizaciones = merge(this.recargas, this.cambios.cambios).pipe(startWith(undefined));
  private readonly misInscripciones = signal<MisInscripciones | null>(null);
  private readonly usuarioId = computed(() => {
    const sesion = this.sesion.sesion();

    return sesion?.rol === 'USUARIO' ? sesion.perfil?.id ?? null : null;
  });
  private readonly tituloInscripciones = viewChild<ElementRef<HTMLHeadingElement>>('tituloInscripciones');

  protected readonly filtros = new FormGroup({
    busqueda: new FormControl('', { nonNullable: true }),
    modalidad: new FormControl<Modalidad | ''>('', { nonNullable: true }),
    estado: new FormControl<EstadoEvento | ''>('', { nonNullable: true })
  });

  private readonly valoresFiltro = toSignal(
    this.filtros.valueChanges.pipe(map(() => this.filtros.getRawValue())),
    { initialValue: this.filtros.getRawValue() }
  );

  protected readonly comprobandoSesion = toSignal(
    this.sesion.comprobar().pipe(map(() => false)),
    { initialValue: true }
  );

  protected readonly resultado = signal<ResultadoListado>({ estado: 'cargando', eventos: [] });
  protected readonly errorInscripciones = signal(false);
  protected readonly consultandoInscripciones = computed(() => {
    const usuarioId = this.usuarioId();

    return usuarioId !== null && !this.errorInscripciones() && this.misInscripciones()?.usuarioId !== usuarioId;
  });
  protected readonly eventoEnProceso = this.cancelar.eventoEnProceso;

  protected readonly tarjetas = computed(() => {
    const { busqueda, modalidad, estado } = this.valoresFiltro();
    const termino = normalizarBusqueda(busqueda);
    const ahora = this.reloj();

    return this.resultado().eventos
      .map((evento) => ({ evento, estado: estadoEvento(evento, ahora), cancelable: Date.parse(evento.inicio) > ahora }))
      .filter((tarjeta) => {
        const { titulo, descripcion, nombrePonente } = tarjeta.evento;
        const texto = normalizarBusqueda(`${titulo} ${descripcion} ${nombrePonente}`);

        return texto.includes(termino)
          && (!modalidad || tarjeta.evento.modalidad === modalidad)
          && (!estado || tarjeta.estado === estado);
      });
  });

  protected readonly grupos = computed(() => {
    const tarjetas = this.tarjetas();
    const misInscripciones = this.misInscripciones();

    if (!misInscripciones || misInscripciones.usuarioId !== this.usuarioId()) {
      return [{ titulo: 'Eventos', tarjetas, personal: false, mostrarTitulo: false }];
    }

    return [
      { titulo: 'Mis inscripciones', tarjetas: tarjetas.filter(({ evento }) => misInscripciones.eventoIds.has(evento.id)), personal: true, mostrarTitulo: true },
      { titulo: 'Otros eventos', tarjetas: tarjetas.filter(({ evento }) => !misInscripciones.eventoIds.has(evento.id)), personal: false, mostrarTitulo: true }
    ];
  });

  protected readonly nombresEstado = nombresEstado;
  protected readonly nombresModalidad = nombresModalidad;
  protected readonly fechaDia = fechaDia;
  protected readonly horarioEvento = horarioEvento;
  protected readonly ubicacionEvento = ubicacionEvento;
  protected readonly textoCupos = textoCupos;

  constructor() {
    this.actualizaciones.pipe(
      switchMap(() => this.catalogo.listar().pipe(catchError(() => of(null)))),
      takeUntilDestroyed()
    ).subscribe((eventos) => {
      if (eventos) {
        this.resultado.set({ estado: 'listo', eventos });
      } else if (this.resultado().estado !== 'listo') {
        this.resultado.set({ estado: 'error', eventos: [] });
      }
    });

    toObservable(this.usuarioId).pipe(
      switchMap((usuarioId) => {
        this.misInscripciones.set(null);
        this.errorInscripciones.set(false);

        if (!usuarioId) {
          return of(null);
        }

        return this.actualizaciones.pipe(
          switchMap(() => this.catalogo.listarMisInscripciones().pipe(
            map(({ eventoIds }) => ({ usuarioId, eventoIds: new Set(eventoIds) })),
            catchError((error: HttpErrorResponse) => {
              if (this.usuarioId() === usuarioId) {
                if (error.status === 401) {
                  this.sesion.sesion.set(null);
                } else {
                  this.errorInscripciones.set(true);
                }
              }

              return of(null);
            })
          ))
        );
      }),
      takeUntilDestroyed()
    ).subscribe((inscripciones) => {
      if (inscripciones && this.usuarioId() === inscripciones.usuarioId) {
        this.errorInscripciones.set(false);
        this.misInscripciones.set(inscripciones);
      }
    });
  }

  protected cargar(): void {
    if (this.resultado().estado === 'error') {
      this.resultado.set({ estado: 'cargando', eventos: [] });
    }

    this.recargas.next();
  }

  protected async cancelarInscripcion(evento: EventoPublico, origen: HTMLButtonElement): Promise<void> {
    const usuarioId = this.usuarioId();
    const cancelacion = await this.cancelar.solicitar(evento, () => this.usuarioId() === usuarioId, () => this.cargar());

    if (!cancelacion || this.usuarioId() !== usuarioId) {
      return;
    }

    // El botón desaparece al mover la tarjeta. Conserva el foco dentro del listado.
    const documento = origen.ownerDocument;

    if (documento.activeElement === origen || (documento.activeElement === documento.body && !origen.isConnected)) {
      this.tituloInscripciones()?.nativeElement.focus();
    }

    const inscripciones = this.misInscripciones();

    if (inscripciones && inscripciones.usuarioId === usuarioId) {
      const eventoIds = new Set(inscripciones.eventoIds);
      eventoIds.delete(evento.id);
      this.misInscripciones.set({ ...inscripciones, eventoIds });
    }

    this.resultado.update((resultado) => ({
      ...resultado,
      eventos: resultado.eventos.map((registro) => registro.id === evento.id
        ? { ...registro, cuposDisponibles: cancelacion.cuposDisponibles }
        : registro)
    }));
    this.cargar();
  }
}
