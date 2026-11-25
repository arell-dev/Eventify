import { Component, DestroyRef, ElementRef, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterOutlet } from '@angular/router';
import { fromEvent } from 'rxjs';
import { NotificacionesService } from '../../notificaciones/notificaciones.service';
import { SesionService } from '../../sesion/sesion.service';
import { CabeceraMovilComponent } from '../cabecera-movil/cabecera-movil.component';
import { ContenidoMenuComponent } from '../contenido-menu/contenido-menu.component';
import { PanelMovilComponent } from '../panel-movil/panel-movil.component';

// Coordina la navegación y sesión compartidas por los módulos administrativos.
@Component({
  selector: 'app-administracion',
  imports: [CabeceraMovilComponent, ContenidoMenuComponent, PanelMovilComponent, RouterOutlet],
  templateUrl: './administracion.html',
  styleUrl: './administracion.css'
})
export class AdministracionComponent {
  private readonly router = inject(Router);
  private readonly sesion = inject(SesionService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cabecera = viewChild.required(CabeceraMovilComponent);
  private readonly menuEscritorio = viewChild.required<ElementRef<HTMLElement>>('menuEscritorio');
  private readonly contenidoPrincipal = viewChild.required<ElementRef<HTMLElement>>('contenidoPrincipal');
  private vistaEscritorio?: MediaQueryList;

  protected readonly panelMovil = viewChild.required(PanelMovilComponent);
  protected readonly menuAbierto = signal(false);
  protected readonly cerrandoSesion = signal(false);
  protected readonly usuario = computed(() => this.sesion.sesion()?.usuario ?? 'Administrador');

  constructor() {
    afterNextRender(() => {
      this.vistaEscritorio = window.matchMedia('(min-width: 992px)');

      fromEvent<MediaQueryListEvent>(this.vistaEscritorio, 'change')
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((evento) => {
          if (evento.matches) {
            void this.panelMovil().cerrar(true);
          }
        });
    });
  }

  protected abrirMenu(): void {
    if (!this.vistaEscritorio?.matches && this.panelMovil().abrir()) {
      this.menuAbierto.set(true);
    }
  }

  protected alCerrarMenu(): void {
    this.menuAbierto.set(false);

    if (this.vistaEscritorio?.matches) {
      const enlaceActivo = this.menuEscritorio().nativeElement.querySelector<HTMLElement>('[aria-current="page"]');
      const destino = enlaceActivo ?? this.contenidoPrincipal().nativeElement;

      destino.focus({ preventScroll: true });
      return;
    }

    this.cabecera().enfocarActivador();
  }

  protected cerrarSesion(): void {
    if (this.cerrandoSesion()) {
      return;
    }

    this.cerrandoSesion.set(true);
    this.sesion.cerrar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          void this.panelMovil().cerrar(true);
          void this.router.navigate(['/admin/acceso']);
        },
        error: () => {
          void this.informarErrorDeSalida();
        }
      });
  }

  private async informarErrorDeSalida(): Promise<void> {
    await this.panelMovil().cerrar();
    this.cerrandoSesion.set(false);
    this.notificaciones.mostrar('No se pudo cerrar la sesión. Inténtalo de nuevo.', 'error');
  }
}
