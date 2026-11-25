import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SesionService } from '../../comunes/sesion/sesion.service';

// Autentica al administrador mediante la sesión que valida la API.
@Component({
  selector: 'app-acceso-administrativo',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './acceso.html',
  styleUrl: './acceso.css'
})

export class AccesoAdministrativoComponent {
  private readonly formularioBuilder = inject(NonNullableFormBuilder);
  private readonly sesion = inject(SesionService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);

  readonly procesando = signal(false);
  readonly mensajeError = signal('');
  readonly mostrarContrasena = signal(false);

  readonly formulario = this.formularioBuilder.group({
    usuario: ['', [Validators.required, Validators.email]],
    contrasena: ['', [Validators.required]]
  });

  ingresar(): void {
    this.mensajeError.set('');

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      const primerCampoInvalido = this.formulario.controls.usuario.invalid ? 'usuario' : 'contrasena';
      document.getElementById(primerCampoInvalido)?.focus();
      return;
    }

    this.procesando.set(true);

    this.sesion.iniciar(this.formulario.getRawValue()).subscribe({
      next: (sesion) => {
        const retorno = this.ruta.snapshot.queryParamMap.get('retorno');
        const rutaPermitida = sesion.rol === 'ADMIN' ? '/admin/' : '/eventos';
        const destino = retorno?.startsWith(rutaPermitida)
          ? retorno
          : sesion.rol === 'ADMIN' ? '/admin/inicio' : '/eventos';

        void this.router.navigateByUrl(destino);
      },
      error: (error: HttpErrorResponse) => {
        this.mensajeError.set(error.error?.mensaje || 'No se pudo iniciar sesión. Inténtalo de nuevo.');
        this.procesando.set(false);
      }
    });
  }

  mostrarError(campo: 'usuario' | 'contrasena'): boolean {
    const control = this.formulario.controls[campo];

    return control.invalid && control.touched;
  }

  alternarVisibilidad(): void {
    this.mostrarContrasena.update((visible) => !visible);
  }
}
