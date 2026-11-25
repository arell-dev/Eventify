import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { startWith, switchMap } from 'rxjs';
import { CambiosInscripcionesService } from '../../../../comunes/inscripciones/cambios-inscripciones.service';
import { NotificacionesService } from '../../../../comunes/notificaciones/notificaciones.service';
import { AccesosModulosComponent } from '../../componentes/accesos-modulos/accesos-modulos.component';
import { IndicadoresInicioComponent } from '../../componentes/indicadores/indicadores.component';
import { ProximosEventosComponent } from '../../componentes/proximos-eventos/proximos-eventos.component';
import { DatosInicio, IndicadorInicio } from '../../modelos/inicio.model';
import { InicioService } from '../../servicios/inicio.service';

// Coordina la carga del panel y deriva sus indicadores de las respuestas de la API.
@Component({
  selector: 'app-inicio-panel',
  imports: [RouterLink, AccesosModulosComponent, IndicadoresInicioComponent, ProximosEventosComponent],
  templateUrl: './panel.html',
  styleUrl: './panel.css'
})

export class InicioPanelComponent implements OnInit {
  private readonly inicio = inject(InicioService);
  private readonly cambios = inject(CambiosInscripcionesService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly router = inject(Router);
  private readonly destruir = inject(DestroyRef);
  private readonly datos = signal<DatosInicio | null>(null);
  private readonly ahora = signal(Date.now());

  protected readonly cargando = computed(() => this.datos() === null);
  protected readonly eventosNoDisponibles = computed(() => Boolean(this.datos()?.eventos.error));

  protected readonly proximosEventos = computed(() => {
    const ahora = this.ahora();
    const eventos = this.datos()?.eventos.datos ?? [];

    return eventos
      .filter((evento) => Date.parse(evento.inicio) > ahora)
      .sort((primero, segundo) => Date.parse(primero.inicio) - Date.parse(segundo.inicio) || primero.id - segundo.id)
      .slice(0, 3);
  });

  protected readonly indicadores = computed<IndicadorInicio[]>(() => {
    const datos = this.datos();
    const eventos = datos?.eventos.datos;
    const ahora = this.ahora();
    const activos = eventos?.filter((evento) => Date.parse(evento.fin) > ahora).length;
    const confirmadas = eventos?.reduce((total, evento) => total + evento.inscripcionesConfirmadas, 0);
    const cupos = eventos?.reduce((total, evento) => total + evento.cupo, 0) ?? 0;
    const ocupacion = cupos > 0 ? Math.round(100 * (confirmadas ?? 0) / cupos) : 0;

    return [
      {
        titulo: 'Eventos activos',
        icono: 'event',
        tono: 'principal',
        valor: activos ?? null,
        detalle: eventos ? `de ${eventos.length} totales` : ''
      },
      {
        titulo: 'Confirmadas',
        icono: 'how_to_reg',
        tono: 'exito',
        valor: confirmadas ?? null,
        detalle: `${ocupacion}% ocupación`
      },
      {
        titulo: 'Participantes',
        icono: 'groups',
        tono: 'informacion',
        valor: datos?.participantes.datos?.length ?? null,
        detalle: 'desde Usuarios'
      },
      {
        titulo: 'Ponentes',
        icono: 'co_present',
        tono: 'secundario',
        valor: datos?.ponentes.datos?.length ?? null,
        detalle: 'sin cruces de horario'
      }
    ];
  });

  ngOnInit(): void {
    this.cambios.cambios
      .pipe(startWith(undefined), switchMap(() => this.inicio.consultar()), takeUntilDestroyed(this.destruir))
      .subscribe((datos) => this.aplicarDatos(datos));
  }

  private aplicarDatos(datos: DatosInicio): void {
    const errores = [datos.eventos.error, datos.participantes.error, datos.ponentes.error];
    const accesoRechazado = errores.some((error) => error?.status === 401 || error?.status === 403);

    if (accesoRechazado) {
      this.notificaciones.mostrar('Inicia sesión como administrador para consultar el panel.', 'error');
      void this.router.navigate(['/admin/acceso'], { queryParams: { retorno: '/admin/inicio' } });
      return;
    }

    this.ahora.set(Date.now());
    this.datos.update((anteriores) => ({
      eventos: datos.eventos.datos ? datos.eventos : anteriores?.eventos ?? datos.eventos,
      participantes: datos.participantes.datos ? datos.participantes : anteriores?.participantes ?? datos.participantes,
      ponentes: datos.ponentes.datos ? datos.ponentes : anteriores?.ponentes ?? datos.ponentes
    }));

    if (errores.some(Boolean)) {
      this.notificaciones.mostrar('No se pudieron cargar todos los datos del panel.', 'error');
    }
  }
}
