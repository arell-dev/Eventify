import { Injectable, signal } from '@angular/core';

export type TipoAviso = 'exito' | 'error' | 'informacion';

export interface Aviso {
  id: number;
  mensaje: string;
  tipo: TipoAviso;
  titulo: string | null;
}

export interface OpcionesAviso {
  tipo?: TipoAviso;
  titulo?: string;
  duracionMs?: number;
}

// Servicio global para que cualquier módulo publique avisos sin crear banners propios.
@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  readonly avisos = signal<Aviso[]>([]);
  private siguienteId = 1;
  private readonly maxAvisosVisibles = 3;
  private readonly temporizadores = new Map<number, ReturnType<typeof setTimeout>>();

  // Admite opciones por aviso; duración cero mantiene el mensaje hasta cerrarlo manualmente.
  mostrar(mensaje: string, opciones: TipoAviso | OpcionesAviso = 'exito'): void {
    const opcionesAviso = typeof opciones === 'string' ? { tipo: opciones } : opciones;
    const tipo = opcionesAviso.tipo ?? 'exito';
    const aviso: Aviso = {
      id: this.siguienteId++,
      mensaje,
      tipo,
      titulo: opcionesAviso.titulo?.trim() || null
    };

    const avisosActualizados = [...this.avisos(), aviso];
    const cantidadAvisosDescartados = Math.max(
      avisosActualizados.length - this.maxAvisosVisibles,
      0
    );
    const avisosDescartados = avisosActualizados.slice(0, cantidadAvisosDescartados);

    avisosDescartados.forEach((avisoDescartado) => {
      this.cancelarTemporizador(avisoDescartado.id);
    });

    this.avisos.set(avisosActualizados.slice(-this.maxAvisosVisibles));

    const duracionMs = opcionesAviso.duracionMs ?? (tipo === 'error' ? 12000 : 7000);

    if (duracionMs > 0) {
      const temporizador = setTimeout(() => this.cerrar(aviso.id), duracionMs);
      this.temporizadores.set(aviso.id, temporizador);
    }
  }

  // Retira un aviso y libera también el temporizador asociado.
  cerrar(id: number): void {
    this.cancelarTemporizador(id);
    this.avisos.update((avisos) => avisos.filter((aviso) => aviso.id !== id));
  }

  private cancelarTemporizador(id: number): void {
    const temporizador = this.temporizadores.get(id);

    if (temporizador) {
      clearTimeout(temporizador);
      this.temporizadores.delete(id);
    }
  }
}
