// Comprueba la fecha y el cupo antes de confirmar una inscripción.
const verificarDisponibilidad = (datos, evento) => {
  const inicio = new Date(evento.inicio).getTime();

  if (!Number.isFinite(inicio) || inicio <= Date.now()) {
    return "Solo puedes inscribir participantes en eventos que todavía no han comenzado.";
  }

  if (obtenerCuposDisponibles(datos, evento) <= 0) {
    return "El evento ya no tiene cupos disponibles.";
  }

  return null;
};

// Solo las inscripciones confirmadas consumen cupos del evento.
const contarConfirmadas = (datos, eventoId) => {
  return datos.inscripciones.filter((inscripcion) => {
    return inscripcion.eventoId === eventoId && inscripcion.estado === "CONFIRMADA";
  }).length;
};

// Calcula la disponibilidad con las inscripciones actuales del mismo evento.
const obtenerCuposDisponibles = (datos, evento) => {
  return evento.cupo - contarConfirmadas(datos, evento.id);
};

const buscarInscripcion = (datos, eventoId, participanteId) => {
  return datos.inscripciones.find((inscripcion) => {
    return inscripcion.eventoId === eventoId && inscripcion.participanteId === participanteId;
  });
};

// Crea o reactiva el registro después de comprobar duplicados y disponibilidad.
const confirmarInscripcion = (datos, evento, participanteId) => {
  const existente = buscarInscripcion(datos, evento.id, participanteId);

  if (existente?.estado === "CONFIRMADA") {
    return { mensaje: "El participante ya tiene una inscripción confirmada en este evento." };
  }

  const mensaje = verificarDisponibilidad(datos, evento);

  if (mensaje) {
    return { mensaje };
  }

  if (existente) {
    existente.estado = "CONFIRMADA";
    return { inscripcion: existente, reactivada: true };
  }

  const inscripcion = {
    id: datos.siguientesIds.inscripciones++,
    eventoId: evento.id,
    participanteId,
    estado: "CONFIRMADA",
    fechaRegistro: new Date().toISOString()
  };

  datos.inscripciones.push(inscripcion);
  return { inscripcion, reactivada: false };
};

// La cancelación cambia el estado del registro y conserva su historial.
const cancelarInscripcion = (evento, inscripcion) => {
  if (inscripcion.estado === "CANCELADA") {
    return { cambiada: false };
  }

  const inicio = new Date(evento.inicio).getTime();

  if (!Number.isFinite(inicio) || inicio <= Date.now()) {
    return { mensaje: "No se puede cancelar una inscripción cuando el evento ya comenzó." };
  }

  inscripcion.estado = "CANCELADA";

  return { cambiada: true };
};

// Agrega nombres y cupos actuales para que la interfaz no una datos por separado.
const representarInscripcion = (datos, inscripcion) => {
  const evento = datos.eventos.find((elemento) => elemento.id === inscripcion.eventoId);
  const participante = datos.participantes.find((elemento) => elemento.id === inscripcion.participanteId);

  return {
    ...inscripcion,
    eventoTitulo: evento?.titulo || "Evento no disponible",
    eventoInicio: evento?.inicio || null,
    eventoFin: evento?.fin || null,
    cupoEvento: evento?.cupo ?? null,
    inscripcionesConfirmadas: evento ? contarConfirmadas(datos, evento.id) : null,
    cuposDisponibles: evento ? obtenerCuposDisponibles(datos, evento) : null,
    participanteNombre: participante?.nombre || "Participante no disponible",
    participanteCorreo: participante?.correo || ""
  };
};

module.exports = { buscarInscripcion, cancelarInscripcion, confirmarInscripcion, contarConfirmadas, obtenerCuposDisponibles, representarInscripcion, verificarDisponibilidad };
