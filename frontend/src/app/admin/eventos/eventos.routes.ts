import { Routes } from '@angular/router';
import { EventosComponent } from './eventos.component';

export const rutasEventos: Routes = [
  {
    path: '',
    component: EventosComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Eventos | Eventos UTP',
        loadComponent: () => import('./paginas/lista/lista.component')
          .then((modulo) => modulo.EventosListaComponent)
      },
      {
        path: 'nuevo',
        title: 'Registrar evento | Eventos UTP',
        loadComponent: () => import('./paginas/formulario/formulario.component')
          .then((modulo) => modulo.EventoFormularioComponent)
      },
      {
        path: ':id/editar',
        title: 'Editar evento | Eventos UTP',
        loadComponent: () => import('./paginas/formulario/formulario.component')
          .then((modulo) => modulo.EventoFormularioComponent)
      },
      {
        path: ':id',
        title: 'Detalle del evento | Eventos UTP',
        loadComponent: () => import('./paginas/detalle/detalle.component')
          .then((modulo) => modulo.EventoDetalleComponent)
      }
    ]
  }
];
