import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Evento } from '../../modelos/evento.model';
import { formatearHorario } from '../../utilidades/fecha';
import { etiquetaTipo, modalidades } from '../../utilidades/presentacion';

// Presenta los eventos filtrados y comunica la solicitud de borrado a la página.
@Component({
  selector: 'app-tabla-eventos',
  imports: [RouterLink],
  templateUrl: './tabla-eventos.html',
  styleUrls: ['../tablas.css', '../distintivos.css', './tabla-eventos.css']
})

export class TablaEventosComponent {
  readonly eventos = input.required<readonly Evento[]>();
  readonly nombresPonentes = input.required<ReadonlyMap<number, string>>();
  readonly eliminando = input.required<boolean>();
  readonly eliminar = output<Evento>();

  protected readonly modalidades = modalidades;
  protected readonly etiquetaTipo = etiquetaTipo;
  protected readonly horario = formatearHorario;
}
