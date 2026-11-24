import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ActualizarEstadoInscripcion,
  CrearInscripcion,
  EventoOpcion,
  Inscripcion,
  ParticipanteOpcion
} from '../modelos/inscripcion.model';

// Centraliza el contrato HTTP consumido por las páginas de Inscripciones.
@Injectable({ providedIn: 'root' })
export class InscripcionesService {
  private readonly http = inject(HttpClient);
  private readonly ruta = '/api/inscripciones';

  // Consulta la lista que ya incluye datos de evento y participante.
  obtenerTodas(): Observable<Inscripcion[]> {
    return this.http.get<Inscripcion[]>(this.ruta);
  }

  // Carga un registro completo para las vistas de detalle y edición.
  obtenerPorId(id: number): Observable<Inscripcion> {
    return this.http.get<Inscripcion>(`${this.ruta}/${id}`);
  }

  // Crea o reactiva el registro; la API decide la disponibilidad vigente.
  crear(datos: CrearInscripcion): Observable<Inscripcion> {
    return this.http.post<Inscripcion>(this.ruta, datos);
  }

  // Actualiza el estado sin permitir cambios fuera de las reglas de negocio.
  actualizarEstado(id: number, datos: ActualizarEstadoInscripcion): Observable<Inscripcion> {
    return this.http.patch<Inscripcion>(`${this.ruta}/${id}`, datos);
  }

  // La API solo acepta eliminar registros previamente cancelados.
  eliminar(id: number): Observable<Inscripcion> {
    return this.http.delete<Inscripcion>(`${this.ruta}/${id}`);
  }

  // Obtiene opciones del módulo Eventos para el formulario y sus filtros.
  obtenerEventos(): Observable<EventoOpcion[]> {
    return this.http.get<EventoOpcion[]>('/api/eventos');
  }

  // Obtiene opciones del módulo Participantes para registrar una relación válida.
  obtenerParticipantes(): Observable<ParticipanteOpcion[]> {
    return this.http.get<ParticipanteOpcion[]>('/api/participantes');
  }
}
