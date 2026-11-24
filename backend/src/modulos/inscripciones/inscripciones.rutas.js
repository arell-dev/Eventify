const express = require("express");
const { almacen: almacenCompartido } = require("../../comun/almacen");
const { requiereAdministrador } = require("../../comun/acceso-administrativo");

// Conserva el estado HTTP esperado junto al mensaje de validación o negocio.
class ErrorHttp extends Error {
  constructor(estado, mensaje) {
    super(mensaje);
    this.estado = estado;
  }
}

// Traduce errores controlados a respuestas HTTP y oculta detalles inesperados.
const responderError = (error, respuesta) => {
  if (error instanceof ErrorHttp) {
    respuesta.status(error.estado).json({ mensaje: error.message });
    return;
  }

  console.error("Error en Inscripciones:", error);
  respuesta.status(500).json({ mensaje: "No se pudo completar la operación." });
};

// Exige un objeto con exactamente los campos definidos por cada operación.
const validarCuerpo = (cuerpo, camposPermitidos) => {
  if (!cuerpo || typeof cuerpo !== "object" || Array.isArray(cuerpo)) {
    throw new ErrorHttp(400, "Envía un objeto JSON válido.");
  }

  const camposRecibidos = Object.keys(cuerpo);
  const contieneCamposDesconocidos = camposRecibidos.some((campo) => !camposPermitidos.includes(campo));
  const faltanCampos = camposPermitidos.some((campo) => !camposRecibidos.includes(campo));

  if (contieneCamposDesconocidos || faltanCampos) {
    throw new ErrorHttp(400, "El cuerpo contiene campos faltantes o no permitidos.");
  }
};

// Normaliza y valida IDs antes de consultar las colecciones relacionadas.
const validarId = (valor, nombre) => {
  const id = Number(valor);

  if (!Number.isInteger(id) || id <= 0) {
    throw new ErrorHttp(400, `El ${nombre} debe ser un entero positivo.`);
  }

  return id;
};

// Resuelve el evento dentro del almacén compartido o responde como no encontrado.
const obtenerEvento = (datos, eventoId) => {
  const evento = datos.eventos.find((elemento) => elemento.id === eventoId);

  if (!evento) {
    throw new ErrorHttp(404, "El evento seleccionado no existe.");
  }

  return evento;
};

// Comprueba que el participante relacionado todavía exista.
const obtenerParticipante = (datos, participanteId) => {
  const participante = datos.participantes.find((elemento) => elemento.id === participanteId);

  if (!participante) {
    throw new ErrorHttp(404, "El participante seleccionado no existe.");
  }

  return participante;
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

// Impide cambios que dependen de disponibilidad cuando el evento ya comenzó.
const esEventoFuturo = (evento) => {
  const inicio = new Date(evento.inicio).getTime();

  return Number.isFinite(inicio) && inicio > Date.now();
};

// Centraliza las reglas para crear o reactivar una inscripción.
const comprobarDisponibilidad = (datos, evento) => {
  if (!esEventoFuturo(evento)) {
    throw new ErrorHttp(409, "Solo puedes inscribir participantes en eventos que todavía no han comenzado.");
  }

  if (obtenerCuposDisponibles(datos, evento) <= 0) {
    throw new ErrorHttp(409, "El evento ya no tiene cupos disponibles.");
  }
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

// Permite sustituir el almacén en pruebas y protege las rutas con sesión.
const crearRouter = (opciones = {}) => {
  const router = express.Router();
  const almacen = opciones.almacen || almacenCompartido;
  const requiereSesion = opciones.requiereSesion || requiereAdministrador;

  router.use(requiereSesion);

  // Limita las mutaciones al origen local autorizado por el contrato del proyecto.
  router.use((solicitud, respuesta, siguiente) => {
    const metodosQueModifican = ["POST", "PATCH", "DELETE"];

    if (metodosQueModifican.includes(solicitud.method)
      && solicitud.get("Origin") !== "http://localhost:4200") {
      respuesta.status(403).json({ mensaje: "El origen de la solicitud no está permitido." });
      return;
    }

    siguiente();
  });

  // GET /api/inscripciones: lista los registros con sus datos relacionados.
  router.get("/", async (solicitud, respuesta) => {
    try {
      const datos = await almacen.leer();
      const inscripciones = [...datos.inscripciones]
        .sort((primera, segunda) => new Date(segunda.fechaRegistro) - new Date(primera.fechaRegistro))
        .map((inscripcion) => representarInscripcion(datos, inscripcion));

      respuesta.status(200).json(inscripciones);
    } catch (error) {
      responderError(error, respuesta);
    }
  });

  // GET /api/inscripciones/:id: consulta un registro por su ID.
  router.get("/:id", async (solicitud, respuesta) => {
    try {
      const id = validarId(solicitud.params.id, "ID de inscripción");
      const datos = await almacen.leer();
      const inscripcion = datos.inscripciones.find((elemento) => elemento.id === id);

      if (!inscripcion) {
        throw new ErrorHttp(404, "La inscripción solicitada no existe.");
      }

      respuesta.status(200).json(representarInscripcion(datos, inscripcion));
    } catch (error) {
      responderError(error, respuesta);
    }
  });

  // POST /api/inscripciones: registra a un participante si existe cupo.
  router.post("/", async (solicitud, respuesta) => {
    try {
      validarCuerpo(solicitud.body, ["eventoId", "participanteId"]);
      if (typeof solicitud.body.eventoId !== "number" || typeof solicitud.body.participanteId !== "number") {
        throw new ErrorHttp(400, "eventoId y participanteId deben ser valores numéricos.");
      }

      const eventoId = validarId(solicitud.body.eventoId, "ID de evento");
      const participanteId = validarId(solicitud.body.participanteId, "ID de participante");
      const resultado = await almacen.transaccion((datos) => {
        const evento = obtenerEvento(datos, eventoId);
        obtenerParticipante(datos, participanteId);
        const existente = datos.inscripciones.find((inscripcion) => {
          return inscripcion.eventoId === eventoId && inscripcion.participanteId === participanteId;
        });

        if (existente && existente.estado === "CONFIRMADA") {
          throw new ErrorHttp(409, "El participante ya tiene una inscripción confirmada en este evento.");
        }

        comprobarDisponibilidad(datos, evento);

        if (existente) {
          existente.estado = "CONFIRMADA";

          return {
            inscripcion: existente,
            reactivada: true
          };
        }

        const nuevaInscripcion = {
          id: datos.siguientesIds.inscripciones++,
          eventoId,
          participanteId,
          estado: "CONFIRMADA",
          fechaRegistro: new Date().toISOString()
        };

        datos.inscripciones.push(nuevaInscripcion);

        return {
          inscripcion: nuevaInscripcion,
          reactivada: false
        };
      });
      const datosActualizados = await almacen.leer();
      const estadoRespuesta = resultado.reactivada ? 200 : 201;

      respuesta.status(estadoRespuesta).json(representarInscripcion(datosActualizados, resultado.inscripcion));
    } catch (error) {
      responderError(error, respuesta);
    }
  });

  // PATCH /api/inscripciones/:id: cancela o reactiva el registro.
  router.patch("/:id", async (solicitud, respuesta) => {
    try {
      validarCuerpo(solicitud.body, ["estado"]);
      const id = validarId(solicitud.params.id, "ID de inscripción");
      const estadoSolicitado = solicitud.body.estado;

      if (!["CONFIRMADA", "CANCELADA"].includes(estadoSolicitado)) {
        throw new ErrorHttp(400, "El estado debe ser CONFIRMADA o CANCELADA.");
      }

      const inscripcion = await almacen.transaccion((datos) => {
        const registro = datos.inscripciones.find((elemento) => elemento.id === id);

        if (!registro) {
          throw new ErrorHttp(404, "La inscripción solicitada no existe.");
        }

        if (registro.estado === estadoSolicitado) {
          return registro;
        }

        const evento = obtenerEvento(datos, registro.eventoId);

        if (estadoSolicitado === "CANCELADA") {
          if (!esEventoFuturo(evento)) {
            throw new ErrorHttp(409, "No se puede cancelar una inscripción cuando el evento ya comenzó.");
          }
        } else {
          comprobarDisponibilidad(datos, evento);
        }

        registro.estado = estadoSolicitado;

        return registro;
      });
      const datosActualizados = await almacen.leer();

      respuesta.status(200).json(representarInscripcion(datosActualizados, inscripcion));
    } catch (error) {
      responderError(error, respuesta);
    }
  });

  // DELETE /api/inscripciones/:id: elimina solo registros cancelados.
  router.delete("/:id", async (solicitud, respuesta) => {
    try {
      const id = validarId(solicitud.params.id, "ID de inscripción");
      const eliminada = await almacen.transaccion((datos) => {
        const indice = datos.inscripciones.findIndex((elemento) => elemento.id === id);

        if (indice === -1) {
          throw new ErrorHttp(404, "La inscripción solicitada no existe.");
        }

        const registro = datos.inscripciones[indice];

        if (registro.estado !== "CANCELADA") {
          throw new ErrorHttp(409, "Solo se pueden eliminar inscripciones canceladas.");
        }

        datos.inscripciones.splice(indice, 1);

        return registro;
      });

      respuesta.status(200).json(eliminada);
    } catch (error) {
      responderError(error, respuesta);
    }
  });

  return router;
};

module.exports = {
  crearRouter,
  ErrorHttp,
  representarInscripcion,
  contarConfirmadas,
  obtenerCuposDisponibles
};
