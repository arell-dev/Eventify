import { Component, ElementRef, input, output, viewChild } from '@angular/core';

// Expone el botón que abre el menú de administración en móvil.
@Component({
  selector: 'app-cabecera-movil',
  templateUrl: './cabecera-movil.html',
  styleUrl: './cabecera-movil.css'
})
export class CabeceraMovilComponent {
  private readonly activador = viewChild.required<ElementRef<HTMLButtonElement>>('activador');

  readonly menuAbierto = input.required<boolean>();
  readonly menuSolicitado = output<void>();

  enfocarActivador(): void {
    this.activador().nativeElement.focus({ preventScroll: true });
  }
}
