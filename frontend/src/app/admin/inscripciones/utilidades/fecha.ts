const formatoFecha = new Intl.DateTimeFormat('es-PE', {
  timeZone: 'America/Lima',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23'
});

export const formatearFechaInscripcion = (fecha: string): string => {
  return formatoFecha.format(new Date(fecha));
};
