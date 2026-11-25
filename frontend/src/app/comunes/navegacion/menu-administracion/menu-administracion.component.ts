import { NgTemplateOutlet } from '@angular/common';
import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { NotificacionesService } from '../../notificaciones/notificaciones.service';
import { SesionService } from '../../sesion/sesion.service';

// Describe una opción del menú y si su ruta ya está integrada.
interface ModuloAdministrativo {
  nombre: string;
  ruta: string;
  icono: string;
  disponible: boolean;
}

@Component({
  selector: 'app-menu-administracion',
  imports: [NgTemplateOutlet, RouterLink, RouterLinkActive],
  templateUrl: './menu-administracion.html',
  styleUrl: './menu-administracion.css'
})
// Gestiona los enlaces administrativos y el panel modal para pantallas pequeñas.
export class MenuAdministracionComponent {
  private readonly router = inject(Router);
  private readonly sesion = inject(SesionService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly dialogoMovil = viewChild<ElementRef<HTMLDialogElement>>('menuMovil');

  readonly menuAbierto = signal(false);
  readonly sesionActual = this.sesion.sesion;

  // Destruye la sesión antes de regresar a la pantalla de acceso.
  cerrarSesion(): void {
    this.sesion.cerrar().subscribe({
      next: () => {
        this.cerrarMenu();
        void this.router.navigate(['/admin/acceso']);
      },
      error: () => {
        this.notificaciones.mostrar('No se pudo cerrar la sesión. Inténtalo de nuevo.', 'error');
      }
    });
  }

  // Centraliza las rutas para que los módulos compartan el mismo orden e identidad visual.
  readonly modulos: ModuloAdministrativo[] = [
    {
      nombre: 'Inicio',
      ruta: '/admin/inicio',
      icono: 'M3 13h8V3H3zm10 8h8v-6h-8zm0-10h8V3h-8zm-10 10h8v-6H3z',
      disponible: false
    },
    {
      nombre: 'Eventos',
      ruta: '/admin/eventos',
      icono: 'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2z',
      disponible: false
    },
    {
      nombre: 'Participantes',
      ruta: '/admin/participantes',
      icono: 'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m6-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm10 10v-2a4 4 0 0 0-3-3.87m-1-11.13a4 4 0 0 1 0 7.75',
      disponible: true
    },
    {
      nombre: 'Inscripciones',
      ruta: '/admin/inscripciones',
      icono: 'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m6-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8m9-3 2 2 4-4',
      disponible: true
    },
    {
      nombre: 'Ponentes',
      ruta: '/admin/ponentes',
      icono: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-6 9v-2a6 6 0 0 1 12 0v2m1-14 1.1 2.2 2.4.3-1.75 1.7.4 2.4-2.15-1.15-2.15 1.15.4-2.4-1.75-1.7 2.4-.3L19 7z',
      disponible: true
    }
  ];

  // Abre el panel nativo para que el navegador gestione foco, Escape y modalidad.
  abrirMenu(): void {
    const dialogo = this.dialogoMovil()?.nativeElement;

    if (!dialogo || dialogo.open) {
      return;
    }

    dialogo.showModal();
    this.menuAbierto.set(true);
  }

  // Cierra el panel cuando se elige una ruta o se pulsa el botón de cierre.
  cerrarMenu(): void {
    const dialogo = this.dialogoMovil()?.nativeElement;

    if (dialogo?.open) {
      dialogo.close();
    }

    this.menuAbierto.set(false);
  }

  // Cierra el panel al pulsar la zona oscura que queda fuera del cajón.
  cerrarAlHacerClicFuera(evento: MouseEvent): void {
    const dialogo = this.dialogoMovil()?.nativeElement;

    if (!dialogo || evento.target !== dialogo) {
      return;
    }

    const limites = dialogo.getBoundingClientRect();
    const clicFuera = evento.clientX < limites.left || evento.clientX > limites.right;

    if (clicFuera) {
      this.cerrarMenu();
    }
  }

  // Mantiene sincronizado el estado accesible cuando el navegador cierra el diálogo.
  alCerrarMenu(): void {
    this.menuAbierto.set(false);
  }
}
