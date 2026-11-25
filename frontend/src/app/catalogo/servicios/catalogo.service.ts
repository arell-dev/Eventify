import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { AvisoDeCuenta, CancelacionInscripcion, EventoPublico, InscripcionPropia } from '../modelos/catalogo.model';

// Consulta los recursos públicos y las operaciones de la propia cuenta.
@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private readonly http = inject(HttpClient);
  private readonly ruta = '/api/publico/eventos';

  listar() {
    return this.http.get<EventoPublico[]>(this.ruta);
  }

  obtener(eventoId: number) {
    return this.http.get<EventoPublico>(`${this.ruta}/${eventoId}`);
  }

  consultarInscripcion(eventoId: number) {
    return this.http.get<InscripcionPropia | null>(`${this.ruta}/${eventoId}/mi-inscripcion`);
  }

  listarMisInscripciones() {
    return this.http.get<{ eventoIds: number[] }>('/api/publico/mis-inscripciones');
  }

  confirmarInscripcion(eventoId: number) {
    return this.http.post<InscripcionPropia>(`${this.ruta}/${eventoId}/mi-inscripcion`, {});
  }

  cancelarInscripcion(eventoId: number) {
    return this.http.patch<CancelacionInscripcion>(`${this.ruta}/${eventoId}/mi-inscripcion`, { estado: 'CANCELADA' });
  }

  consultarAvisos() {
    return this.http.get<AvisoDeCuenta[]>('/api/notificaciones');
  }

  marcarAvisoLeido(avisoId: number) {
    return this.http.patch<AvisoDeCuenta>(`/api/notificaciones/${avisoId}`, { leida: true });
  }
}
