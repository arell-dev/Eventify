import { Component, ElementRef, output, viewChild } from '@angular/core';

// Controla la apertura y el cierre del diálogo que contiene el menú móvil.
@Component({
  selector: 'app-panel-movil',
  templateUrl: './panel-movil.html',
  styleUrl: './panel-movil.css'
})
export class PanelMovilComponent {
  private readonly panel = viewChild.required<ElementRef<HTMLDialogElement>>('panel');
  readonly cerrado = output<void>();

  abrir(): boolean {
    const dialogo = this.panel().nativeElement;

    if (dialogo.open) {
      return false;
    }

    dialogo.removeAttribute('data-cerrando');
    dialogo.showModal();

    return true;
  }

  async cerrar(inmediato = false): Promise<void> {
    const dialogo = this.panel().nativeElement;

    if (!dialogo.open) {
      return;
    }

    if (inmediato) {
      dialogo.removeAttribute('data-cerrando');
      dialogo.close();
      return;
    }

    if (!dialogo.hasAttribute('data-cerrando')) {
      dialogo.setAttribute('data-cerrando', '');
    }

    // Conserva la modalidad mientras terminan la salida del panel y la del fondo.
    const salida = dialogo.getAnimations({ subtree: true });
    await Promise.allSettled(salida.map((animacion) => animacion.finished));

    if (dialogo.open && dialogo.hasAttribute('data-cerrando')) {
      dialogo.close();
    }
  }

  protected alSolicitarCierre(evento: Event): void {
    evento.preventDefault();
    void this.cerrar();
  }

  protected alCerrar(): void {
    if (!this.panel().nativeElement.open) {
      this.cerrado.emit();
    }
  }

  protected alPulsarFondo(evento: MouseEvent): void {
    const dialogo = this.panel().nativeElement;

    if ('closedBy' in HTMLDialogElement.prototype || evento.target !== dialogo) {
      return;
    }

    const limites = dialogo.getBoundingClientRect();

    if (evento.clientX < limites.left || evento.clientX >= limites.right) {
      void this.cerrar();
    }
  }
}
