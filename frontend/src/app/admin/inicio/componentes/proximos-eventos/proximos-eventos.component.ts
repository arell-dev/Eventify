import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Evento } from '../../../eventos/modelos/evento.model';
import { formatearFechaRegistro } from '../../../eventos/utilidades/fecha';
import { modalidades } from '../../../eventos/utilidades/presentacion';

@Component({
  selector: 'app-proximos-eventos',
  imports: [RouterLink],
  templateUrl: './proximos-eventos.html',
  styleUrl: './proximos-eventos.css'
})
export class ProximosEventosComponent {
  readonly eventos = input.required<readonly Evento[]>();
  readonly cargando = input.required<boolean>();
  readonly noDisponibles = input.required<boolean>();

  protected readonly modalidades = modalidades;
  protected readonly formatearInicio = formatearFechaRegistro;
}
