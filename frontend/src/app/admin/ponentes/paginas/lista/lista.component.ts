import { HttpErrorResponse } from '@angular/common/http';
import { afterNextRender, Component, computed, DestroyRef, ElementRef, inject, Injector, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, from, map, mergeMap, of, toArray } from 'rxjs';
import { ConfirmacionService } from '../../../inscripciones/componentes/confirmacion/confirmacion.service';
import { Ponente } from '../../modelos/ponente.model';
import { mensajeErrorPonentes, normalizarBusqueda } from '../../modelos/ponentes-presentacion';
import { PonentesService } from '../../servicios/ponentes.service';
import { NotificacionesService } from '../../../../comunes/notificaciones/notificaciones.service';

// Coordina el listado, la búsqueda, los indicadores y las acciones de ponentes.
@Component({
  selector: 'app-ponentes-lista',
  imports: [RouterLink],
  templateUrl: './lista.html',
  styleUrls: ['../ponentes.css', './lista.css']
})
export class PonentesListaComponent implements OnInit {
  private readonly servicio = inject(PonentesService);
  private readonly confirmacion = inject(ConfirmacionService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly ponentes = signal<Ponente[]>([]);
  readonly eventosPorPonente = signal(new Map<number, number | null>());
  readonly busqueda = signal('');
  readonly filtroEspecialidad = signal('');
  readonly soloConAgenda = signal(false);
  readonly cargando = signal(true);
  readonly cargandoEventos = signal(true);
  readonly errorCarga = signal(false);
  readonly errorEventos = signal(false);
  readonly procesando = signal(false);

  readonly especialidades = computed(() => {
    return [...new Set(this.ponentes().map((ponente) => ponente.especialidad))]
      .sort((primera, segunda) => primera.localeCompare(segunda, 'es'));
  });

  readonly conAgenda = computed(() => {
    return this.ponentes().filter((ponente) => (this.eventosPorPonente().get(ponente.id) ?? 0) > 0).length;
  });

  readonly filtrados = computed(() => {
    const termino = normalizarBusqueda(this.busqueda());
    const especialidad = this.filtroEspecialidad();
    const eventosPorPonente = this.eventosPorPonente();

    return this.ponentes().filter((ponente) => {
      const coincideTexto = !termino
        || normalizarBusqueda(ponente.nombre).includes(termino)
        || normalizarBusqueda(ponente.correo).includes(termino);
      const coincideEspecialidad = !especialidad || ponente.especialidad === especialidad;
      const coincideAgenda = !this.soloConAgenda() || (eventosPorPonente.get(ponente.id) ?? 0) > 0;

      return coincideTexto && coincideEspecialidad && coincideAgenda;
    });
  });

  ngOnInit(): void {
    this.cargarPonentes();
  }

  cargarPonentes(): void {
    this.cargando.set(true);
    this.errorCarga.set(false);

    this.servicio.obtenerTodos().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (ponentes) => {
        this.ponentes.set(ponentes);
        this.cargando.set(false);
        this.cargarEventos();
      },
      error: (error: HttpErrorResponse) => {
        this.ponentes.set([]);
        this.errorCarga.set(true);
        this.cargando.set(false);
        this.cargandoEventos.set(false);
        this.notificaciones.mostrar(mensajeErrorPonentes(error), 'error');
      }
    });
  }

  cargarEventos(): void {
    this.cargandoEventos.set(true);
    this.errorEventos.set(false);

    // Limita las solicitudes simultáneas y conserva los conteos de las agendas que respondieron.
    from(this.ponentes()).pipe(
      mergeMap((ponente) => this.servicio.obtenerAgenda(ponente.id).pipe(
        map((eventos) => [ponente.id, eventos.length] as const),
        catchError(() => of([ponente.id, null] as const))
      ), 6),
      toArray(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((conteos) => {
      const huboError = conteos.some(([, cantidad]) => cantidad === null);

      this.eventosPorPonente.set(new Map<number, number | null>(conteos));
      this.errorEventos.set(huboError);
      this.cargandoEventos.set(false);

      if (huboError) {
        this.mostrarTodos();
      }
    });
  }

  actualizarBusqueda(evento: Event): void {
    if (evento.target instanceof HTMLInputElement) {
      this.busqueda.set(evento.target.value);
    }
  }

  actualizarFiltroEspecialidad(evento: Event): void {
    if (evento.target instanceof HTMLSelectElement) {
      this.filtroEspecialidad.set(evento.target.value);
    }
  }

  mostrarTodos(): void {
    this.soloConAgenda.set(false);
  }

  alternarFiltroAgenda(): void {
    this.soloConAgenda.update((activo) => !activo);
  }

  cantidadEventos(ponenteId: number): string {
    const cantidad = this.eventosPorPonente().get(ponenteId);

    if (this.cargandoEventos()) {
      return 'Consultando…';
    }

    if (cantidad == null) {
      return 'No disponible';
    }

    return cantidad === 1 ? '1 evento' : `${cantidad} eventos`;
  }

  async eliminar(ponente: Ponente): Promise<void> {
    if (this.procesando()) {
      return;
    }

    this.procesando.set(true);
    const confirmada = await this.confirmacion.solicitar(
      `¿Deseas eliminar a ${ponente.nombre} como ponente?`
    );

    if (!confirmada || this.destroyRef.destroyed) {
      this.procesando.set(false);
      return;
    }

    this.servicio.eliminar(ponente.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.notificaciones.mostrar('El ponente fue eliminado.');
        this.ponentes.update((ponentes) => ponentes.filter((registro) => registro.id !== ponente.id));

        if (!this.especialidades().includes(this.filtroEspecialidad())) {
          this.filtroEspecialidad.set('');
        }

        this.procesando.set(false);
        afterNextRender(() => {
          this.elemento.nativeElement.querySelector<HTMLElement>('#titulo-ponentes')?.focus();
        }, { injector: this.injector });
      },
      error: (error: HttpErrorResponse) => {
        this.notificaciones.mostrar(mensajeErrorPonentes(error), { tipo: 'error', duracionMs: 0 });
        this.procesando.set(false);
      }
    });
  }

}
