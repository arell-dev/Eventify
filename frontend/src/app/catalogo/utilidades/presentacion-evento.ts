import { toSignal } from '@angular/core/rxjs-interop';
import { map, timer } from 'rxjs';
import { EstadoEvento, EventoPublico, Modalidad } from '../modelos/catalogo.model';

export const nombresModalidad: Record<Modalidad, string> = {
  PRESENCIAL: 'Presencial',
  VIRTUAL: 'Virtual',
  HIBRIDO: 'Híbrido'
};

export const nombresEstado: Record<EstadoEvento, string> = {
  PROXIMO: 'Próximo',
  EN_CURSO: 'En curso',
  AGOTADO: 'Agotado',
  FINALIZADO: 'Finalizado'
};

const formatoDia = new Intl.DateTimeFormat('es-PE', {
  timeZone: 'America/Lima',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
});

const formatoHora = new Intl.DateTimeFormat('es-PE', {
  timeZone: 'America/Lima',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23'
});

export const relojCatalogo = () => toSignal(
  timer(0, 30000).pipe(map(() => Date.now())),
  { initialValue: Date.now() }
);

export const estadoEvento = (evento: EventoPublico, ahora: number): EstadoEvento => {
  if (ahora >= Date.parse(evento.fin)) {
    return 'FINALIZADO';
  }

  if (ahora >= Date.parse(evento.inicio)) {
    return 'EN_CURSO';
  }

  return evento.cuposDisponibles > 0 ? 'PROXIMO' : 'AGOTADO';
};

export const fechaDia = (fecha: string): string => formatoDia.format(new Date(fecha));

export const horarioEvento = (inicio: string, fin: string): string => {
  const inicioHora = formatoHora.format(new Date(inicio));
  const finHora = formatoHora.format(new Date(fin));

  if (fechaDia(inicio) === fechaDia(fin)) {
    return `${inicioHora}–${finHora}`;
  }

  return `${inicioHora} – ${fechaDia(fin)} · ${finHora}`;
};

export const enlaceEvento = (enlace: string): URL | null => {
  try {
    const url = new URL(enlace);

    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null;
  } catch {
    return null;
  }
};

export const plataformaEvento = (enlace: string): string => {
  const dominio = enlaceEvento(enlace)?.hostname.replace(/^www\./, '');

  if (dominio === 'zoom.us' || dominio?.endsWith('.zoom.us')) {
    return 'Zoom';
  }

  if (dominio === 'meet.google.com') {
    return 'Google Meet';
  }

  return dominio ?? '';
};

export const ubicacionEvento = (evento: EventoPublico): string => {
  const plataforma = plataformaEvento(evento.enlace);

  if (evento.modalidad === 'VIRTUAL') {
    return plataforma ? `Transmisión vía ${plataforma}` : 'Enlace virtual no disponible';
  }

  return [evento.lugar, plataforma].filter(Boolean).join(' y ');
};

export const textoCupos = (cupos: number): string => {
  return cupos === 1 ? '1 cupo disponible' : `${cupos} cupos disponibles`;
};
