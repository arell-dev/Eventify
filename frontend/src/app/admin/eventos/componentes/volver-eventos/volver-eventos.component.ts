import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// Presenta el regreso al listado desde las páginas secundarias.
@Component({
  selector: 'app-volver-eventos',
  imports: [RouterLink],
  templateUrl: './volver-eventos.html',
  styleUrl: './volver-eventos.css'
})

export class VolverEventosComponent {}
