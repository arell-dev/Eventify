import { Injectable, signal } from '@angular/core';

// Comparte una sola solicitud de confirmación entre las páginas del módulo.
@Injectable({ providedIn: 'root' })
export class ConfirmacionService {
  readonly mensaje = signal<string | null>(null);
  private resolver?: (confirmada: boolean) => void;

  // Espera la respuesta del diálogo y evita solapar solicitudes.
  solicitar(mensaje: string): Promise<boolean> {
    if (this.resolver) {
      return Promise.resolve(false);
    }

    return new Promise((resolver) => {
      this.resolver = resolver;
      this.mensaje.set(mensaje);
    });
  }

  // Resuelve la acción pendiente y limpia el mensaje visible.
  resolverSolicitud(confirmada: boolean): void {
    const resolver = this.resolver;

    this.resolver = undefined;
    this.mensaje.set(null);
    resolver?.(confirmada);
  }
}
