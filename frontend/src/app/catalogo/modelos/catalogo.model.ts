export type Modalidad = 'PRESENCIAL' | 'VIRTUAL' | 'HIBRIDO';
export type EstadoEvento = 'PROXIMO' | 'EN_CURSO' | 'AGOTADO' | 'FINALIZADO';

export interface EventoPublico {
  id: number;
  titulo: string;
  descripcion: string;
  tipo: string;
  modalidad: Modalidad;
  lugar: string;
  enlace: string;
  inicio: string;
  fin: string;
  nombrePonente: string;
  cupo: number;
  cuposDisponibles: number;
}

export interface InscripcionPropia {
  estado: 'CONFIRMADA' | 'CANCELADA';
}

export interface AvisoDeCuenta {
  id: number;
  eventoId: number;
  mensaje: string;
  fecha: string;
  leida: boolean;
}
