export interface Ponente {
  id: number;
  usuarioId: number;
  nombre: string;
  correo: string;
  especialidad: string;
}

export interface UsuarioElegiblePonente {
  id: number;
  nombre: string;
  correo: string;
  especialidad: string;
}

export interface EventoAgendaPonente {
  id: number;
  titulo: string;
  tipo: string;
  modalidad: 'PRESENCIAL' | 'VIRTUAL' | 'HIBRIDO';
  lugar: string;
  enlace: string;
  inicio: string;
  fin: string;
  cupo: number;
  ponenteId: number;
}

export interface DatosEdicionPonente {
  nombre: string;
  correo: string;
  especialidad: string;
}
