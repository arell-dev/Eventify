import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { InscripcionEvento } from '../../modelos/evento.model';
import { formatearFechaRegistro } from '../../utilidades/fecha';

// Presenta las inscripciones del evento con sus estados y vínculos.
@Component({
  selector: 'app-tabla-inscritos-evento',
  imports: [RouterLink],
  templateUrl: './tabla-inscritos.html',
  styleUrls: ['../tablas.css', './tabla-inscritos.css']
})

export class TablaInscritosEventoComponent {
  readonly inscripciones = input.required<readonly InscripcionEvento[]>();
  protected readonly fecha = formatearFechaRegistro;
}
