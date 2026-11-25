import { Injectable } from '@angular/core';
import { Observable, retry, share } from 'rxjs';

// Comparte la conexión entre las vistas que consultan inscripciones o cupos.
@Injectable({ providedIn: 'root' })
export class CambiosInscripcionesService {
  readonly cambios = new Observable<void>((suscriptor) => {
    if (typeof EventSource === 'undefined') {
      return;
    }

    const fuente = new EventSource('/api/publico/cambios-inscripciones');
    const actualizar = () => suscriptor.next();

    // Al abrir o recuperar la conexión se consultan también los cambios previos.
    fuente.addEventListener('open', actualizar);
    fuente.addEventListener('inscripciones', actualizar);
    fuente.addEventListener('error', () => {
      // El navegador recupera caídas normales. Reabre también tras una respuesta HTTP fallida.
      if (fuente.readyState === EventSource.CLOSED) {
        suscriptor.error(new Error('Se cerró el canal de inscripciones.'));
      }
    });

    return () => fuente.close();
  }).pipe(retry({ delay: 3000 }), share());
}
