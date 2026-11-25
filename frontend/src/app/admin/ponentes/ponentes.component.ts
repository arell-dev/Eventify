import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfirmacionDialogComponent } from '../inscripciones/componentes/confirmacion/confirmacion.component';

// Mantiene el diálogo compartido disponible durante las páginas de ponentes.
@Component({
  selector: 'app-ponentes',
  imports: [ConfirmacionDialogComponent, RouterOutlet],
  templateUrl: './ponentes.html'
})
export class PonentesComponent {
}
