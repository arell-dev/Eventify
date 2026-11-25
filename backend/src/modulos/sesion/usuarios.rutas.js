const express = require("express");
const { protegerContrasena, normalizarCorreo } = require("../../comun/usuarios");
const { obtenerUsuariosDisponibles, representarUsuario } = require("../../comun/perfiles");

const crearRouter = ({ almacen }) => {
  const router = express.Router();

  router.get("/", async (solicitud, respuesta) => {
    try {
      const datos = await almacen.leer();
      const rol = solicitud.query.rol;

      if (rol && !["ponente", "participante"].includes(rol)) {
        respuesta.status(400).json({ mensaje: "El filtro de rol no es válido." });
        return;
      }

      if (!rol) {
        respuesta.json(datos.usuarios.map(representarUsuario));
        return;
      }

      const coleccion = rol === "ponente" ? "ponentes" : "participantes";

      respuesta.json(obtenerUsuariosDisponibles(datos, coleccion));
    } catch (error) {
      respuesta.status(500).json({ mensaje: "No se pudieron consultar los usuarios." });
    }
  });

  router.post("/", async (solicitud, respuesta) => {
    if (solicitud.get("Origin") !== "http://localhost:4200") {
      respuesta.status(403).json({ mensaje: "El origen de la solicitud no está permitido." });
      return;
    }

    const cuerpo = solicitud.body;
    const campos = ["nombre", "correo", "carrera", "especialidad", "contrasena"];
    if (!cuerpo || Array.isArray(cuerpo) || typeof cuerpo !== "object"
      || Object.keys(cuerpo).length !== campos.length
      || campos.some((campo) => typeof cuerpo[campo] !== "string")
      || !cuerpo.nombre.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cuerpo.correo.trim())
      || cuerpo.contrasena.length < 8) {
      
        respuesta.status(400).json({ mensaje: "Completa los datos y usa una contraseña de al menos ocho caracteres." });
      
      return;
    }

    try {
      const resultado = await almacen.transaccion((datos) => {
        
        if (datos.usuarios.some((usuario) => normalizarCorreo(usuario.correo) === normalizarCorreo(cuerpo.correo))) {
          return null;
        }
        
        const usuario = {
          id: datos.siguientesIds.usuarios++,
          nombre: cuerpo.nombre.trim(),
          correo: cuerpo.correo.trim(),
          carrera: cuerpo.carrera.trim(),
          especialidad: cuerpo.especialidad.trim(),
          rol: "USUARIO",
          contrasenaHash: protegerContrasena(cuerpo.contrasena)
        };
        
        datos.usuarios.push(usuario);
        return representarUsuario(usuario);
      });
      
      if (!resultado) {
        respuesta.status(409).json({ mensaje: "Ya existe un usuario con ese correo." });
        return;
      }
      
      respuesta.status(201).json(resultado);
    } catch (error) {
      respuesta.status(500).json({ mensaje: "No se pudo registrar el usuario." });
    }
  });

  return router;
};

module.exports = { crearRouter };
