import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize, Subscription } from 'rxjs';
import { CambiosInscripcionesService } from '../../comunes/inscripciones/cambios-inscripciones.service';
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
  private readonly cambios = inject(CambiosInscripcionesService);
  private readonly ciclo = inject(DestroyRef);
  private consulta?: Subscription;
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
    this.cambios.cambios.pipe(takeUntilDestroyed(this.ciclo)).subscribe(() => this.cargar(true));
  }

  protected cargar(enSegundoPlano = false) {
    const mostrarCarga = !enSegundoPlano || this.cargando();
    this.consulta?.unsubscribe();

    if (mostrarCarga) {
      this.error.set('');
      this.cargando.set(true);
    }

    this.consulta = this.api.listar().pipe(
      takeUntilDestroyed(this.ciclo),
      finalize(() => this.cargando.set(false))
    ).subscribe({
      next: (participantes) => {
        this.error.set('');
        this.participantes.set(participantes);
      },
      error: (error) => {
        if (mostrarCarga || error.status === 401 || error.status === 403) {
          this.error.set(mensajeDeError(error));
        }
      }
    });
  }
}
