const express = require("express");
const { almacen: almacenCompartido } = require("../../comun/almacen");
const { contarConfirmadas, obtenerCuposDisponibles } = require("../inscripciones/inscripciones.rutas");

// Publica un catálogo del almacén dentro de la administración.
const crearRouterCatalogo = (coleccion, opciones = {}) => {
  const router = express.Router();
  const almacen = opciones.almacen || almacenCompartido;

  router.get("/", async (solicitud, respuesta) => {
    try {
      const datos = await almacen.leer();
      const recursos = coleccion === "eventos"
        ? datos.eventos.map((evento) => ({
          ...evento,
          inscripcionesConfirmadas: contarConfirmadas(datos, evento.id),
          cuposDisponibles: obtenerCuposDisponibles(datos, evento)
        }))
        : datos.participantes;

      respuesta.status(200).json(recursos);
    } catch (error) {
      console.error(`Error al consultar ${coleccion} administrativos:`, error);
      respuesta.status(500).json({ mensaje: `No se pudieron cargar ${coleccion}.` });
    }
  });

  return router;
};

const crearRouterEventos = (opciones) => crearRouterCatalogo("eventos", opciones);
const crearRouterParticipantes = (opciones) => crearRouterCatalogo("participantes", opciones);

module.exports = { crearRouterEventos, crearRouterParticipantes };
