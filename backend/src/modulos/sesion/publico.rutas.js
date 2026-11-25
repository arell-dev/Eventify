const express = require("express");
const { buscarInscripcion, cancelarInscripcion, confirmarInscripcion, obtenerCuposDisponibles, representarInscripcion, verificarDisponibilidad } = require("../inscripciones/inscripciones.datos");

const conflictoPonenteAsignado = {
  codigo: "PONENTE_ASIGNADO",
  mensaje: "Eres el ponente de este evento. Tu participación ya está asignada."
};

const esPonenteAsignado = (datos, evento, usuarioId) => {
  return datos.ponentes.some((ponente) => ponente.id === evento.ponenteId && ponente.usuarioId === usuarioId);
};

const buscarParticipanteDeUsuario = (datos, usuarioId) => {
  return datos.participantes.find((participante) => participante.usuarioId === usuarioId);
};

const requiereUsuario = (solicitud, respuesta, siguiente) => {
  if (!solicitud.session?.usuario) {
    respuesta.status(401).json({ mensaje: "Inicia sesión para continuar." });
    return;
  }
  
  if (solicitud.session.rol !== "USUARIO" || !solicitud.session.perfil?.id) {
    respuesta.status(403).json({ mensaje: "Esta acción requiere una cuenta de usuario." });
    return;
  }
  
  siguiente();
};

const crearRouterMisInscripciones = ({ almacen }) => {
  const router = express.Router();

  router.get("/", requiereUsuario, async (solicitud, respuesta) => {
    respuesta.set("Cache-Control", "no-store");

    try {
      const datos = await almacen.leer();
      const participante = buscarParticipanteDeUsuario(datos, solicitud.session.perfil.id);
      const eventoIds = participante ? datos.inscripciones
        .filter((inscripcion) => inscripcion.participanteId === participante.id && inscripcion.estado === "CONFIRMADA")
        .map((inscripcion) => inscripcion.eventoId) : [];

      respuesta.json({ eventoIds });
    } catch (error) {
      respuesta.status(500).json({ mensaje: "No se pudieron consultar tus inscripciones." });
    }
  });

  return router;
};

const crearRouter = ({ almacen, publicarCambio }) => {
  const router = express.Router();
  router.use(requiereUsuario);

  // Consulta la inscripción del usuario en el evento.
  router.get("/:id/mi-inscripcion", async (solicitud, respuesta) => {
    respuesta.set("Cache-Control", "no-store");

    try {
      const datos = await almacen.leer();
      const evento = datos.eventos.find((item) => item.id === Number(solicitud.params.id));
      
      if (!evento) {
        respuesta.status(404).json({ mensaje: "El evento no existe." });
        return;
      }

      const usuarioId = solicitud.session.perfil.id;
      const participante = buscarParticipanteDeUsuario(datos, usuarioId);
      const inscripcion = participante && buscarInscripcion(datos, evento.id, participante.id);

      // Un ponente puede consultar y cancelar una confirmación administrativa propia.
      if (inscripcion?.estado !== "CONFIRMADA" && esPonenteAsignado(datos, evento, usuarioId)) {
        respuesta.status(409).json(conflictoPonenteAsignado);
        return;
      }

      respuesta.json(inscripcion ? representarInscripcion(datos, inscripcion) : null);
    } catch (error) {
      respuesta.status(500).json({ mensaje: "No se pudo consultar la inscripción." });
    }
  });

  // Crea o reactiva la inscripción del usuario en el evento.
  router.post("/:id/mi-inscripcion", async (solicitud, respuesta) => {
    if (solicitud.get("Origin") !== "http://localhost:4200") {
      respuesta.status(403).json({ mensaje: "El origen de la solicitud no está permitido." });
      return;
    }

    if (solicitud.body && Object.keys(solicitud.body).length > 0) {
      respuesta.status(400).json({ mensaje: "La solicitud no recibe datos." });
      return;
    }

    try {
      const resultado = await almacen.transaccion((datos) => {
        const evento = datos.eventos.find((item) => item.id === Number(solicitud.params.id));
        const usuario = datos.usuarios.find((item) => item.id === solicitud.session.perfil.id && item.rol === "USUARIO");
        
        if (!evento || !usuario) {
          return { estado: 404, mensaje: "El evento o usuario no existe." };
        }

        // La asignación se verifica dentro de la transacción antes de reservar cupo.
        if (esPonenteAsignado(datos, evento, usuario.id)) {
          throw Object.assign(new Error(conflictoPonenteAsignado.mensaje), { codigo: conflictoPonenteAsignado.codigo });
        }

        let participante = buscarParticipanteDeUsuario(datos, usuario.id);
        const inscripcion = participante && buscarInscripcion(datos, evento.id, participante.id);
        
        if (inscripcion?.estado === "CONFIRMADA") {
          return { estado: 409, mensaje: "Ya tienes una inscripción confirmada." };
        }
        
        const mensajeDisponibilidad = verificarDisponibilidad(datos, evento);

        if (mensajeDisponibilidad) {
          return { estado: 409, mensaje: mensajeDisponibilidad };
        }
        
        if (!participante) {
          participante = {
            id: datos.siguientesIds.participantes++, usuarioId: usuario.id,
            nombre: usuario.nombre, correo: usuario.correo, carrera: usuario.carrera
          };
          datos.participantes.push(participante);
        }
        
        const resultado = confirmarInscripcion(datos, evento, participante.id);

        if (resultado.mensaje) {
          const error = new Error(resultado.mensaje);
          error.estado = 409;
          throw error;
        }

        return {
          estado: resultado.reactivada ? 200 : 201,
          inscripcion: representarInscripcion(datos, resultado.inscripcion)
        };
      });

      if (resultado.inscripcion) {
        publicarCambio?.();
      }

      respuesta.status(resultado.estado).json(resultado.inscripcion || { mensaje: resultado.mensaje });
    } catch (error) {
      if (error.codigo === conflictoPonenteAsignado.codigo) {
        respuesta.status(409).json(conflictoPonenteAsignado);
        return;
      }

      respuesta.status(error.estado || 500).json({ mensaje: error.estado ? error.message : "No se pudo completar la inscripción." });
    }
  });

  // Cancela solo la inscripción vinculada a la cuenta de la sesión.
  router.patch("/:id/mi-inscripcion", async (solicitud, respuesta) => {
    if (solicitud.get("Origin") !== "http://localhost:4200") {
      respuesta.status(403).json({ mensaje: "El origen de la solicitud no está permitido." });
      return;
    }

    const cuerpo = solicitud.body;
    const eventoId = Number(solicitud.params.id);

    if (!Number.isSafeInteger(eventoId) || eventoId <= 0) {
      respuesta.status(400).json({ mensaje: "El ID de evento debe ser un entero positivo." });
      return;
    }

    if (cuerpo?.estado !== "CANCELADA" || Object.keys(cuerpo).length !== 1 || !Object.hasOwn(cuerpo, "estado")) {
      respuesta.status(400).json({ mensaje: "Envía únicamente el estado CANCELADA." });
      return;
    }

    try {
      const resultado = await almacen.transaccion((datos) => {
        const evento = datos.eventos.find((item) => item.id === eventoId);
        const usuario = datos.usuarios.find((item) => item.id === solicitud.session.perfil.id && item.rol === "USUARIO");

        if (!evento || !usuario) {
          throw Object.assign(new Error("El evento o usuario no existe."), { estado: 404 });
        }

        const participante = buscarParticipanteDeUsuario(datos, usuario.id);
        const inscripcion = participante && buscarInscripcion(datos, evento.id, participante.id);

        if (!inscripcion) {
          throw Object.assign(new Error("No tienes una inscripción en este evento."), { estado: 404 });
        }

        const { mensaje, cambiada } = cancelarInscripcion(evento, inscripcion);

        if (mensaje) {
          throw Object.assign(new Error(mensaje), { estado: 409 });
        }

        return {
          cambiada,
          inscripcion: { estado: inscripcion.estado, cuposDisponibles: obtenerCuposDisponibles(datos, evento) }
        };
      });

      if (resultado.cambiada) {
        publicarCambio?.();
      }

      respuesta.json(resultado.inscripcion);
    } catch (error) {
      respuesta.status(error.estado || 500).json({ mensaje: error.estado ? error.message : "No se pudo cancelar la inscripción." });
    }
  });

  return router;
};

const crearRouterNotificaciones = ({ almacen }) => {
  const router = express.Router();
  router.use(requiereUsuario);

  // Lista los avisos del usuario autenticado.
  router.get("/", async (solicitud, respuesta) => {
    
    try {
      const datos = await almacen.leer();
      respuesta.json(datos.notificaciones.filter((aviso) => aviso.usuarioId === solicitud.session.perfil.id));
    } catch (error) {
      respuesta.status(500).json({ mensaje: "No se pudieron consultar las notificaciones." });
    }
  
  });

  // Marca como leído un aviso del usuario autenticado.
  router.patch("/:id", async (solicitud, respuesta) => {
    if (solicitud.get("Origin") !== "http://localhost:4200") {
      respuesta.status(403).json({ mensaje: "El origen de la solicitud no está permitido." });
      return;
    }

    if (!solicitud.body || Object.keys(solicitud.body).length !== 1 || solicitud.body.leida !== true) {
      respuesta.status(400).json({ mensaje: "Indica que la notificación fue leída." });
      return;
    }

    try {
      const aviso = await almacen.transaccion((datos) => {
        const encontrado = datos.notificaciones.find((item) => item.id === Number(solicitud.params.id)
          && item.usuarioId === solicitud.session.perfil.id);
        if (encontrado) {
          encontrado.leida = true;
        }
        return encontrado;
      });
      
      if (!aviso) {
        respuesta.status(404).json({ mensaje: "La notificación no existe." });
        return;
      }
      
      respuesta.json(aviso);
    } catch (error) {
      respuesta.status(500).json({ mensaje: "No se pudo actualizar la notificación." });
    }
  });

  return router;
};

module.exports = { crearRouter, crearRouterMisInscripciones, crearRouterNotificaciones };
