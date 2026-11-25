import { Component, input } from '@angular/core';

// Presenta los totales del conjunto de eventos.
@Component({
  selector: 'app-indicadores-eventos',
  templateUrl: './indicadores.html',
  styleUrl: './indicadores.css'
})

export class IndicadoresEventosComponent {
  readonly proximos = input.required<number>();
  readonly ocupacion = input.required<number>();
  readonly disponibles = input.required<number>();
}
