import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { ConfirmacionService } from '../../admin/inscripciones/componentes/confirmacion/confirmacion.service';
import { NotificacionesService } from '../../comunes/notificaciones/notificaciones.service';
import { SesionService } from '../../comunes/sesion/sesion.service';
import { CancelacionInscripcion, EventoPublico } from '../modelos/catalogo.model';
import { CatalogoService } from './catalogo.service';

// Aplica la misma confirmación y el mismo tratamiento de errores en ambas vistas públicas.
@Injectable()
export class CancelarInscripcionService {
  private readonly catalogo = inject(CatalogoService);
  private readonly confirmacion = inject(ConfirmacionService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly sesion = inject(SesionService).sesion;
  private readonly ciclo = inject(DestroyRef);
  private confirmando = false;

  readonly eventoEnProceso = signal<number | null>(null);

  constructor() {
    this.ciclo.onDestroy(() => {
      if (this.confirmando) {
        this.confirmacion.resolverSolicitud(false);
      }
    });
  }

  async solicitar(evento: EventoPublico, vigente: () => boolean, recargar: () => void): Promise<CancelacionInscripcion | null> {
    const sesion = this.sesion();

    if (this.eventoEnProceso() !== null || sesion?.rol !== 'USUARIO' || !(Date.parse(evento.inicio) > Date.now())) {
      return null;
    }

    this.eventoEnProceso.set(evento.id);

    try {
      this.confirmando = true;
      const confirmado = await this.confirmacion.solicitar(`¿Deseas cancelar tu inscripción a «${evento.titulo}»?`);
      this.confirmando = false;

      if (!confirmado || this.ciclo.destroyed || this.sesion() !== sesion || !vigente()) {
        return null;
      }

      const resultado = await firstValueFrom(
        this.catalogo.cancelarInscripcion(evento.id).pipe(takeUntilDestroyed(this.ciclo)),
        { defaultValue: null }
      );

      if (resultado && !this.ciclo.destroyed && this.sesion() === sesion && vigente()) {
        this.notificaciones.mostrar('Tu inscripción fue cancelada.');

        return resultado;
      }
    } catch (error) {
      if (error instanceof HttpErrorResponse && !this.ciclo.destroyed && this.sesion() === sesion && vigente()) {
        this.notificaciones.mostrar(error.error?.mensaje || 'No se pudo cancelar la inscripción.', 'error');

        if (error.status === 401) {
          this.sesion.set(null);
        }

        if (error.status === 404 || error.status === 409) {
          recargar();
        }
      }
    } finally {
      this.eventoEnProceso.set(null);
    }

    return null;
  }
}
