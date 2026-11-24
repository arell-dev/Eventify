// Estados permitidos por las reglas de Inscripciones y su API.
export type EstadoInscripcion = 'CONFIRMADA' | 'CANCELADA';

// Representación enriquecida que devuelve la API para mostrar relaciones y cupos.
export interface Inscripcion {
  id: number;
  eventoId: number;
  participanteId: number;
  estado: EstadoInscripcion;
  fechaRegistro: string;
  eventoTitulo: string;
  eventoInicio: string | null;
  eventoFin: string | null;
  cupoEvento: number | null;
  inscripcionesConfirmadas: number | null;
  cuposDisponibles: number | null;
  participanteNombre: string;
  participanteCorreo: string;
}

// Campos del catálogo de Eventos necesarios para validar el alta.
export interface EventoOpcion {
  id: number;
  titulo: string;
  inicio: string;
  fin: string;
  modalidad: 'PRESENCIAL' | 'VIRTUAL' | 'HIBRIDO';
  cupo: number;
  cuposDisponibles: number;
}

// Campos del catálogo de Participantes necesarios para el formulario.
export interface ParticipanteOpcion {
  id: number;
  nombre: string;
  correo: string;
  carrera: string;
}

export interface CrearInscripcion {
  eventoId: number;
  participanteId: number;
}

export interface ActualizarEstadoInscripcion {
  estado: EstadoInscripcion;
}
