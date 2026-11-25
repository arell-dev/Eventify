import { Component, computed, DestroyRef, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of, switchMap } from 'rxjs';
import { NotificacionesService } from '../../../comunes/notificaciones/notificaciones.service';
import { SesionService } from '../../../comunes/sesion/sesion.service';
import { AvisoDeCuenta } from '../../modelos/catalogo.model';
import { CatalogoService } from '../../servicios/catalogo.service';
import { fechaDia } from '../../utilidades/presentacion-evento';
import { IconoCatalogoComponent } from '../icono-catalogo';

@Component({
  selector: 'app-cabecera-publica',
  imports: [RouterLink, IconoCatalogoComponent],
  host: { '(document:click)': 'cerrarAlPulsarFuera($event)' },
  templateUrl: './cabecera-publica.html',
  styleUrl: './cabecera-publica.css'
})
export class CabeceraPublicaComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly catalogo = inject(CatalogoService);
  private readonly sesionService = inject(SesionService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly menu = viewChild<ElementRef<HTMLDetailsElement>>('menu');

  readonly detalle = input(false);
  readonly comprobandoSesion = input(true);

  protected readonly sesion = this.sesionService.sesion;
  protected readonly avisos = signal<AvisoDeCuenta[]>([]);
  protected readonly cerrandoSesion = signal(false);
  protected readonly actualizandoAviso = signal<number | null>(null);
  protected readonly fechaDia = fechaDia;

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

  protected readonly cuentaUsuario = computed(() => {
    const sesion = this.sesion();

    return !this.comprobandoSesion() && sesion?.rol === 'USUARIO' ? sesion.usuario : null;
  });

  constructor() {
    toObservable(this.cuentaUsuario).pipe(
      switchMap((cuenta) => {
        this.avisos.set([]);

        return cuenta
          ? this.catalogo.consultarAvisos().pipe(catchError(() => {
              this.notificaciones.mostrar('No se pudieron cargar tus notificaciones.', 'error');

              return of([]);
            }))
          : of([]);
      }),
      takeUntilDestroyed()
    ).subscribe((avisos) => this.avisos.set(avisos));
  }

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
      next: () => {
        this.avisos.set([]);
        this.cerrandoSesion.set(false);
      },
      error: () => {
        this.cerrandoSesion.set(false);
        this.notificaciones.mostrar('No se pudo cerrar la sesión.', 'error');
      }
    });
  }

  protected marcarLeido(aviso: AvisoDeCuenta): void {
    const cuenta = this.cuentaUsuario();

    this.actualizandoAviso.set(aviso.id);

    this.catalogo.marcarAvisoLeido(aviso.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (actualizado) => {
        if (this.cuentaUsuario() === cuenta) {
          this.avisos.update((avisos) => avisos.map((item) => item.id === actualizado.id ? actualizado : item));
        }

        this.actualizandoAviso.set(null);
      },
      error: () => {
        this.actualizandoAviso.set(null);
        this.notificaciones.mostrar('No se pudo actualizar la notificación.', 'error');
      }
    });
  }
}
