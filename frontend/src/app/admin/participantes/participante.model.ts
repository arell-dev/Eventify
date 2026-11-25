export interface DatosParticipante {
  nombre: string;
  correo: string;
  carrera: string;
}

export interface Participante extends DatosParticipante {
  id: number;
  usuarioId: number;
}

export interface UsuarioDisponible extends DatosParticipante {
  id: number;
  rol: string;
}

export interface Inscripcion {
  id: number;
  eventoId: number;
  eventoTitulo: string;
  participanteId: number;
  estado: 'CONFIRMADA' | 'CANCELADA';
  fechaRegistro: string;
}
