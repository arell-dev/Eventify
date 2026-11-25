const express = require("express");
const { representarEvento } = require("../eventos/eventos.datos");
const { ErrorPerfil, leerId, validarCuerpo, buscarPerfil, validarDatosPerfil, correoPerfilOcupado, registrarPerfil, manejarPerfil, limitarOrigenDeCambios } = require("../../comun/perfiles");

const crearRouter = ({ almacen }) => {
  const router = express.Router();

  router.use(limitarOrigenDeCambios);

  // Lista los ponentes disponibles para la administración.
  router.get("/", manejarPerfil(async (solicitud, respuesta) => {
    const datos = await almacen.leer();

    respuesta.json(datos.ponentes);
  }));

  // Conserva el orden de la agenda y muestra la ocupación vigente de cada evento.
  router.get("/:id/eventos", manejarPerfil(async (solicitud, respuesta) => {
    const id = leerId(solicitud.params.id);
    const datos = await almacen.leer();

    buscarPerfil(datos, "ponentes", id);

    const eventos = datos.eventos.filter((evento) => evento.ponenteId === id)
      .sort((primero, segundo) => Date.parse(primero.inicio) - Date.parse(segundo.inicio))
      .map((evento) => representarEvento(datos, evento));

    respuesta.json(eventos);
  }));

  router.get("/:id", manejarPerfil(async (solicitud, respuesta) => {
    const id = leerId(solicitud.params.id);
    const datos = await almacen.leer();

    respuesta.json(buscarPerfil(datos, "ponentes", id));
  }));

  // Crea el perfil de ponente para una cuenta de usuario.
  router.post("/", manejarPerfil(async (solicitud, respuesta) => {
    const ponente = await almacen.transaccion((datos) => registrarPerfil(datos, "ponentes", solicitud.body));

    respuesta.status(201).json(ponente);
  }));

  // Actualiza los campos públicos del perfil y conserva su cuenta de origen.
  router.put("/:id", manejarPerfil(async (solicitud, respuesta) => {
    const id = leerId(solicitud.params.id);

    validarCuerpo(solicitud.body, ["nombre", "correo", "especialidad"]);

    const entrada = validarDatosPerfil(solicitud.body, "ponentes");
    const ponente = await almacen.transaccion((datos) => {
      const existente = buscarPerfil(datos, "ponentes", id);

      if (correoPerfilOcupado(datos.ponentes, entrada.correo, id)) {
        throw new ErrorPerfil(409, "Ya existe un ponente con ese correo.");
      }

      Object.assign(existente, entrada);

      return existente;
    });

    respuesta.json(ponente);
  }));

  // Los eventos asignados impiden la baja, aunque ya hayan finalizado.
  router.delete("/:id", manejarPerfil(async (solicitud, respuesta) => {
    const id = leerId(solicitud.params.id);
    const ponente = await almacen.transaccion((datos) => {
      const existente = buscarPerfil(datos, "ponentes", id);
      const relacionados = datos.eventos.filter((evento) => evento.ponenteId === id);

      if (relacionados.length) {
        const titulos = relacionados.map((evento) => evento.titulo).join(", ");

        throw new ErrorPerfil(409, `No se puede eliminar al ponente porque tiene eventos asignados: ${titulos}.`);
      }

      datos.ponentes = datos.ponentes.filter((elemento) => elemento.id !== id);

      return existente;
    });

    respuesta.json(ponente);
  }));

  return router;
};

module.exports = { crearRouter };
