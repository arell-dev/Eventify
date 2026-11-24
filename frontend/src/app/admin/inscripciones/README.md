# Inscripciones

Administra las inscripciones: registro, búsqueda, filtros, consulta, cambio de estado y eliminación de registros cancelados.

## Organización

- `paginas/lista/`: indicadores, filtros y acciones del listado.
- `paginas/formulario/`: alta de una inscripción con opciones de Eventos y Participantes.
- `paginas/detalle/`: datos del registro y eliminación permitida.
- `paginas/edicion/`: cambio del estado mediante `PATCH`.
- `componentes/confirmacion/`: confirmación accesible para cancelación, reactivación y eliminación.
- `modelos/inscripcion.model.ts`: tipos de los datos que usa el módulo.
- `servicios/inscripciones.service.ts`: acceso HTTP a inscripciones, eventos y participantes.
- `utilidades/fecha.ts`: formato de fechas para `America/Lima`.
- `inscripciones.component.ts` e `inscripciones.component.html`: contenedor de las rutas hijas del módulo.

Los archivos TypeScript de componentes usan el sufijo `.component.ts` para distinguirlos de TypeScript común. Las plantillas y estilos conservan nombres breves, como `edicion.html` y `edicion.css`.

Los avisos usan `NotificacionesService`, definido en `src/app/comunes/notificaciones/` y montado en la raíz de Angular para que cualquier módulo pueda reutilizarlo. Eventos y Participantes deben exponer `GET /api/eventos` y `GET /api/participantes` según el contrato del proyecto.
