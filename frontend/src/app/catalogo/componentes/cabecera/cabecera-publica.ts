import { Component, computed, DestroyRef, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { NotificacionesService } from '../../../comunes/notificaciones/notificaciones.service';
import { SesionService } from '../../../comunes/sesion/sesion.service';
import { IconoCatalogoComponent } from '../icono-catalogo';
import { PanelNotificacionesComponent } from '../panel-notificaciones/panel-notificaciones.component';

@Component({
  selector: 'app-cabecera-publica',
  imports: [RouterLink, IconoCatalogoComponent, PanelNotificacionesComponent],
  host: { '(document:click)': 'cerrarAlPulsarFuera($event)' },
  templateUrl: './cabecera-publica.html',
  styleUrl: './cabecera-publica.css'
})
export class CabeceraPublicaComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly sesionService = inject(SesionService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly menu = viewChild<ElementRef<HTMLDetailsElement>>('menu');

  readonly detalle = input(false);
  readonly comprobandoSesion = input(true);

  protected readonly sesion = this.sesionService.sesion;
  protected readonly cerrandoSesion = signal(false);

  protected readonly nombreCuenta = computed(() => {
    const cuenta = this.sesion();

    return cuenta?.perfil?.nombre.trim() || cuenta?.usuario || '';
  });

  protected readonly inicialesCuenta = computed(() => {
    const cuenta = this.sesion();
    const nombre = cuenta?.perfil?.nombre.trim() || this.nombreCuenta().split('@')[0];

    return nombre.split(/[\s._-]+/u).filter(Boolean).slice(0, 2)
      .map((parte) => Array.from(parte)[0]).join('').toLocaleUpperCase('es');
  });

  protected readonly mostrarCampana = computed(() => {
    const rol = this.sesion()?.rol;

    return !this.comprobandoSesion() && (rol === 'USUARIO' || (!this.detalle() && !rol));
  });

  protected cerrarMenu(evento: Event, menu: HTMLDetailsElement, activador: HTMLElement): void {
    if (menu.open) {
      evento.preventDefault();
      menu.open = false;
      activador.focus();
    }
  }

  protected cerrarAlPulsarFuera(evento: Event): void {
    this.cerrarSiEstaFuera(this.menu()?.nativeElement, evento.target);
  }

  protected cerrarAlPerderFoco(evento: FocusEvent, menu: HTMLDetailsElement): void {
    this.cerrarSiEstaFuera(menu, evento.relatedTarget);
  }

  private cerrarSiEstaFuera(menu: HTMLDetailsElement | undefined, destino: EventTarget | null): void {
    if (menu?.open && destino instanceof Node && !menu.contains(destino)) {
      menu.open = false;
    }
  }

  protected cerrarSesion(): void {
    this.cerrandoSesion.set(true);

    this.sesionService.cerrar().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.cerrandoSesion.set(false),
      error: () => {
        this.cerrandoSesion.set(false);
        this.notificaciones.mostrar('No se pudo cerrar la sesión.', 'error');
      }
    });
  }
}
