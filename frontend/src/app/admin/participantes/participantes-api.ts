import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Inscripcion, Participante, UsuarioDisponible } from './participante.model';

const recurso = '/api/participantes';

@Injectable({ providedIn: 'root' })
export class ParticipantesApi {
  private readonly http = inject(HttpClient);

  listar() {
    return this.http.get<Participante[]>(recurso);
  }

  obtener(id: string) {
    return this.http.get<Participante>(recurso + '/' + encodeURIComponent(id));
  }

  listarUsuariosDisponibles() {
    return this.http.get<UsuarioDisponible[]>(recurso + '/usuarios-disponibles');
  }

  registrar(usuarioId: number) {
    return this.http.post<Participante>(recurso, { usuarioId });
  }

  eliminar(id: number) {
    return this.http.delete<Participante>(recurso + '/' + id);
  }

  consultarInscripciones(id: string) {
    return this.http.get<Inscripcion[]>(recurso + '/' + encodeURIComponent(id) + '/inscripciones');
  }
}

export function mensajeDeError(error: unknown): string {
  if (error instanceof HttpErrorResponse && typeof error.error?.mensaje === 'string') {
    return error.error.mensaje;
  }

  return 'No se pudo completar la solicitud. Intenta de nuevo.';
}
