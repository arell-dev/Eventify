const express = require("express");
const { representarInscripcion } = require("../inscripciones/inscripciones.datos");
const {
  ErrorPerfil, leerId, buscarPerfil, obtenerUsuariosDisponibles, registrarPerfil, manejarPerfil, limitarOrigenDeCambios
} = require("../../comun/perfiles");

const crearRouter = ({ almacen }) => {
  const router = express.Router();

  router.use(limitarOrigenDeCambios);

  // Lista los participantes registrados.
  router.get("/", manejarPerfil(async (solicitud, respuesta) => {
    const datos = await almacen.leer();

    respuesta.json(datos.participantes);
  }));

  // El selector de Mateo consulta el mismo padrón que la ruta de usuarios.
  router.get("/usuarios-disponibles", manejarPerfil(async (solicitud, respuesta) => {
    const datos = await almacen.leer();

    respuesta.json(obtenerUsuariosDisponibles(datos, "participantes"));
  }));

  // Incorpora los títulos de los eventos sin duplicar la representación de Inscripciones.
  router.get("/:id/inscripciones", manejarPerfil(async (solicitud, respuesta) => {
    const id = leerId(solicitud.params.id);
    const datos = await almacen.leer();

    buscarPerfil(datos, "participantes", id);

    const inscripciones = datos.inscripciones.filter((inscripcion) => inscripcion.participanteId === id)
      .map((inscripcion) => representarInscripcion(datos, inscripcion));

    respuesta.json(inscripciones);
  }));

  router.get("/:id", manejarPerfil(async (solicitud, respuesta) => {
    const id = leerId(solicitud.params.id);
    const datos = await almacen.leer();

    respuesta.json(buscarPerfil(datos, "participantes", id));
  }));

  // Crea el perfil de participante para una cuenta de usuario.
  router.post("/", manejarPerfil(async (solicitud, respuesta) => {
    const participante = await almacen.transaccion((datos) => registrarPerfil(datos, "participantes", solicitud.body));

    respuesta.status(201).json(participante);
  }));

  // Una inscripción cancelada también conserva su vínculo con el participante.
  router.delete("/:id", manejarPerfil(async (solicitud, respuesta) => {
    const id = leerId(solicitud.params.id);
    const participante = await almacen.transaccion((datos) => {
      const existente = buscarPerfil(datos, "participantes", id);
      const relacionadas = datos.inscripciones.filter((inscripcion) => inscripcion.participanteId === id);

      if (relacionadas.length) {
        const ids = relacionadas.map((inscripcion) => inscripcion.id).join(", ");

        throw new ErrorPerfil(409, `El participante tiene inscripciones relacionadas: ${ids}.`);
      }

      datos.participantes = datos.participantes.filter((elemento) => elemento.id !== id);

      return existente;
    });

    respuesta.json(participante);
  }));

  return router;
};

module.exports = { crearRouter };
