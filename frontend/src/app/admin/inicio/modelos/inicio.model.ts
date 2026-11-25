import { HttpErrorResponse } from '@angular/common/http';
import { Evento } from '../../eventos/modelos/evento.model';
import { Participante } from '../../participantes/participante.model';
import { Ponente } from '../../ponentes/modelos/ponente.model';

export type ResultadoConsulta<Datos> =
  | { datos: Datos; error: null }
  | { datos: null; error: HttpErrorResponse };

export interface DatosInicio {
  eventos: ResultadoConsulta<Evento[]>;
  participantes: ResultadoConsulta<Participante[]>;
  ponentes: ResultadoConsulta<Ponente[]>;
}

export interface IndicadorInicio {
  titulo: string;
  icono: string;
  tono: 'principal' | 'exito' | 'informacion' | 'secundario';
  valor: number | null;
  detalle: string;
}
