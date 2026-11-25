import { Component, DestroyRef, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize, forkJoin, Subscription } from 'rxjs';
import { CambiosInscripcionesService } from '../../../../comunes/inscripciones/cambios-inscripciones.service';
import { NotificacionesService } from '../../../../comunes/notificaciones/notificaciones.service';
import { ConfirmacionService } from '../../../inscripciones/componentes/confirmacion/confirmacion.service';
import { IndicadoresEventosComponent } from '../../componentes/indicadores/indicadores.component';
import { TablaEventosComponent } from '../../componentes/tabla-eventos/tabla-eventos.component';
import { Evento } from '../../modelos/evento.model';
import { EventosService } from '../../servicios/eventos.service';
import { etiquetaTipo, mensajeApi } from '../../utilidades/presentacion';

// Coordina la carga, los filtros y el borrado de eventos.
@Component({
  selector: 'app-eventos-lista',
  imports: [RouterLink, IndicadoresEventosComponent, TablaEventosComponent],
  templateUrl: './lista.html',
  styleUrls: ['../../eventos.css', './lista.css']
})

export class EventosListaComponent implements OnInit {
  private readonly servicio = inject(EventosService);
  private readonly cambios = inject(CambiosInscripcionesService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly confirmacion = inject(ConfirmacionService);
  private readonly destruir = inject(DestroyRef);
  private readonly nuevoEvento = viewChild<ElementRef<HTMLAnchorElement>>('nuevoEvento');
  private readonly ahora = signal(Date.now());
  private consulta?: Subscription;

  protected readonly eventos = signal<Evento[]>([]);
  protected readonly nombresPonentes = signal<ReadonlyMap<number, string>>(new Map());
  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly eliminando = signal(false);
  protected readonly busqueda = signal('');
  protected readonly tipoSeleccionado = signal('');

  protected readonly tipos = computed(() => {
    const tiposUnicos = new Map(this.eventos().map((evento) => [
      evento.tipo.toLocaleUpperCase('es'),
      etiquetaTipo(evento.tipo)
    ]));

    return [...tiposUnicos].sort((primerTipo, segundoTipo) => primerTipo[1].localeCompare(segundoTipo[1], 'es'));
  });

  protected readonly eventosFiltrados = computed(() => {
    const busqueda = this.busqueda().trim().toLocaleLowerCase('es');
    const tipo = this.tipoSeleccionado();

    return this.eventos().filter((evento) => {
      const coincideTitulo = evento.titulo.toLocaleLowerCase('es').includes(busqueda);
      const coincideTipo = !tipo || evento.tipo.toLocaleUpperCase('es') === tipo;

      return coincideTitulo && coincideTipo;
    });
  });

  protected readonly indicadores = computed(() => {
    const eventos = this.eventos();
    const futuros = eventos.filter((evento) => Date.parse(evento.inicio) > this.ahora());
    const ocupacionAcumulada = eventos.reduce(
      (suma, evento) => suma + evento.inscripcionesConfirmadas / evento.cupo,
      0
    );

    return {
      proximos: futuros.length,
      ocupacion: eventos.length ? Math.round(100 * ocupacionAcumulada / eventos.length) : 0,
      disponibles: futuros.reduce((suma, evento) => suma + evento.cuposDisponibles, 0)
    };
  });

  ngOnInit(): void {
    this.destruir.onDestroy(() => this.confirmacion.resolverSolicitud(false));
    this.cargar();
    this.cambios.cambios.pipe(takeUntilDestroyed(this.destruir)).subscribe(() => this.cargar(true));
  }

  protected cargar(enSegundoPlano = false): void {
    const mostrarCarga = !enSegundoPlano || this.cargando();
    this.consulta?.unsubscribe();

    if (mostrarCarga) {
      this.cargando.set(true);
      this.error.set('');
    }

    this.consulta = forkJoin({ eventos: this.servicio.listar(), ponentes: this.servicio.listarPonentes() })
      .pipe(takeUntilDestroyed(this.destruir), finalize(() => this.cargando.set(false)))
      .subscribe({
        next: ({ eventos, ponentes }) => {
          this.error.set('');
          this.ahora.set(Date.now());
          this.eventos.set(eventos);
          this.nombresPonentes.set(new Map(ponentes.map((ponente) => [ponente.id, ponente.nombre])));
        },
        error: (error) => {
          if (mostrarCarga || error.status === 401 || error.status === 403) {
            this.error.set(mensajeApi(error, 'No se pudieron cargar los eventos.'));
          }
        }
      });
  }

  protected async solicitarEliminar(evento: Evento): Promise<void> {
    if (this.eliminando()) {
      return;
    }

    this.eliminando.set(true);
    const confirmada = await this.confirmacion.solicitar(`¿Deseas eliminar el evento «${evento.titulo}»?`);

    if (!confirmada || this.destruir.destroyed) {
      this.eliminando.set(false);
      return;
    }

    this.servicio.eliminar(evento.id)
      .pipe(takeUntilDestroyed(this.destruir), finalize(() => this.eliminando.set(false)))
      .subscribe({
        next: () => {
          this.nuevoEvento()?.nativeElement.focus();
          this.eventos.update((eventos) => eventos.filter((registro) => registro.id !== evento.id));
          this.ahora.set(Date.now());

          if (!this.tipos().some(([tipo]) => tipo === this.tipoSeleccionado())) {
            this.tipoSeleccionado.set('');
          }

          this.notificaciones.mostrar('El evento fue eliminado.');
          this.cargar(true);
        },
        error: (error) => this.notificaciones.mostrar(
          mensajeApi(error, 'No se pudo eliminar el evento.'),
          { tipo: 'error', duracionMs: 0 }
        )
      });
  }
}
