# Participantes

El módulo de Mateo (integrante 2) lista participantes, consulta su ficha, registra un perfil desde el padrón y permite la baja. El alta recibe solo `usuarioId` y usa la carrera y el correo de la cuenta seleccionada.

`GET /api/participantes/usuarios-disponibles` y `GET /api/usuarios?rol=participante` consultan el mismo padrón. `GET /api/participantes/:id/inscripciones` devuelve las inscripciones vinculadas, con los títulos de los eventos y sus cupos vigentes. La baja devuelve `409` e identifica cualquier inscripción relacionada, incluida una cancelada.
