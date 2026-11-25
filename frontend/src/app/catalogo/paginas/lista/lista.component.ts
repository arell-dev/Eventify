import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, map, of, startWith, Subject, switchMap } from 'rxjs';
import { SesionService } from '../../../comunes/sesion/sesion.service';
import { CabeceraPublicaComponent } from '../../componentes/cabecera/cabecera-publica';
import { IconoCatalogoComponent } from '../../componentes/icono-catalogo';
import { EstadoEvento, EventoPublico, Modalidad } from '../../modelos/catalogo.model';
import { CatalogoService } from '../../servicios/catalogo.service';
import {
  estadoEvento,
  fechaDia,
  horarioEvento,
  nombresEstado,
  nombresModalidad,
  relojCatalogo,
  textoCupos,
  ubicacionEvento
} from '../../utilidades/presentacion-evento';

interface ResultadoListado {
  estado: 'cargando' | 'error' | 'listo';
  eventos: EventoPublico[];
}

const normalizarBusqueda = (texto: string): string => {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('es').trim();
};

@Component({
  selector: 'app-catalogo-lista',
  imports: [ReactiveFormsModule, RouterLink, CabeceraPublicaComponent, IconoCatalogoComponent],
  templateUrl: './lista.html',
  styleUrls: ['../../componentes/catalogo-publico.css', './lista.css']
})
export class CatalogoListaComponent {
  private readonly catalogo = inject(CatalogoService);
  private readonly sesion = inject(SesionService);
  private readonly reloj = relojCatalogo();
  private readonly recargas = new Subject<void>();

  protected readonly filtros = new FormGroup({
    busqueda: new FormControl('', { nonNullable: true }),
    modalidad: new FormControl<Modalidad | ''>('', { nonNullable: true }),
    estado: new FormControl<EstadoEvento | ''>('', { nonNullable: true })
  });

  private readonly valoresFiltro = toSignal(
    this.filtros.valueChanges.pipe(map(() => this.filtros.getRawValue())),
    { initialValue: this.filtros.getRawValue() }
  );

  protected readonly comprobandoSesion = toSignal(
    this.sesion.comprobar().pipe(map(() => false)),
    { initialValue: true }
  );

  protected readonly resultado = toSignal(
    this.recargas.pipe(
      startWith(undefined),
      switchMap(() => this.catalogo.listar().pipe(
        map((eventos): ResultadoListado => ({ estado: 'listo', eventos })),
        startWith<ResultadoListado>({ estado: 'cargando', eventos: [] }),
        catchError(() => of<ResultadoListado>({ estado: 'error', eventos: [] }))
      ))
    ),
    { requireSync: true }
  );

  protected readonly tarjetas = computed(() => {
    const { busqueda, modalidad, estado } = this.valoresFiltro();
    const termino = normalizarBusqueda(busqueda);
    const ahora = this.reloj();

    return this.resultado().eventos
      .map((evento) => ({ evento, estado: estadoEvento(evento, ahora) }))
      .filter((tarjeta) => {
        const { titulo, descripcion, nombrePonente } = tarjeta.evento;
        const texto = normalizarBusqueda(`${titulo} ${descripcion} ${nombrePonente}`);

        return texto.includes(termino)
          && (!modalidad || tarjeta.evento.modalidad === modalidad)
          && (!estado || tarjeta.estado === estado);
      });
  });

  protected readonly nombresEstado = nombresEstado;
  protected readonly nombresModalidad = nombresModalidad;
  protected readonly fechaDia = fechaDia;
  protected readonly horarioEvento = horarioEvento;
  protected readonly ubicacionEvento = ubicacionEvento;
  protected readonly textoCupos = textoCupos;

  protected cargar(): void {
    this.recargas.next();
  }
}
