const express = require("express");
const cors = require("cors");
const session = require("express-session");
const { randomBytes } = require("node:crypto");
const { requiereAdministrador } = require("./comun/acceso-administrativo");
const { almacen: almacenCompartido } = require("./comun/almacen");
const { crearRouter: crearRouterInscripciones } = require("./modulos/inscripciones/inscripciones.rutas");
const { crearRouter: crearRouterEventos, crearRouterPublico } = require("./modulos/eventos/eventos.rutas");
const { crearRouter: crearRouterParticipantes } = require("./modulos/participantes/participantes.rutas");
const { crearRouter: crearRouterPonentes } = require("./modulos/ponentes/ponentes.rutas");
const { crearRouter: crearRouterSesion } = require("./modulos/sesion/sesion.rutas");
const { crearRouter: crearRouterUsuarios } = require("./modulos/sesion/usuarios.rutas");
const { crearRouter: crearRouterInscripcionPublica, crearRouterNotificaciones } = require("./modulos/sesion/publico.rutas");

const crearApp = (opciones = {}) => {
  const app = express();
  const almacen = opciones.almacen || almacenCompartido;
  const requiereAdministradorConfigurado = opciones.requiereAdministrador || requiereAdministrador;
  const opcionesCatalogos = { almacen };

  app.use(cors({ origin: "http://localhost:4200", credentials: true }));
  app.use(express.json());
  app.use(session({
    name: "eventify.sid",
    secret: opciones.secretoSesion || randomBytes(32).toString("hex"),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 60 * 60 * 1000
    }
  }));

  app.get("/api/estado", (solicitud, respuesta) => {
    respuesta.status(200).json({ estado: "ok" });
  });

  app.use("/api/sesion", crearRouterSesion({ almacen }));
  app.use("/api/usuarios", requiereAdministradorConfigurado, crearRouterUsuarios(opcionesCatalogos));
  
  app.use("/api/publico/eventos", crearRouterPublico(opcionesCatalogos));
  app.use("/api/publico/eventos", crearRouterInscripcionPublica(opcionesCatalogos));

  app.use("/api/notificaciones", crearRouterNotificaciones(opcionesCatalogos));


  app.use("/api/eventos", requiereAdministradorConfigurado, crearRouterEventos(opcionesCatalogos));
  
  app.use("/api/ponentes", requiereAdministradorConfigurado, crearRouterPonentes(opcionesCatalogos));

  app.use("/api/participantes", requiereAdministradorConfigurado, crearRouterParticipantes(opcionesCatalogos));
  
  app.use("/api/inscripciones", crearRouterInscripciones({
    almacen,
    requiereSesion: requiereAdministradorConfigurado
  }));

  app.use((solicitud, respuesta) => {
    respuesta.status(404).json({ mensaje: "Ruta no encontrada." });
  });

  return app;
};

const app = crearApp();

app.crearApp = crearApp;

module.exports = app;
