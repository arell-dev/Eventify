import { NgTemplateOutlet } from '@angular/common';
import { Component, DestroyRef, ElementRef, Injector, OnInit, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription, finalize, forkJoin, of } from 'rxjs';
import { NotificacionesService } from '../../../../comunes/notificaciones/notificaciones.service';
import { VolverEventosComponent } from '../../componentes/volver-eventos/volver-eventos.component';
import { DatosEvento, Evento, Modalidad, Ponente } from '../../modelos/evento.model';
import { EventosService } from '../../servicios/eventos.service';
import { aFechaFormulario, aFechaUtc } from '../../utilidades/fecha';
import { mensajeApi, tiposHabituales } from '../../utilidades/presentacion';
import { enlaceWeb, enteroPositivo, fechaCivil, intervaloValido, requiereEnlace, requiereLugar, textoObligatorio } from '../../utilidades/validacion';

type CampoEvento = keyof DatosEvento;

const mensajes: Record<CampoEvento, string> = {
  titulo: 'Ingresa el título del evento.',
  descripcion: 'Ingresa la descripción.',
  tipo: 'Selecciona el tipo de actividad.',
  modalidad: 'Selecciona la modalidad.',
  lugar: 'Ingresa el lugar presencial.',
  enlace: 'Ingresa un enlace HTTP o HTTPS válido.',
  inicio: 'Ingresa una fecha y hora de inicio válidas.',
  fin: 'Ingresa una fecha y hora de fin válidas.',
  cupo: 'Ingresa un cupo entero mayor que cero.',
  ponenteId: 'Selecciona un ponente.'
};

// Comparte la interfaz y validación entre el alta y la edición.
@Component({
  selector: 'app-evento-formulario',
  imports: [NgTemplateOutlet, ReactiveFormsModule, RouterLink, VolverEventosComponent],
  templateUrl: './formulario.html',
  styleUrls: ['../../eventos.css', './formulario.css']
})

export class EventoFormularioComponent implements OnInit {
  private readonly servicio = inject(EventosService);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly destruir = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly builder = inject(FormBuilder);
  private readonly formularioElement = viewChild<ElementRef<HTMLFormElement>>('formularioElement');
  private readonly original = signal<Evento | null>(null);
  private solicitud?: Subscription;

  protected readonly id = signal<number | null>(null);
  protected readonly ponentes = signal<Ponente[]>([]);
  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly error = signal('');
  protected readonly noEncontrado = signal(false);
  protected readonly requiereLugar = requiereLugar;
  protected readonly requiereEnlace = requiereEnlace;

  protected readonly tipos = computed(() => {
    const tipoOriginal = this.original()?.tipo;

    if (!tipoOriginal) {
      return tiposHabituales;
    }

    // Respeta el valor persistido, incluidas variantes de escritura y tipos anteriores.
    const coincide = tiposHabituales.some((opcion) => opcion.valor === tipoOriginal.toLocaleUpperCase('es'));

    if (coincide) {
      return tiposHabituales.map((opcion) => opcion.valor === tipoOriginal.toLocaleUpperCase('es')
        ? { ...opcion, valor: tipoOriginal }
        : opcion);
    }

    return [...tiposHabituales, { valor: tipoOriginal, etiqueta: tipoOriginal }];
  });

  protected readonly formulario = this.builder.group({
    titulo: this.builder.nonNullable.control('', textoObligatorio),
    descripcion: this.builder.nonNullable.control('', textoObligatorio),
    tipo: this.builder.nonNullable.control('', Validators.required),
    modalidad: this.builder.nonNullable.control<Modalidad>('PRESENCIAL', Validators.required),
    lugar: this.builder.nonNullable.control(''),
    enlace: this.builder.nonNullable.control(''),
    inicio: this.builder.nonNullable.control('', [Validators.required, fechaCivil]),
    fin: this.builder.nonNullable.control('', [Validators.required, fechaCivil]),
    cupo: this.builder.control<number | null>(null, enteroPositivo),
    ponenteId: this.builder.control<number | null>(null, enteroPositivo)
  }, { validators: intervaloValido });

  ngOnInit(): void {
    this.formulario.controls.modalidad.valueChanges
      .pipe(takeUntilDestroyed(this.destruir))
      .subscribe((modalidad) => this.validarModalidad(modalidad));

    this.ruta.paramMap.pipe(takeUntilDestroyed(this.destruir)).subscribe(() => this.cargar());
  }

  protected cargar(): void {
    this.solicitud?.unsubscribe();
    this.error.set('');
    this.noEncontrado.set(false);
    this.original.set(null);
    const parametro = this.ruta.snapshot.paramMap.get('id');
    const id = parametro === null ? null : Number(parametro);

    if (id !== null && (!Number.isSafeInteger(id) || id < 1)) {
      this.noEncontrado.set(true);
      this.cargando.set(false);
      return;
    }

    this.id.set(id);
    this.cargando.set(true);
    this.solicitud = forkJoin({
      ponentes: this.servicio.listarPonentes(),
      evento: id === null ? of(null) : this.servicio.obtener(id)
    })
      .pipe(takeUntilDestroyed(this.destruir), finalize(() => this.cargando.set(false)))
      .subscribe({
        next: ({ ponentes, evento }) => {
          this.ponentes.set(ponentes);
          this.original.set(evento);

          if (evento) {
            this.formulario.reset({
              ...evento,
              inicio: aFechaFormulario(evento.inicio),
              fin: aFechaFormulario(evento.fin)
            });
          } else {
            this.formulario.reset();
          }
        },
        error: (error) => {
          if (error.status === 404 && id !== null) {
            this.noEncontrado.set(true);
          } else {
            this.error.set(mensajeApi(error, 'No se pudieron cargar los datos del formulario.'));
          }
        }
      });
  }

  protected errorDe(campo: CampoEvento): string {
    const control = this.formulario.controls[campo];

    if (!control.touched && (!control.dirty || control.value === '')) {
      return '';
    }

    if (control.invalid) {
      return mensajes[campo];
    }

    if (campo === 'fin' && this.formulario.hasError('intervalo')) {
      return 'El fin debe ser posterior al inicio.';
    }

    return '';
  }

  protected guardar(): void {
    if (this.guardando() || !this.ponentes().length) {
      return;
    }

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      afterNextRender(() => {
        this.formularioElement()?.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      }, { injector: this.injector });
      return;
    }

    const valor = this.formulario.getRawValue();
    const inicio = aFechaUtc(valor.inicio);
    const fin = aFechaUtc(valor.fin);

    if (inicio === null || fin === null || valor.cupo === null || valor.ponenteId === null) {
      return;
    }

    const datos: DatosEvento = {
      ...valor,
      titulo: valor.titulo.trim(),
      descripcion: valor.descripcion.trim(),
      lugar: requiereLugar(valor.modalidad) ? valor.lugar.trim() : '',
      enlace: requiereEnlace(valor.modalidad) ? valor.enlace.trim() : '',
      inicio,
      fin,
      cupo: valor.cupo,
      ponenteId: valor.ponenteId
    };

    const id = this.id();
    const solicitud = id === null ? this.servicio.crear(datos) : this.servicio.actualizar(id, datos);
    this.guardando.set(true);

    solicitud.pipe(takeUntilDestroyed(this.destruir), finalize(() => this.guardando.set(false))).subscribe({
      next: (evento) => {
        this.notificaciones.mostrar(id === null ? 'El evento fue registrado.' : 'El evento fue actualizado.');
        void this.router.navigate(['/admin/eventos', evento.id]);
      },
      error: (error) => this.notificaciones.mostrar(
        mensajeApi(error, 'No se pudo guardar el evento.'),
        { tipo: 'error', duracionMs: 0 }
      )
    });
  }

  private validarModalidad(modalidad: Modalidad): void {
    const { lugar, enlace } = this.formulario.controls;
    lugar.setValidators(requiereLugar(modalidad) ? textoObligatorio : null);
    enlace.setValidators(requiereEnlace(modalidad) ? enlaceWeb : null);
    lugar.updateValueAndValidity({ emitEvent: false });
    enlace.updateValueAndValidity({ emitEvent: false });
  }
}
