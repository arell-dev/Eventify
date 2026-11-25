import { ValidatorFn } from '@angular/forms';
import { Modalidad } from '../modelos/evento.model';
import { aFechaUtc } from './fecha';

export const requiereLugar = (modalidad: Modalidad): boolean => modalidad !== 'VIRTUAL';

export const requiereEnlace = (modalidad: Modalidad): boolean => modalidad !== 'PRESENCIAL';

export const textoObligatorio: ValidatorFn = (control) => {
  return typeof control.value === 'string' && control.value.trim() ? null : { required: true };
};

export const enteroPositivo: ValidatorFn = (control) => {
  return Number.isInteger(control.value) && control.value > 0 ? null : { enteroPositivo: true };
};

export const enlaceWeb: ValidatorFn = (control) => {
  try {
    const enlace = new URL(String(control.value).trim());

    return enlace.protocol === 'https:' || enlace.protocol === 'http:' ? null : { enlaceWeb: true };
  } catch {
    return { enlaceWeb: true };
  }
};

export const fechaCivil: ValidatorFn = (control) => {
  return aFechaUtc(control.value) ? null : { fechaCivil: true };
};

export const intervaloValido: ValidatorFn = (control) => {
  const inicio = aFechaUtc(control.get('inicio')?.value ?? '');
  const fin = aFechaUtc(control.get('fin')?.value ?? '');

  return inicio && fin && Date.parse(fin) <= Date.parse(inicio) ? { intervalo: true } : null;
};
