const express = require("express");
const { obtenerCuposDisponibles, representarInscripcion } = require("../inscripciones/inscripciones.datos");
const { ErrorEvento, obtenerId, buscarEvento, representarEvento, notificarPonente, validarEvento } = require("./eventos.datos");

// Traduce los errores de validación a la respuesta HTTP correspondiente.
const manejar = (accion) => async (solicitud, respuesta) => {
  try {
    await accion(solicitud, respuesta);
  } catch (error) {
    if (error instanceof ErrorEvento) {
      respuesta.status(error.estado).json({ mensaje: error.message });
      return;
    }

    console.error("Error en Eventos:", error);
    respuesta.status(500).json({ mensaje: "No se pudo completar la operación." });
  }
};

// Expone las operaciones administrativas sobre el almacén compartido.
const crearRouter = ({ almacen }) => {
  const router = express.Router();

  router.use((solicitud, respuesta, siguiente) => {
    if (["POST", "PUT", "DELETE"].includes(solicitud.method)
      && solicitud.get("Origin") !== "http://localhost:4200") {
      respuesta.status(403).json({ mensaje: "El origen de la solicitud no está permitido." });
      return;
    }

    siguiente();
  });

  // Lista eventos con su ocupación actual.
  router.get("/", manejar(async (solicitud, respuesta) => {
    const datos = await almacen.leer();

    respuesta.json(datos.eventos.map((evento) => representarEvento(datos, evento)));
  }));

  // Lista las inscripciones de un evento.
  router.get("/:id/inscripciones", manejar(async (solicitud, respuesta) => {
    const id = obtenerId(solicitud.params.id);
    const datos = await almacen.leer();

    buscarEvento(datos, id);

    const inscripciones = datos.inscripciones
      .filter((inscripcion) => inscripcion.eventoId === id)
      .map((inscripcion) => {
        const participante = datos.participantes.find((elemento) => elemento.id === inscripcion.participanteId);

        return {
          ...representarInscripcion(datos, inscripcion),
          participanteCarrera: participante?.carrera || ""
        };
      });

    respuesta.json(inscripciones);
  }));

  // Consulta un evento administrativo.
  router.get("/:id", manejar(async (solicitud, respuesta) => {
    const datos = await almacen.leer();

    respuesta.json(representarEvento(datos, buscarEvento(datos, obtenerId(solicitud.params.id))));
  }));

  // Registra un evento y avisa al ponente.
  router.post("/", manejar(async (solicitud, respuesta) => {
    const resultado = await almacen.transaccion((datos) => {
      const entrada = validarEvento(solicitud.body, datos);
      const evento = { id: datos.siguientesIds.eventos++, ...entrada };

      datos.eventos.push(evento);
      notificarPonente(datos, evento, "te fue asignado");

      return representarEvento(datos, evento);
    });

    respuesta.status(201).json(resultado);
  }));

  // Actualiza un evento y sus avisos.
  router.put("/:id", manejar(async (solicitud, respuesta) => {
    const id = obtenerId(solicitud.params.id);

    const resultado = await almacen.transaccion((datos) => {
      const anterior = buscarEvento(datos, id);
      const entrada = validarEvento(solicitud.body, datos, id);
      const ponenteAnterior = anterior.ponenteId;

      if (ponenteAnterior !== entrada.ponenteId) {
        notificarPonente(datos, anterior, "ya no te tiene asignado como ponente");
      }

      Object.assign(anterior, entrada);
      notificarPonente(datos, anterior, "fue actualizado");

      return representarEvento(datos, anterior);
    });

    respuesta.json(resultado);
  }));

  // Elimina un evento que no tenga inscripciones.
  router.delete("/:id", manejar(async (solicitud, respuesta) => {
    const id = obtenerId(solicitud.params.id);

    const resultado = await almacen.transaccion((datos) => {
      const evento = buscarEvento(datos, id);

      if (datos.inscripciones.some((inscripcion) => inscripcion.eventoId === id)) {
        throw new ErrorEvento(409, "El evento tiene inscripciones relacionadas y no se puede eliminar.");
      }

      const representacion = representarEvento(datos, evento);

      notificarPonente(datos, evento, "fue eliminado");
      datos.eventos.splice(datos.eventos.indexOf(evento), 1);

      return representacion;
    });

    respuesta.json(resultado);
  }));

  return router;
};

// Limita los datos expuestos al catálogo público.
const crearRouterPublico = ({ almacen }) => {
  const router = express.Router();
  const representarPublico = (datos, evento) => ({
    id: evento.id,
    titulo: evento.titulo,
    descripcion: evento.descripcion,
    tipo: evento.tipo,
    modalidad: evento.modalidad,
    lugar: evento.lugar,
    enlace: evento.enlace,
    inicio: evento.inicio,
    fin: evento.fin,
    nombrePonente: datos.ponentes.find((ponente) => ponente.id === evento.ponenteId)?.nombre
      || "Ponente no disponible",
    cupo: evento.cupo,
    cuposDisponibles: obtenerCuposDisponibles(datos, evento)
  });

  // Lista los eventos visibles en el catálogo.
  router.get("/", manejar(async (solicitud, respuesta) => {
    const datos = await almacen.leer();

    respuesta.json(datos.eventos.map((evento) => representarPublico(datos, evento)));
  }));

  // Consulta el detalle público de un evento.
  router.get("/:id", manejar(async (solicitud, respuesta) => {
    const datos = await almacen.leer();

    respuesta.json(representarPublico(datos, buscarEvento(datos, obtenerId(solicitud.params.id))));
  }));

  return router;
};

module.exports = { crearRouter, crearRouterPublico };
