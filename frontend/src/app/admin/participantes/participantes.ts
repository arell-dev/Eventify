import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ParticipantesApi, mensajeDeError } from './participantes-api';
import { Participante } from './participante.model';

// Consulta el padrón de participantes y aplica los filtros del listado.
@Component({
  selector: 'app-participantes',
  imports: [RouterLink],
  templateUrl: './participantes.html',
  styleUrl: './participantes.css'
})
export class Participantes {
  private readonly api = inject(ParticipantesApi);
  private readonly ciclo = inject(DestroyRef);
  private readonly participantes = signal<Participante[]>([]);
  protected readonly busqueda = signal('');
  protected readonly carrera = signal('');
  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly total = computed(() => this.participantes().length);
  protected readonly carreras = computed(() => {
    return [...new Set(this.participantes().map((participante) => participante.carrera))]
      .sort((primera, segunda) => primera.localeCompare(segunda, 'es-PE'));
  });

  protected readonly visibles = computed(() => {
    const consulta = this.busqueda().trim().toLowerCase();
    const carrera = this.carrera();

    return this.participantes().filter((participante) => {
      const coincideBusqueda = [participante.nombre, participante.correo]
        .some((valor) => valor.toLowerCase().includes(consulta));
      return coincideBusqueda && (!carrera || participante.carrera === carrera);
    });
  });

  constructor() {
    this.cargar();
  }

  protected cargar() {
    this.error.set('');
    this.cargando.set(true);

    this.api.listar().pipe(
      takeUntilDestroyed(this.ciclo),
      finalize(() => this.cargando.set(false))
    ).subscribe({
      next: (participantes) => this.participantes.set(participantes),
      error: (error: unknown) => this.error.set(mensajeDeError(error))
    });
  }
}
