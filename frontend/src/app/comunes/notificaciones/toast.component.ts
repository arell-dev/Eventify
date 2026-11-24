import { Component, effect, ElementRef, inject, viewChild } from '@angular/core';
import { NotificacionesService } from './notificaciones.service';

// Renderiza los avisos globales y permite cerrarlos desde cualquier ruta.
@Component({
  selector: 'app-toast',
  templateUrl: './toast.html',
  styleUrl: './toast.css'
})

export class Toast {
  private readonly servicio = inject(NotificacionesService);
  private readonly contenedor = viewChild<ElementRef<HTMLElement>>('contenedor');
  readonly avisos = this.servicio.avisos;

  constructor() {
    // Abre o cierra el popover según los avisos globales que sigan activos.
    effect(() => {
      const contenedor = this.contenedor()?.nativeElement;

      if (!contenedor) {
        return;
      }

      if (this.avisos().length > 0 && !contenedor.matches(':popover-open')) {
        contenedor.showPopover();
        return;
      }

      if (contenedor.matches(':popover-open')) {
        contenedor.hidePopover();
      }
    });
  }

  cerrar(id: number): void {
    this.servicio.cerrar(id);
  }
}
