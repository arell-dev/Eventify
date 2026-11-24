import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfirmacionDialogComponent } from './componentes/confirmacion/confirmacion.component';

// Mantiene el diálogo de confirmación disponible para las páginas hijas.
@Component({
  selector: 'app-inscripciones',
  imports: [ConfirmacionDialogComponent, RouterOutlet],
  templateUrl: './inscripciones.html',
  styleUrl: './inscripciones.css'
})
export class InscripcionesComponent {}
