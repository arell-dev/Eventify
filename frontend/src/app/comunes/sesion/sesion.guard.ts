import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { SesionService } from './sesion.service';

// Verifica la cookie administrativa con la API antes de entrar a las rutas protegidas.
export const requiereSesionAdmin: CanActivateFn = () => {
  const sesion = inject(SesionService);
  const router = inject(Router);

  return sesion.tieneSesionAdmin().pipe(
    map((autorizada) => autorizada ? true : router.createUrlTree(['/admin/acceso']))
  );
};
