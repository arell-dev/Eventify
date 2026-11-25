const express = require("express");
const { verificarDisponibilidad, representarInscripcion, confirmarInscripcion } = require("../inscripciones/inscripciones.datos");

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

const crearRouter = ({ almacen }) => {
  const router = express.Router();
  router.use(requiereUsuario);

  // Consulta la inscripción del usuario en el evento.
  router.get("/:id/mi-inscripcion", async (solicitud, respuesta) => {
    try {
      const datos = await almacen.leer();
      const evento = datos.eventos.find((item) => item.id === Number(solicitud.params.id));
      
      if (!evento) {
        respuesta.status(404).json({ mensaje: "El evento no existe." });
        return;
      }

      const participante = datos.participantes.find((item) => item.usuarioId === solicitud.session.perfil.id);
      const inscripcion = participante && datos.inscripciones.find((item) => {
        return item.eventoId === evento.id && item.participanteId === participante.id;
      });
      
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
        
        let participante = datos.participantes.find((item) => item.usuarioId === usuario.id);
        const inscripcion = participante && datos.inscripciones.find((item) => {
          return item.eventoId === evento.id && item.participanteId === participante.id;
        });
        
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
      respuesta.status(resultado.estado).json(resultado.inscripcion || { mensaje: resultado.mensaje });
    } catch (error) {
      respuesta.status(error.estado || 500).json({ mensaje: error.estado ? error.message : "No se pudo completar la inscripción." });
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

module.exports = { crearRouter, crearRouterNotificaciones };
