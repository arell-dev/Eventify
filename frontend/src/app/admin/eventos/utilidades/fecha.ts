const zonaHoraria = 'America/Lima';
const desfaseLima = '-05:00';

const fechaCorta = new Intl.DateTimeFormat('en-GB', {
  timeZone: zonaHoraria,
  day: '2-digit',
  month: '2-digit'
});

const fechaCompleta = new Intl.DateTimeFormat('en-GB', {
  timeZone: zonaHoraria,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
});

const hora = new Intl.DateTimeFormat('es-PE', {
  timeZone: zonaHoraria,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23'
});

const fechaFormulario = new Intl.DateTimeFormat('sv-SE', {
  timeZone: zonaHoraria,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23'
});

export const formatearFechaRegistro = (fecha: string): string => {
  const instante = new Date(fecha);

  return `${fechaCompleta.format(instante)} ${hora.format(instante)}`;
};

export const formatearHorario = (inicio: string, fin: string, incluirAnio = false): string => {
  const fechaInicio = new Date(inicio);
  const fechaFin = new Date(fin);
  const formato = incluirAnio ? fechaCompleta : fechaCorta;

  if (fechaCompleta.format(fechaInicio) !== fechaCompleta.format(fechaFin)) {
    return `${formato.format(fechaInicio)} · ${hora.format(fechaInicio)} – ${formato.format(fechaFin)} · ${hora.format(fechaFin)}`;
  }

  return `${formato.format(fechaInicio)} · ${hora.format(fechaInicio)}–${hora.format(fechaFin)}`;
};

export const aFechaFormulario = (fecha: string): string => {
  const instante = new Date(fecha);
  const fechaLocal = fechaFormulario.format(instante).replace(' ', 'T');
  const milisegundos = instante.getUTCMilliseconds();

  return milisegundos ? `${fechaLocal}.${String(milisegundos).padStart(3, '0')}` : fechaLocal;
};

// Interpreta la fecha civil en Lima aunque el navegador use otra zona horaria.
export const aFechaUtc = (fecha: string): string | null => {
  const partes = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(fecha);

  if (!partes) {
    return null;
  }

  const [, fechaYHora, segundos = '00', fraccion = ''] = partes;
  const fechaConSegundos = `${fechaYHora}:${segundos}`;
  const instante = new Date(`${fechaConSegundos}.${fraccion.padEnd(3, '0')}${desfaseLima}`);

  if (!Number.isFinite(instante.getTime()) || aFechaFormulario(instante.toISOString()).slice(0, 19) !== fechaConSegundos) {
    return null;
  }

  return instante.toISOString();
};
