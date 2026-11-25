import { Routes } from '@angular/router';
import { requiereSesionAdmin } from './comunes/sesion/sesion.guard';

// Reúne las rutas administrativas bajo el menú compartido.
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'admin/acceso'
  },
  {
    path: 'admin/acceso',
    title: 'Iniciar sesión | Eventos UTP',
    loadComponent: () => import('./admin/acceso/acceso.component')
      .then((modulo) => modulo.AccesoAdministrativoComponent)
  },
  {
    path: 'admin',
    title: 'Administración | Eventos UTP',
    canActivate: [requiereSesionAdmin],
    loadComponent: () => import('./comunes/navegacion/administracion/administracion.component')
      .then((modulo) => modulo.AdministracionComponent),
    children: [
      {
        path: 'eventos',
        loadChildren: () => import('./admin/eventos/eventos.routes')
          .then((modulo) => modulo.rutasEventos)
      },
      {
        path: 'participantes',
        children: [
          {
            path: '',
            pathMatch: 'full',
            title: 'Participantes | Eventos UTP',
            loadComponent: () => import('./admin/participantes/participantes')
              .then((modulo) => modulo.Participantes)
          },
          {
            path: 'nuevo',
            title: 'Registrar participante | Eventos UTP',
            loadComponent: () => import('./admin/participantes/seleccionar-usuario')
              .then((modulo) => modulo.SeleccionarUsuario)
          },
          {
            path: ':id',
            title: 'Detalle del participante | Eventos UTP',
            loadComponent: () => import('./admin/participantes/participante-detalle')
              .then((modulo) => modulo.ParticipanteDetalle)
          }
        ]
      },
      {
        path: 'inscripciones',
        title: 'Inscripciones | Eventos UTP',
        loadComponent: () => import('./admin/inscripciones/inscripciones.component')
          .then((modulo) => modulo.InscripcionesComponent),
        children: [
          {
            path: '',
            pathMatch: 'full',
            title: 'Inscripciones | Eventos UTP',
            loadComponent: () => import('./admin/inscripciones/paginas/lista/lista.component')
              .then((modulo) => modulo.InscripcionesListaComponent)
          },
          {
            path: 'nueva',
            title: 'Nueva inscripción | Eventos UTP',
            loadComponent: () => import('./admin/inscripciones/paginas/formulario/formulario.component')
              .then((modulo) => modulo.InscripcionFormularioComponent)
          },
          {
            path: ':id/editar',
            title: 'Editar inscripción | Eventos UTP',
            loadComponent: () => import('./admin/inscripciones/paginas/edicion/edicion.component')
              .then((modulo) => modulo.InscripcionEdicionComponent)
          },
          {
            path: ':id',
            title: 'Detalle de inscripción | Eventos UTP',
            loadComponent: () => import('./admin/inscripciones/paginas/detalle/detalle.component')
              .then((modulo) => modulo.InscripcionDetalleComponent)
          }
        ]
      },
      {
        path: 'ponentes',
        loadComponent: () => import('./admin/ponentes/ponentes.component')
          .then((modulo) => modulo.PonentesComponent),
        children: [
          {
            path: '',
            pathMatch: 'full',
            title: 'Ponentes | Eventos UTP',
            loadComponent: () => import('./admin/ponentes/paginas/lista/lista.component')
              .then((modulo) => modulo.PonentesListaComponent)
          },
          {
            path: 'nuevo',
            title: 'Registrar ponente | Eventos UTP',
            loadComponent: () => import('./admin/ponentes/paginas/seleccion/seleccion.component')
              .then((modulo) => modulo.PonenteSeleccionComponent)
          },
          {
            path: ':id/editar',
            title: 'Editar ponente | Eventos UTP',
            loadComponent: () => import('./admin/ponentes/paginas/edicion/edicion.component')
              .then((modulo) => modulo.PonenteEdicionComponent)
          },
          {
            path: ':id',
            title: 'Detalle del ponente | Eventos UTP',
            loadComponent: () => import('./admin/ponentes/paginas/detalle/detalle.component')
              .then((modulo) => modulo.PonenteDetalleComponent)
          }
        ]
      }
    ]
  }
];
