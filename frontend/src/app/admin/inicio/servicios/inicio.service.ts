import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import { EventosService } from '../../eventos/servicios/eventos.service';
import { ParticipantesApi } from '../../participantes/participantes-api';
import { PonentesService } from '../../ponentes/servicios/ponentes.service';
import { DatosInicio, ResultadoConsulta } from '../modelos/inicio.model';

// Reúne los tres recursos y conserva las respuestas disponibles ante un fallo parcial.
@Injectable({ providedIn: 'root' })
export class InicioService {
  private readonly eventos = inject(EventosService);
  private readonly participantes = inject(ParticipantesApi);
  private readonly ponentes = inject(PonentesService);

  consultar(): Observable<DatosInicio> {
    return forkJoin({
      eventos: this.consultarRecurso(this.eventos.listar()),
      participantes: this.consultarRecurso(this.participantes.listar()),
      ponentes: this.consultarRecurso(this.ponentes.obtenerTodos())
    });
  }

  private consultarRecurso<Datos>(consulta: Observable<Datos>): Observable<ResultadoConsulta<Datos>> {
    return consulta.pipe(
      map((datos) => ({ datos, error: null })),
      catchError((error: HttpErrorResponse) => of({ datos: null, error }))
    );
  }
}
