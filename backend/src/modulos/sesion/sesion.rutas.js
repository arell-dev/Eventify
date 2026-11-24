const express = require("express");

const ORIGEN_AUTORIZADO = "http://localhost:4200";
const VENTANA_INTENTOS_MS = 15 * 60 * 1000;
const MAX_INTENTOS_FALLIDOS = 5;

// Limita los intentos fallidos de acceso por dirección de origen.
const crearRouter = (opciones = {}) => {
  const router = express.Router();
  const usuarioAdmin = opciones.usuarioAdmin ?? process.env.ADMIN_USUARIO;
  const contrasenaAdmin = opciones.contrasenaAdmin ?? process.env.ADMIN_CONTRASENA;
  const intentosPorOrigen = new Map();

  router.get("/", (solicitud, respuesta) => {
    if (!solicitud.session?.usuario) {
      respuesta.status(401).json({ mensaje: "No hay una sesión activa." });
      return;
    }

    respuesta.status(200).json({
      usuario: solicitud.session.usuario,
      rol: solicitud.session.rol
    });
  });

  router.post("/", (solicitud, respuesta, siguiente) => {
    if (solicitud.get("Origin") !== ORIGEN_AUTORIZADO) {
      respuesta.status(403).json({ mensaje: "El origen de la solicitud no está permitido." });
      return;
    }

    const cuerpo = solicitud.body;
    const camposValidos = cuerpo
      && typeof cuerpo === "object"
      && !Array.isArray(cuerpo)
      && Object.keys(cuerpo).length === 2
      && Object.hasOwn(cuerpo, "usuario")
      && Object.hasOwn(cuerpo, "contrasena")
      && typeof cuerpo.usuario === "string"
      && cuerpo.usuario.trim().length > 0
      && typeof cuerpo.contrasena === "string"
      && cuerpo.contrasena.length > 0;

    if (!camposValidos) {
      respuesta.status(400).json({ mensaje: "Envía usuario y contraseña válidos." });
      return;
    }

    const origen = solicitud.ip || solicitud.socket.remoteAddress || "desconocido";
    const ahora = Date.now();
    const registroIntentos = intentosPorOrigen.get(origen);

    if (registroIntentos && ahora - registroIntentos.inicio < VENTANA_INTENTOS_MS
      && registroIntentos.total >= MAX_INTENTOS_FALLIDOS) {
      respuesta.status(429).json({ mensaje: "Se alcanzó el límite de intentos. Inténtalo más tarde." });
      return;
    }

    if (!usuarioAdmin || !contrasenaAdmin) {
      respuesta.status(503).json({ mensaje: "El acceso administrativo no está configurado." });
      return;
    }

    if (cuerpo.usuario !== usuarioAdmin || cuerpo.contrasena !== contrasenaAdmin) {
      const mismoPeriodo = registroIntentos && ahora - registroIntentos.inicio < VENTANA_INTENTOS_MS;
      intentosPorOrigen.set(origen, {
        inicio: mismoPeriodo ? registroIntentos.inicio : ahora,
        total: mismoPeriodo ? registroIntentos.total + 1 : 1
      });
      respuesta.status(401).json({ mensaje: "El usuario o la contraseña son incorrectos." });
      return;
    }

    intentosPorOrigen.delete(origen);
    solicitud.session.regenerate((error) => {
      if (error) {
        siguiente(error);
        return;
      }

      solicitud.session.usuario = usuarioAdmin;
      solicitud.session.rol = "ADMIN";
      solicitud.session.save((errorGuardado) => {
        if (errorGuardado) {
          siguiente(errorGuardado);
          return;
        }

        respuesta.status(200).json({ usuario: usuarioAdmin, rol: "ADMIN" });
      });
    });
  });

  router.delete("/", (solicitud, respuesta, siguiente) => {
    if (solicitud.get("Origin") !== ORIGEN_AUTORIZADO) {
      respuesta.status(403).json({ mensaje: "El origen de la solicitud no está permitido." });
      return;
    }

    if (!solicitud.session) {
      respuesta.status(204).end();
      return;
    }

    solicitud.session.destroy((error) => {
      if (error) {
        siguiente(error);
        return;
      }

      respuesta.clearCookie("eventify.sid", { path: "/" });
      respuesta.status(204).end();
    });
  });

  return router;
};

module.exports = { crearRouter };
