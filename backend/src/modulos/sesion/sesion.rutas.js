const express = require("express");
const { comprobarContrasena, normalizarCorreo } = require("../../comun/usuarios");

const ORIGEN_AUTORIZADO = "http://localhost:4200";
const VENTANA_INTENTOS_MS = 15 * 60 * 1000;
const MAX_INTENTOS_FALLIDOS = 5;

// Limita los intentos fallidos de acceso por dirección de origen.
const crearRouter = (opciones = {}) => {
  const router = express.Router();
  const almacen = opciones.almacen;
  const intentosPorOrigen = new Map();

  router.get("/", (solicitud, respuesta) => {
    if (!solicitud.session?.usuario) {
      respuesta.status(401).json({ mensaje: "No hay una sesión activa." });
      return;
    }

    const sesion = { usuario: solicitud.session.usuario, rol: solicitud.session.rol };

    if (solicitud.session.perfil) {
      sesion.perfil = solicitud.session.perfil;
    }

    respuesta.status(200).json(sesion);
  });

  router.post("/", async (solicitud, respuesta, siguiente) => {
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

    let usuario;

    try {
      const datos = await almacen.leer();
      usuario = datos.usuarios.find((item) => normalizarCorreo(item.correo) === normalizarCorreo(cuerpo.usuario));
    } catch (error) {
      siguiente(error);
      return;
    }

    if (!usuario || !comprobarContrasena(cuerpo.contrasena, usuario.contrasenaHash)) {
      const mismoPeriodo = registroIntentos && ahora - registroIntentos.inicio < VENTANA_INTENTOS_MS;
      intentosPorOrigen.set(origen, {
        inicio: mismoPeriodo ? registroIntentos.inicio : ahora,
        total: mismoPeriodo ? registroIntentos.total + 1 : 1
      });
      respuesta.status(401).json({ mensaje: "El usuario o la contraseña son incorrectos." });
      return;
    }

    const perfil = usuario.rol === "USUARIO" ? {
      id: usuario.id, nombre: usuario.nombre, correo: usuario.correo, carrera: usuario.carrera || ""
    } : undefined;
    const correoSesion = usuario.correo;
    const rol = usuario.rol;
    intentosPorOrigen.delete(origen);
    solicitud.session.regenerate((error) => {
      if (error) {
        siguiente(error);
        return;
      }

      solicitud.session.usuario = correoSesion;
      solicitud.session.rol = rol;
      solicitud.session.perfil = perfil;
      
      solicitud.session.save((errorGuardado) => {
        if (errorGuardado) {
          siguiente(errorGuardado);
          return;
        }

        const sesion = { usuario: correoSesion, rol };
        if (perfil) {
          sesion.perfil = perfil;
        }
        respuesta.status(200).json(sesion);
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
