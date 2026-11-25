import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { DatosEvento, Evento, InscripcionEvento, Ponente } from '../modelos/evento.model';

// Consulta el contrato administrativo de Eventos y sus relaciones.
@Injectable({ providedIn: 'root' })
export class EventosService {
  private readonly http = inject(HttpClient);
  private readonly ruta = '/api/eventos';

  listar(): Observable<Evento[]> {
    return this.http.get<Evento[]>(this.ruta);
  }

  obtener(id: number): Observable<Evento> {
    return this.http.get<Evento>(`${this.ruta}/${id}`);
  }

  listarPonentes(): Observable<Ponente[]> {
    return this.http.get<Ponente[]>('/api/ponentes');
  }

  listarInscripciones(id: number): Observable<InscripcionEvento[]> {
    return this.http.get<InscripcionEvento[]>(`${this.ruta}/${id}/inscripciones`);
  }

  crear(datos: DatosEvento): Observable<Evento> {
    return this.http.post<Evento>(this.ruta, datos);
  }

  actualizar(id: number, datos: DatosEvento): Observable<Evento> {
    return this.http.put<Evento>(`${this.ruta}/${id}`, datos);
  }

  eliminar(id: number): Observable<Evento> {
    return this.http.delete<Evento>(`${this.ruta}/${id}`);
  }
}
