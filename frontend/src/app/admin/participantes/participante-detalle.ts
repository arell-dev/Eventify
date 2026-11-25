import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { NotificacionesService } from '../../comunes/notificaciones/notificaciones.service';
import { ConfirmacionDialogComponent } from '../inscripciones/componentes/confirmacion/confirmacion.component';
import { ConfirmacionService } from '../inscripciones/componentes/confirmacion/confirmacion.service';
import { Inscripcion, Participante } from './participante.model';
import { ParticipantesApi, mensajeDeError } from './participantes-api';

// Muestra la ficha del participante y su historial de inscripciones.
@Component({
  selector: 'app-participante-detalle',
  imports: [ConfirmacionDialogComponent, DatePipe, RouterLink],
  templateUrl: './participante-detalle.html',
  styleUrl: './participantes.css'
})
export class ParticipanteDetalle {
  private readonly api = inject(ParticipantesApi);
  private readonly router = inject(Router);
  private readonly ciclo = inject(DestroyRef);
  private readonly confirmacion = inject(ConfirmacionService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
  protected readonly participante = signal<Participante | null>(null);
  protected readonly inscripciones = signal<Inscripcion[]>([]);
  protected readonly cargando = signal(true);
  protected readonly eliminando = signal(false);
  protected readonly errorCarga = signal('');
  protected readonly errorOperacion = signal('');
  private confirmando = false;

  constructor() {
    this.ciclo.onDestroy(() => {
      if (this.confirmando) {
        this.confirmacion.resolverSolicitud(false);
      }
    });

    this.cargar();
  }

  protected cargar() {
    this.errorCarga.set('');
    this.cargando.set(true);

    forkJoin({
      participante: this.api.obtener(this.id),
      inscripciones: this.api.consultarInscripciones(this.id)
    }).pipe(
      takeUntilDestroyed(this.ciclo),
      finalize(() => this.cargando.set(false))
    ).subscribe({
      next: ({ participante, inscripciones }) => {
        this.participante.set(participante);
        this.inscripciones.set(inscripciones);
      },
      error: (error: unknown) => this.errorCarga.set(mensajeDeError(error))
    });
  }

  protected async eliminar(participante: Participante) {
    if (this.confirmando || this.eliminando()) {
      return;
    }

    this.errorOperacion.set('');
    this.confirmando = true;
    const eliminar = await this.confirmacion.solicitar(`¿Deseas eliminar a ${participante.nombre} del padrón de participantes?`);
    this.confirmando = false;

    if (!eliminar || this.ciclo.destroyed) {
      return;
    }

    this.eliminando.set(true);

    this.api.eliminar(participante.id).pipe(
      takeUntilDestroyed(this.ciclo),
      finalize(() => this.eliminando.set(false))
    ).subscribe({
      next: () => {
        this.notificaciones.mostrar('Participante eliminado.');
        void this.router.navigate(['/admin/participantes']);
      },
      error: (error: unknown) => this.errorOperacion.set(mensajeDeError(error))
    });
  }
}
