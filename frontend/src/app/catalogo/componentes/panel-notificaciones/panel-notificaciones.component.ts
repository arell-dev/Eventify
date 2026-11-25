import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { catchError, EMPTY, exhaustMap, filter, finalize, fromEvent, merge, of, Subject, switchMap, takeUntil, tap, timer } from 'rxjs';
import { SesionService } from '../../../comunes/sesion/sesion.service';
import { AvisoDeCuenta } from '../../modelos/catalogo.model';
import { CatalogoService } from '../../servicios/catalogo.service';
import { fechaDia } from '../../utilidades/presentacion-evento';
import { IconoCatalogoComponent } from '../icono-catalogo';

// Gestiona la campana y los avisos privados de la cuenta activa.
@Component({
  selector: 'app-panel-notificaciones',
  imports: [RouterLink, IconoCatalogoComponent],
  templateUrl: './panel-notificaciones.html',
  styleUrl: './panel-notificaciones.css'
})

export class PanelNotificacionesComponent {
  private readonly documento = inject(DOCUMENT);
  private readonly catalogo = inject(CatalogoService);
  private readonly sesion = inject(SesionService).sesion;
  private readonly router = inject(Router);
  private readonly panel = viewChild<ElementRef<HTMLDialogElement>>('panel');
  private readonly consultas = new Subject<void>();
  private readonly lecturas = new Subject<AvisoDeCuenta>();
  private readonly avisos = signal<AvisoDeCuenta[] | null>(null);
  private apertura = 0;

  protected readonly cuentaUsuario = computed(() => {
    const cuenta = this.sesion();

    return cuenta?.rol === 'USUARIO' ? cuenta.usuario : null;
  });

  protected readonly abierto = signal(false);
  protected readonly verTodas = signal(false);
  protected readonly consultando = signal(false);
  protected readonly errorConsulta = signal(false);
  protected readonly errorLectura = signal(false);
  protected readonly actualizandoAviso = signal<number | null>(null);
  protected readonly cargando = computed(() => this.avisos() === null && !this.errorConsulta());
  protected readonly fechaDia = fechaDia;

  protected readonly pendientes = computed(() => {
    return this.avisos()?.filter((aviso) => !aviso.leida).length ?? 0;
  });

  protected readonly etiqueta = computed(() => {
    const cantidad = this.pendientes();

    if (cantidad === 0) {
      return 'Notificaciones';
    }

    return 'Notificaciones, ' + cantidad + (cantidad === 1 ? ' no leída' : ' no leídas');
  });

  protected readonly avisosVisibles = computed(() => {
    const avisos = this.avisos() ?? [];
    const visibles = this.verTodas() ? avisos : avisos.filter((aviso) => !aviso.leida);

    return [...visibles].sort((primero, segundo) => {
      return Date.parse(segundo.fecha) - Date.parse(primero.fecha) || segundo.id - primero.id;
    });
  });

  constructor() {
    // Cambiar de cuenta cancela las solicitudes de la sesión anterior.
    toObservable(this.cuentaUsuario).pipe(
      switchMap((cuenta) => {
        this.cerrar();
        this.avisos.set(null);
        this.errorConsulta.set(false);

        return cuenta ? merge(this.consultarDuranteSesion(cuenta), this.leerDuranteSesion(cuenta)) : EMPTY;
      }),
      takeUntilDestroyed()
    ).subscribe();
  }

  protected abrir(): void {
    const panel = this.panel()?.nativeElement;

    if (!panel || panel.open) {
      return;
    }

    this.apertura += 1;
    this.verTodas.set(false);
    this.errorLectura.set(false);
    panel.showModal();
    this.abierto.set(true);
    this.recargar();
  }

  protected cerrar(): void {
    this.panel()?.nativeElement.close();
    this.abierto.set(false);
  }

  protected alCerrar(): void {
    if (!this.panel()?.nativeElement.open) {
      this.abierto.set(false);
    }
  }

  protected alPulsarFondo(evento: MouseEvent, panel: HTMLDialogElement): void {
    if ('closedBy' in HTMLDialogElement.prototype || evento.target !== panel) {
      return;
    }

    if (evento.clientX < panel.getBoundingClientRect().left) {
      this.cerrar();
    }
  }

  protected recargar(): void {
    this.consultas.next();
  }

  protected seleccionarAviso(aviso: AvisoDeCuenta): void {
    if (!this.cuentaUsuario() || this.actualizandoAviso() !== null) {
      return;
    }

    if (aviso.leida) {
      this.irAlEvento(aviso.eventoId);
      return;
    }

    this.lecturas.next(aviso);
  }

  private irAlEvento(eventoId: number): void {
    this.cerrar();
    void this.router.navigate(['/eventos', eventoId]);
  }

  private limpiarSesionVencida(): void {
    this.avisos.set(null);
    this.sesion.set(null);
  }

  private consultarDuranteSesion(cuenta: string) {
    // Actualiza al abrir el panel o al volver a una pestaña visible.
    return merge(of(undefined), this.consultas, timer(30_000, 30_000), fromEvent(this.documento, 'visibilitychange')).pipe(
      filter(() => this.documento.visibilityState === 'visible' && this.actualizandoAviso() === null),
      exhaustMap(() => {
        this.consultando.set(true);

        return this.catalogo.consultarAvisos().pipe(
          // Una consulta anterior a la lectura podría devolver el estado pendiente.
          takeUntil(this.lecturas),
          tap((avisos) => {
            if (this.cuentaUsuario() === cuenta) {
              this.avisos.set(avisos);
              this.errorConsulta.set(false);
            }
          }),
          catchError((error: HttpErrorResponse) => {
            if (this.cuentaUsuario() === cuenta) {
              if (error.status === 401) {
                this.limpiarSesionVencida();
              } else {
                if (error.status === 403) {
                  this.avisos.set(null);
                }

                this.errorConsulta.set(true);
              }
            }

            return EMPTY;
          }),
          finalize(() => this.consultando.set(false))
        );
      })
    );
  }

  private leerDuranteSesion(cuenta: string) {
    return this.lecturas.pipe(
      exhaustMap((aviso) => {
        const apertura = this.apertura;

        this.actualizandoAviso.set(aviso.id);
        this.errorLectura.set(false);

        return this.catalogo.marcarAvisoLeido(aviso.id).pipe(
          tap((actualizado) => {
            if (this.cuentaUsuario() !== cuenta) {
              return;
            }

            this.avisos.update((avisos) => avisos?.map((item) => item.id === actualizado.id ? actualizado : item) ?? null);

            // Si el usuario cerró el panel durante la solicitud, solo se guarda la lectura.
            if (this.apertura === apertura && this.panel()?.nativeElement.open) {
              this.irAlEvento(actualizado.eventoId);
            }
          }),
          catchError((error: HttpErrorResponse) => {
            if (this.cuentaUsuario() === cuenta) {
              if (error.status === 401) {
                this.limpiarSesionVencida();
              } else if (this.apertura === apertura) {
                this.errorLectura.set(true);
              }
            }

            return EMPTY;
          }),
          finalize(() => this.actualizandoAviso.set(null))
        );
      })
    );
  }
}
