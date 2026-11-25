import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription, finalize, forkJoin } from 'rxjs';
import { CambiosInscripcionesService } from '../../../../comunes/inscripciones/cambios-inscripciones.service';
import { TablaInscritosEventoComponent } from '../../componentes/tabla-inscritos/tabla-inscritos.component';
import { VolverEventosComponent } from '../../componentes/volver-eventos/volver-eventos.component';
import { Evento, InscripcionEvento } from '../../modelos/evento.model';
import { EventosService } from '../../servicios/eventos.service';
import { formatearHorario } from '../../utilidades/fecha';
import { estadoTemporal, etiquetaTipo, mensajeApi, modalidades } from '../../utilidades/presentacion';

// Carga el evento, su ponente y las inscripciones relacionadas.
@Component({
  selector: 'app-evento-detalle',
  imports: [RouterLink, TablaInscritosEventoComponent, VolverEventosComponent],
  templateUrl: './detalle.html',
  styleUrls: ['../../eventos.css', '../../componentes/distintivos.css', './detalle.css']
})

export class EventoDetalleComponent implements OnInit {
  private readonly servicio = inject(EventosService);
  private readonly cambios = inject(CambiosInscripcionesService);
  private readonly ruta = inject(ActivatedRoute);
  private readonly destruir = inject(DestroyRef);
  private solicitud?: Subscription;

  protected readonly evento = signal<Evento | null>(null);
  protected readonly nombrePonente = signal('');
  protected readonly inscripciones = signal<InscripcionEvento[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly noEncontrado = signal(false);
  protected readonly modalidades = modalidades;
  protected readonly etiquetaTipo = etiquetaTipo;
  protected readonly horario = formatearHorario;

  protected readonly estado = computed(() => {
    const evento = this.evento();

    return evento ? estadoTemporal(evento, Date.now()) : '';
  });

  ngOnInit(): void {
    this.ruta.paramMap.pipe(takeUntilDestroyed(this.destruir)).subscribe(() => this.cargar());
    this.cambios.cambios.pipe(takeUntilDestroyed(this.destruir)).subscribe(() => this.cargar(true));
  }

  protected cargar(enSegundoPlano = false): void {
    const mostrarCarga = !enSegundoPlano || !this.evento();
    this.solicitud?.unsubscribe();

    if (mostrarCarga) {
      this.evento.set(null);
      this.error.set('');
      this.noEncontrado.set(false);
    }

    const id = Number(this.ruta.snapshot.paramMap.get('id'));

    if (!Number.isSafeInteger(id) || id < 1) {
      this.noEncontrado.set(true);
      this.cargando.set(false);
      return;
    }

    this.cargando.set(mostrarCarga);
    this.solicitud = forkJoin({
      evento: this.servicio.obtener(id),
      ponentes: this.servicio.listarPonentes(),
      inscripciones: this.servicio.listarInscripciones(id)
    })
      .pipe(takeUntilDestroyed(this.destruir), finalize(() => this.cargando.set(false)))
      .subscribe({
        next: ({ evento, ponentes, inscripciones }) => {
          this.error.set('');
          this.noEncontrado.set(false);
          this.nombrePonente.set(ponentes.find((ponente) => ponente.id === evento.ponenteId)?.nombre ?? 'Ponente no disponible');
          this.inscripciones.set(inscripciones);
          this.evento.set(evento);
        },
        error: (error) => {
          if (error.status === 404) {
            this.evento.set(null);
            this.noEncontrado.set(true);
          } else if (mostrarCarga || error.status === 401 || error.status === 403) {
            this.error.set(mensajeApi(error, 'No se pudo cargar el evento.'));
          }
        }
      });
  }

  protected puedeInscribir(evento: Evento): boolean {
    return Date.parse(evento.inicio) > Date.now() && evento.cuposDisponibles > 0;
  }
}
