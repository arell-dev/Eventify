// Asegura que las colecciones y sus relaciones sean coherentes al iniciar el almacén.
const validarIntegridad = (datos) => {
  const nombres = ["usuarios", "ponentes", "participantes", "eventos", "inscripciones", "notificaciones"];

  // Comprueba IDs únicos y ajusta el siguiente ID de cada colección.
  for (const nombre of nombres) {
    if (!Array.isArray(datos[nombre])) {
      throw new Error(`La colección ${nombre} no es válida.`);
    }

    const ids = new Set();

    for (const registro of datos[nombre]) {
      if (!Number.isInteger(registro.id) || registro.id < 1 || ids.has(registro.id)) {
        throw new Error(`ID inválido o duplicado en ${nombre}: ${registro.id}.`);
      }

      ids.add(registro.id);
    }

    const siguiente = Math.max(0, ...ids) + 1;
    datos.siguientesIds[nombre] = Math.max(datos.siguientesIds[nombre] || 1, siguiente);
  }

  // Cada perfil debe pertenecer a un usuario y ser único dentro de su colección.
  for (const nombre of ["ponentes", "participantes"]) {
    const usuarios = new Set();

    for (const perfil of datos[nombre]) {
      if (!datos.usuarios.some((usuario) => usuario.id === perfil.usuarioId) || usuarios.has(perfil.usuarioId)) {
        throw new Error(`Referencia de usuario inválida o duplicada en ${nombre}: ${perfil.id}.`);
      }

      usuarios.add(perfil.usuarioId);
    }
  }

  // Comprueba el ponente asignado y que el cupo cubra las inscripciones confirmadas.
  for (const evento of datos.eventos) {
    if (!datos.ponentes.some((ponente) => ponente.id === evento.ponenteId)) {
      throw new Error(`Ponente inexistente en eventos: ${evento.id}.`);
    }

    const confirmadas = datos.inscripciones.filter((inscripcion) => inscripcion.eventoId === evento.id && inscripcion.estado === "CONFIRMADA").length;

    if (!Number.isInteger(evento.cupo) || evento.cupo < confirmadas) {
      throw new Error(`Cupo inconsistente en eventos: ${evento.id}.`);
    }
  }

  // Cada inscripción vincula un evento y un participante existentes una sola vez.
  const parejas = new Set();

  for (const inscripcion of datos.inscripciones) {
    const pareja = `${inscripcion.eventoId}:${inscripcion.participanteId}`;

    if (!datos.eventos.some((evento) => evento.id === inscripcion.eventoId)
      || !datos.participantes.some((participante) => participante.id === inscripcion.participanteId)
      || parejas.has(pareja) || !["CONFIRMADA", "CANCELADA"].includes(inscripcion.estado)) {
      throw new Error(`Relación o estado inválido en inscripciones: ${inscripcion.id}.`);
    }

    parejas.add(pareja);
  }

  // Cada aviso debe pertenecer a un usuario existente.
  for (const aviso of datos.notificaciones) {
    if (!datos.usuarios.some((usuario) => usuario.id === aviso.usuarioId)) {
      throw new Error(`Usuario inexistente en notificaciones: ${aviso.id}.`);
    }
  }
};

module.exports = { validarIntegridad };
