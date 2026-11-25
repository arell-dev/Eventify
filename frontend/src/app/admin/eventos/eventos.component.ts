import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfirmacionDialogComponent } from '../inscripciones/componentes/confirmacion/confirmacion.component';
import { ConfirmacionService } from '../inscripciones/componentes/confirmacion/confirmacion.service';

// Aloja las páginas de Eventos y su instancia del diálogo reutilizable.
@Component({
  selector: 'app-eventos',
  imports: [RouterOutlet, ConfirmacionDialogComponent],
  providers: [ConfirmacionService],
  template: `
    <router-outlet></router-outlet>
    <app-confirmacion-inscripcion-dialog></app-confirmacion-inscripcion-dialog>
  `
})

export class EventosComponent {}
