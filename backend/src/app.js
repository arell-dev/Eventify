const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors({ origin: "http://localhost:4200" }));
app.use(express.json());

app.get("/api/estado", (solicitud, respuesta) => {
  respuesta.status(200).json({ estado: "ok" });
});

app.use((solicitud, respuesta) => {
  respuesta.status(404).json({ mensaje: "Ruta no encontrada." });
});

module.exports = app;
