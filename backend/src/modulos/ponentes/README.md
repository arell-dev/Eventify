# Ponentes

El módulo de Ashley (integrante 4) lista ponentes, consulta su ficha, registra un perfil desde el padrón y permite editarlo o darlo de baja. `GET /api/usuarios?rol=ponente` lista las cuentas disponibles. El alta recibe solo `usuarioId` y la edición conserva el vínculo con la cuenta.

`GET /api/ponentes/:id/eventos` devuelve los eventos asignados en orden cronológico, con sus cupos vigentes. La baja devuelve `409` e identifica los eventos que mantienen el vínculo con el ponente.
