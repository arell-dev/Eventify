# Catálogo

El catálogo permite consultar eventos en `/eventos` y abrir su ficha en `/eventos/:id`. Desde el detalle, una cuenta de usuario puede confirmar o reactivar su propia inscripción.

- `paginas/lista/` contiene las tarjetas, la búsqueda y los filtros por modalidad y disponibilidad.
- `paginas/detalle/` presenta la ficha, los cupos y el formulario de inscripción.
- `componentes/` reúne la cabecera pública con el menú de cuenta y sus avisos, los íconos y los estilos de ambas vistas.
- `modelos/` describe las respuestas de la API. `servicios/` centraliza las solicitudes HTTP del catálogo.
- `utilidades/` formatea fechas en el horario de Lima, presenta los estados y comprueba los enlaces virtuales.

Las dos vistas usan la sesión y el Toast global de Angular. Los cupos y la inscripción se consultan en la API pública a través del proxy existente.
