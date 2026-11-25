import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-accesos-modulos',
  imports: [RouterLink],
  templateUrl: './accesos-modulos.html',
  styleUrl: './accesos-modulos.css'
})
export class AccesosModulosComponent {
  protected readonly modulos = [
    {
      nombre: 'Eventos',
      ruta: '/admin/eventos',
      descripcion: 'Gestiona fechas, modalidad, ponente y cupos disponibles.'
    },
    {
      nombre: 'Participantes',
      ruta: '/admin/participantes',
      descripcion: 'Consulta y confirma asistentes desde la lista de usuarios.'
    },
    {
      nombre: 'Inscripciones',
      ruta: '/admin/inscripciones',
      descripcion: 'Inscribe usuarios en eventos según cupos y confirma registros.'
    },
    {
      nombre: 'Ponentes',
      ruta: '/admin/ponentes',
      descripcion: 'Selecciona ponentes desde usuarios y revisa su agenda.'
    }
  ] as const;
}
