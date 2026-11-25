# Participantes

`Participantes` carga el listado y aplica búsqueda por nombre o correo y filtro por carrera. En `/admin/participantes/nuevo`, `SeleccionarUsuario` consulta los usuarios disponibles, permite buscar por nombre, correo o carrera y muestra el resumen de solo lectura del usuario seleccionado. Al confirmar, envía su `usuarioId` y abre la ficha que devuelve la API.

`ParticipantesApi` encapsula las solicitudes `/api/participantes`. El selector consulta los candidatos del padrón compartido en `/api/participantes/usuarios-disponibles`. Si un usuario deja de estar disponible al confirmar, la interfaz mantiene el mensaje de la API y actualiza la lista.

`ParticipanteDetalle` muestra los títulos de los eventos, enlaza a las inscripciones y presenta las fechas en horario de Lima. La eliminación usa el diálogo compartido y el alta y la baja exitosas publican un aviso global.
