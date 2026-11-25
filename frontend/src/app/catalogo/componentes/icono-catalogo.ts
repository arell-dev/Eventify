import { Component, input } from '@angular/core';

type Icono = 'acceso' | 'volver' | 'buscar' | 'hora' | 'lugar' | 'video' | 'ponente'
  | 'desplegar' | 'administracion' | 'salir' | 'campana' | 'cerrar';

@Component({
  selector: 'app-icono-catalogo',
  host: { 'aria-hidden': 'true' },
  styles: [`
    :host {
      display: inline-flex;
      flex: none;
      width: 1em;
      height: 1em;
    }
  `],
  template: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false">
      @switch (nombre()) {
        @case ('acceso') {
          <path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7M3 12h12m-5-5 5 5-5 5"/>
        }
        @case ('volver') {
          <path d="m11 5-7 7 7 7M4 12h16"/>
        }
        @case ('buscar') {
          <circle cx="10.5" cy="10.5" r="6.5"/>
          <path d="m16 16 4.5 4.5"/>
        }
        @case ('hora') {
          <circle cx="12" cy="12" r="9"/>
          <path d="M12 7v5l3 2"/>
        }
        @case ('lugar') {
          <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/>
          <circle cx="12" cy="10" r="2"/>
        }
        @case ('video') {
          <rect x="3" y="6" width="13" height="12" rx="2"/>
          <path d="m16 10 5-3v10l-5-3"/>
        }
        @case ('ponente') {
          <circle cx="9" cy="7" r="3"/>
          <path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5h5v12h-3"/>
        }
        @case ('desplegar') {
          <path d="m6 9 6 6 6-6"/>
        }
        @case ('administracion') {
          <rect x="4" y="4" width="16" height="16" rx="2"/>
          <path d="M4 9h16m-9 0v11"/>
        }
        @case ('salir') {
          <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4m-1-8h11m-4-4 4 4-4 4"/>
        }
        @case ('campana') {
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 9h18c0-1-3-2-3-9m-8 12a2 2 0 0 0 4 0"/>
        }
        @case ('cerrar') {
          <path d="m6 6 12 12M18 6 6 18"/>
        }
      }
    </svg>
  `
})
export class IconoCatalogoComponent {
  readonly nombre = input.required<Icono>();
}
