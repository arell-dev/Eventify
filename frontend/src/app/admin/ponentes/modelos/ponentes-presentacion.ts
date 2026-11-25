import { HttpErrorResponse } from '@angular/common/http';

export function normalizarBusqueda(texto: string): string {
  return texto.trim().toLocaleLowerCase('es').normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

export function mensajeErrorPonentes(error: HttpErrorResponse): string {
  if (error.status === 0) {
    return 'No se pudo conectar con el servidor. Intenta de nuevo.';
  }

  const mensaje: unknown = error.error?.mensaje;

  return typeof mensaje === 'string' && mensaje.trim()
    ? mensaje
    : 'No se pudo completar la operación.';
}
