import { NgTemplateOutlet } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface EntradaAdministrativa {
  nombre: string;
  ruta: string;
  icono: string;
  disponible: boolean;
}

// Comparte los enlaces y la sesión entre la barra lateral y el panel móvil.
@Component({
  selector: 'app-contenido-menu',
  imports: [NgTemplateOutlet, RouterLink, RouterLinkActive],
  templateUrl: './contenido-menu.html',
  styleUrl: './contenido-menu.css'
})
export class ContenidoMenuComponent {
  readonly usuario = input.required<string>();
  readonly cerrandoSesion = input.required<boolean>();
  readonly enlaceSeleccionado = output<void>();
  readonly salidaSolicitada = output<void>();

  protected readonly entradas: readonly EntradaAdministrativa[] = [
    {
      nombre: 'Inicio',
      ruta: '/admin/inicio',
      icono: 'M3 3h7v10H3zM14 3h7v6h-7zM14 13h7v8h-7zM3 17h7v4H3z',
      disponible: true
    },
    {
      nombre: 'Eventos',
      ruta: '/admin/eventos',
      icono: 'M8 3v4m8-4v4M4 10h16M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z',
      disponible: true
    },
    {
      nombre: 'Participantes',
      ruta: '/admin/participantes',
      icono: 'M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7 0a3 3 0 0 0 0-6m-13 15v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2zm15 0h3v-2a4 4 0 0 0-4-4',
      disponible: true
    },
    {
      nombre: 'Inscripciones',
      ruta: '/admin/inscripciones',
      icono: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-6 9v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2m1-9 2 2 4-4',
      disponible: true
    },
    {
      nombre: 'Ponentes',
      ruta: '/admin/ponentes',
      icono: 'M4 11V5h16v13h-8m-3-5a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-5 7v-2a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v2',
      disponible: true
    }
  ];
}
