import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DatosEdicionPonente, EventoAgendaPonente, Ponente, UsuarioElegiblePonente } from '../modelos/ponente.model';

// Centraliza las operaciones administrativas de ponentes y su agenda.
@Injectable({ providedIn: 'root' })
export class PonentesService {
  private readonly http = inject(HttpClient);

  obtenerTodos(): Observable<Ponente[]> {
    return this.http.get<Ponente[]>('/api/ponentes', { withCredentials: true });
  }

  obtenerUsuariosElegibles(): Observable<UsuarioElegiblePonente[]> {
    return this.http.get<UsuarioElegiblePonente[]>('/api/usuarios', {
      params: { rol: 'ponente' },
      withCredentials: true
    });
  }

  obtenerPorId(id: number): Observable<Ponente> {
    return this.http.get<Ponente>(`/api/ponentes/${id}`, { withCredentials: true });
  }

  obtenerAgenda(id: number): Observable<EventoAgendaPonente[]> {
    return this.http.get<EventoAgendaPonente[]>(`/api/ponentes/${id}/eventos`, { withCredentials: true });
  }

  crear(usuarioId: number): Observable<Ponente> {
    return this.http.post<Ponente>('/api/ponentes', { usuarioId }, { withCredentials: true });
  }

  actualizar(id: number, datos: DatosEdicionPonente): Observable<Ponente> {
    return this.http.put<Ponente>(`/api/ponentes/${id}`, datos, { withCredentials: true });
  }

  eliminar(id: number): Observable<Ponente> {
    return this.http.delete<Ponente>(`/api/ponentes/${id}`, { withCredentials: true });
  }
}
