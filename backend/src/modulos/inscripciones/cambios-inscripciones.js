// Cada instancia avisa a sus conexiones abiertas cuando cambia el almacén.
const crearCambiosInscripciones = () => {
  const conexiones = new Set();

  const escribir = (respuesta, mensaje) => {
    if (!respuesta.destroyed && !respuesta.writableEnded && !respuesta.write(mensaje)) {
      respuesta.destroy();
    }
  };

  const conectar = (solicitud, respuesta) => {
    respuesta.set({
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no"
    });

    if (solicitud.method === "HEAD") {
      respuesta.end();
      return;
    }

    conexiones.add(respuesta);

    const mantenerConexion = setInterval(() => escribir(respuesta, ": conexión activa\n\n"), 15000);
    mantenerConexion.unref();
    respuesta.once("close", () => {
      clearInterval(mantenerConexion);
      conexiones.delete(respuesta);
    });

    escribir(respuesta, ": conectado\n\n");
  };

  const publicar = () => {
    for (const respuesta of conexiones) {
      escribir(respuesta, "event: inscripciones\ndata: {}\n\n");
    }
  };

  return { conectar, publicar };
};

module.exports = { crearCambiosInscripciones };
