import { HttpErrorResponse } from '@angular/common/http';
import { Evento, Modalidad } from '../modelos/evento.model';

export const modalidades: Readonly<Record<Modalidad, string>> = {
  PRESENCIAL: 'Presencial',
  VIRTUAL: 'Virtual',
  HIBRIDO: 'Híbrido'
};

export const tiposHabituales = [
  { 
    valor: 'CONFERENCIA', 
    etiqueta: 'Conferencia' 
  },
  { 
    valor: 'TALLER', 
    etiqueta: 'Taller' 
  },
  { 
    valor: 'SEMINARIO', 
    etiqueta: 'Seminario' 
  }
];

export const etiquetaTipo = (tipo: string): string => {
  return tiposHabituales.find((opcion) => opcion.valor === tipo.toLocaleUpperCase('es'))?.etiqueta ?? tipo;
};

export const estadoTemporal = (evento: Evento, ahora: number): string => {
  if (ahora < Date.parse(evento.inicio)) {
    return 'Próximo';
  }

  return ahora < Date.parse(evento.fin) ? 'En curso' : 'Finalizado';
};

export const mensajeApi = (error: HttpErrorResponse, alternativa: string): string => {
  const mensaje = error.error?.mensaje;

  return typeof mensaje === 'string' && mensaje.trim() ? mensaje : alternativa;
};
