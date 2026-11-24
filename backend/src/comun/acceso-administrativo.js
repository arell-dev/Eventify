// Exige una sesión de administrador antes de consultar recursos privados.
const requiereAdministrador = (solicitud, respuesta, siguiente) => {
  if (!solicitud.session || !solicitud.session.usuario) {
    respuesta.status(401).json({ mensaje: "Debes iniciar sesión para acceder a este recurso." });
    return;
  }

  if (solicitud.session.rol !== "ADMIN") {
    respuesta.status(403).json({ mensaje: "No tienes permisos para acceder a este recurso." });
    return;
  }

  siguiente();
};

module.exports = { requiereAdministrador };
