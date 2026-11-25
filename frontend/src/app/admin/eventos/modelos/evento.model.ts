import type { Inscripcion } from '../../inscripciones/modelos/inscripcion.model';

export type Modalidad = 'PRESENCIAL' | 'VIRTUAL' | 'HIBRIDO';

export interface DatosEvento {
  titulo: string;
  descripcion: string;
  tipo: string;
  modalidad: Modalidad;
  lugar: string;
  enlace: string;
  inicio: string;
  fin: string;
  cupo: number;
  ponenteId: number;
}

export interface Evento extends DatosEvento {
  id: number;
  inscripcionesConfirmadas: number;
  cuposDisponibles: number;
}

export interface Ponente {
  id: number;
  nombre: string;
  correo: string;
  especialidad: string;
}

export interface InscripcionEvento extends Inscripcion {
  participanteCarrera: string;
}
