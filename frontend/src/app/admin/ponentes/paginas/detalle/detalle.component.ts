import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NotificacionesService } from '../../../../comunes/notificaciones/notificaciones.service';
import { EventoAgendaPonente, Ponente } from '../../modelos/ponente.model';
import { mensajeErrorPonentes } from '../../modelos/ponentes-presentacion';
import { PonentesService } from '../../servicios/ponentes.service';

// Presenta los datos del ponente y su agenda de eventos.
@Component({
  selector: 'app-ponente-detalle',
  imports: [RouterLink],
  templateUrl: './detalle.html',
  styleUrls: ['../ponentes.css', './detalle.css']
})
export class PonenteDetalleComponent implements OnInit {
  private readonly ruta = inject(ActivatedRoute);
  private readonly servicio = inject(PonentesService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly destroyRef = inject(DestroyRef);

  readonly ponente = signal<Ponente | null>(null);
  readonly eventos = signal<EventoAgendaPonente[]>([]);
  readonly cargando = signal(true);
  readonly cargandoAgenda = signal(true);
  readonly errorCarga = signal('');
  readonly errorAgenda = signal(false);
  readonly puedeReintentar = signal(false);
  readonly idPonente = signal(0);

  private readonly formatoFechaHora = new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'short',
    timeStyle: 'short',
    hourCycle: 'h23',
    timeZone: 'America/Lima'
  });

  ngOnInit(): void {
    const id = Number(this.ruta.snapshot.paramMap.get('id'));

    if (!Number.isSafeInteger(id) || id < 1) {
      this.cargando.set(false);
      this.errorCarga.set('El identificador del ponente no es válido.');
      return;
    }

    this.idPonente.set(id);
    this.cargarPonente();
  }

  cargarPonente(): void {
    this.cargando.set(true);
    this.errorCarga.set('');

    this.servicio.obtenerPorId(this.idPonente()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (ponente) => {
        this.ponente.set(ponente);
        this.cargando.set(false);
        this.cargarAgenda();
      },
      error: (error: HttpErrorResponse) => {
        this.ponente.set(null);
        this.errorCarga.set(mensajeErrorPonentes(error));
        this.puedeReintentar.set(error.status === 0 || error.status >= 500);
        this.cargando.set(false);
      }
    });
  }

  cargarAgenda(): void {
    this.cargandoAgenda.set(true);
    this.errorAgenda.set(false);

    this.servicio.obtenerAgenda(this.idPonente()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (eventos) => {
        this.eventos.set(eventos);
        this.cargandoAgenda.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.eventos.set([]);
        this.errorAgenda.set(true);
        this.cargandoAgenda.set(false);
        this.notificaciones.mostrar(
          `No se pudo cargar la agenda del ponente. ${mensajeErrorPonentes(error)}`,
          'error'
        );
      }
    });
  }

  formatearHorario(evento: EventoAgendaPonente): string {
    const inicio = new Date(evento.inicio);
    const fin = new Date(evento.fin);

    if (!Number.isFinite(inicio.getTime()) || !Number.isFinite(fin.getTime()) || fin < inicio) {
      return 'Horario no disponible';
    }

    return this.formatoFechaHora.formatRange(inicio, fin);
  }

  etiquetaModalidad(modalidad: EventoAgendaPonente['modalidad']): string {
    const etiquetas: Record<EventoAgendaPonente['modalidad'], string> = {
      PRESENCIAL: 'Presencial',
      VIRTUAL: 'Virtual',
      HIBRIDO: 'Híbrido'
    };

    return etiquetas[modalidad];
  }

  estadoAgenda(evento: EventoAgendaPonente): string {
    const inicio = Date.parse(evento.inicio);
    const fin = Date.parse(evento.fin);
    const ahora = Date.now();

    if (!Number.isFinite(inicio) || !Number.isFinite(fin) || fin <= inicio) {
      return 'No disponible';
    }

    if (ahora < inicio) {
      return 'Próximo';
    }

    return ahora < fin ? 'En curso' : 'Finalizado';
  }
}
