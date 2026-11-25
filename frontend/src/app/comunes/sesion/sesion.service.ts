import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';

export interface SesionAdministrativa {
  usuario: string;
  rol: 'ADMIN' | 'USUARIO';
  perfil?: {
    id: number;
    nombre: string;
    correo: string;
    carrera?: string;
  };
}

interface CredencialesAdministrativas {
  usuario: string;
  contrasena: string;
}

// Centraliza el ciclo de sesión administrativa con la cookie HttpOnly del servidor.
@Injectable({ providedIn: 'root' })
export class SesionService {
  private readonly http = inject(HttpClient);

  readonly sesion = signal<SesionAdministrativa | null>(null);

  iniciar(credenciales: CredencialesAdministrativas): Observable<SesionAdministrativa> {
    return this.http.post<SesionAdministrativa>('/api/sesion', credenciales, { withCredentials: true }).pipe(
      tap((sesion) => this.sesion.set(sesion))
    );
  }

  comprobar(): Observable<SesionAdministrativa | null> {
    return this.http.get<SesionAdministrativa>('/api/sesion', { withCredentials: true }).pipe(
      tap((sesion) => this.sesion.set(sesion)),
      catchError(() => {
        this.sesion.set(null);

        return of(null);
      })
    );
  }

  cerrar(): Observable<void> {
    return this.http.delete<void>('/api/sesion', { withCredentials: true }).pipe(
      tap(() => this.sesion.set(null))
    );
  }

  tieneSesionAdmin(): Observable<boolean> {
    return this.comprobar().pipe(map((sesion) => sesion?.rol === 'ADMIN'));
  }
}
