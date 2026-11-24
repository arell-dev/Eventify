import { Component, effect, ElementRef, inject, viewChild } from '@angular/core';
import { ConfirmacionService } from './confirmacion.service';

// Conecta el diálogo nativo con las solicitudes pendientes del módulo.
@Component({
  selector: 'app-confirmacion-inscripcion-dialog',
  templateUrl: './confirmacion.html',
  styleUrl: './confirmacion.css'
})

export class ConfirmacionDialogComponent {
  private readonly elemento = viewChild<ElementRef<HTMLDialogElement>>('dialogo');
  readonly confirmacion = inject(ConfirmacionService);

  constructor() {
    // Sincroniza el estado del servicio con el diálogo nativo y su foco modal.
    effect(() => {
      const dialogo = this.elemento()?.nativeElement;

      if (!dialogo) {
        return;
      }

      if (this.confirmacion.mensaje() && !dialogo.open) {
        dialogo.showModal();
      } else if (!this.confirmacion.mensaje() && dialogo.open) {
        dialogo.close();
      }
    });
  }

  responder(confirmada: boolean): void {
    this.confirmacion.resolverSolicitud(confirmada);
  }

  cancelarConEscape(evento: Event): void {
    evento.preventDefault();
    this.responder(false);
  }
}
