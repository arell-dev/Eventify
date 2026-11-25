import { DecimalPipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { IndicadorInicio } from '../../modelos/inicio.model';

@Component({
  selector: 'app-indicadores-inicio',
  imports: [DecimalPipe],
  templateUrl: './indicadores.html',
  styleUrl: './indicadores.css'
})
export class IndicadoresInicioComponent {
  readonly indicadores = input.required<readonly IndicadorInicio[]>();
  readonly cargando = input.required<boolean>();
}
