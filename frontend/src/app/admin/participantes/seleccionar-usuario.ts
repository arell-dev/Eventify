import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { NotificacionesService } from '../../comunes/notificaciones/notificaciones.service';
import { UsuarioDisponible } from './participante.model';
import { ParticipantesApi, mensajeDeError } from './participantes-api';

const normalizarBusqueda = (texto: string): string =>
  texto.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

// Verifica los datos del usuario seleccionado antes de crear su perfil.
@Component({
  selector: 'app-seleccionar-usuario',
  imports: [RouterLink],
  templateUrl: './seleccionar-usuario.html',
  styleUrls: ['./participantes.css', './seleccionar-usuario.css']
})
export class SeleccionarUsuario {
  private readonly api = inject(ParticipantesApi);
  private readonly router = inject(Router);
  private readonly ciclo = inject(DestroyRef);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly usuarios = signal<UsuarioDisponible[]>([]);
  protected readonly busqueda = signal('');
  protected readonly usuarioId = signal<number | null>(null);
  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly errorCarga = signal('');
  protected readonly errorConfirmacion = signal('');

  protected readonly usuariosVisibles = computed(() => {
    const consulta = normalizarBusqueda(this.busqueda());
    return this.usuarios().filter((usuario) =>
      [usuario.nombre, usuario.correo, usuario.carrera]
        .some((texto) => normalizarBusqueda(texto).includes(consulta))
    );
  });

  protected readonly seleccionado = computed(() =>
    this.usuariosVisibles().find((usuario) => usuario.id === this.usuarioId())
  );

  constructor() {
    this.cargar();
  }

  protected cargar(seleccionarPrimero = true) {
    this.errorCarga.set('');
    this.cargando.set(true);
    this.api.listarUsuariosDisponibles().pipe(
      takeUntilDestroyed(this.ciclo),
      finalize(() => this.cargando.set(false))
    ).subscribe({
      next: (usuarios) => {
        this.usuarios.set(usuarios);
        this.usuarioId.set(seleccionarPrimero ? this.usuariosVisibles()[0]?.id ?? null : null);
      },
      error: (error: unknown) => {
        this.usuarioId.set(null);
        this.errorCarga.set(mensajeDeError(error));
      }
    });
  }

  protected confirmar() {
    const usuario = this.seleccionado();
    if (!usuario || this.cargando() || this.guardando()) {
      return;
    }

    this.errorConfirmacion.set('');
    this.guardando.set(true);
    this.api.registrar(usuario.id).pipe(
      takeUntilDestroyed(this.ciclo),
      finalize(() => this.guardando.set(false))
    ).subscribe({
      next: (participante) => {
        this.notificaciones.mostrar('Participante registrado.');
        void this.router.navigate(['/admin/participantes', participante.id]);
      },
      error: (error: unknown) => {
        this.errorConfirmacion.set(mensajeDeError(error));
        if (error instanceof HttpErrorResponse && (error.status === 409 || error.status === 404)) {
          this.usuarioId.set(null);
          this.cargar(false);
        }
      }
    });
  }
}
