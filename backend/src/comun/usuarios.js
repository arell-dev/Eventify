const { randomBytes, scryptSync, timingSafeEqual } = require("node:crypto");

// La sal es un valor aleatorio que hace diferente el hash de cada contraseña.
const protegerContrasena = (contrasena) => {
  const sal = randomBytes(16).toString("hex");
  const hash = scryptSync(contrasena, sal, 64).toString("hex");

  return `${sal}:${hash}`;
};

// Comprueba la contraseña recibida frente a la derivación guardada.
const comprobarContrasena = (contrasena, valor) => {
  if (typeof valor !== "string" || !valor.includes(":")) {
    return false;
  }

  const [sal, hash] = valor.split(":");
  const esperado = Buffer.from(hash, "hex");

  if (esperado.length !== 64) {
    return false;
  }

  return timingSafeEqual(scryptSync(contrasena, sal, 64), esperado);
};

// Permite comparar correos sin depender de espacios o mayúsculas.
const normalizarCorreo = (correo) => correo.trim().toLowerCase();

// Prepara los usuarios y vincula los perfiles con sus cuentas.
const inicializarUsuarios = (datos) => {
  let cambios = false;

  if (!Array.isArray(datos.usuarios)) {
    datos.usuarios = [];
    cambios = true;
  }

  if (!Array.isArray(datos.notificaciones)) {
    datos.notificaciones = [];
    cambios = true;
  }

  datos.siguientesIds ||= {};
  const siguienteUsuario = Math.max(0, ...datos.usuarios.map((usuario) => usuario.id)) + 1;
  const siguienteNotificacion = Math.max(0, ...datos.notificaciones.map((aviso) => aviso.id)) + 1;
  datos.siguientesIds.usuarios = Math.max(datos.siguientesIds.usuarios || 1, siguienteUsuario);
  datos.siguientesIds.notificaciones = Math.max(datos.siguientesIds.notificaciones || 1, siguienteNotificacion);

  // Evita cuentas con el mismo correo.
  const correos = new Set();

  for (const usuario of datos.usuarios) {
    if (Object.hasOwn(usuario, "contrasena")) {
      if (typeof usuario.contrasena !== "string" || usuario.contrasena.length < 8 || usuario.contrasenaHash) {
        throw new Error(`Contraseña inicial inválida para el usuario ${usuario.id}.`);
      }

      usuario.contrasenaHash = protegerContrasena(usuario.contrasena);
      delete usuario.contrasena;
      cambios = true;
    }

    const correo = normalizarCorreo(usuario.correo);

    if (correos.has(correo)) {
      throw new Error(`Hay usuarios duplicados con el correo ${correo}.`);
    }

    correos.add(correo);
  }

  // Vincula cada perfil de participante o ponente con su cuenta de usuario.
  for (const coleccion of [datos.participantes || [], datos.ponentes || []]) {
    const vistos = new Set();

    for (const persona of coleccion) {
      const correo = normalizarCorreo(persona.correo);

      if (vistos.has(correo)) {
        throw new Error(`Hay registros duplicados con el correo ${correo}.`);
      }

      vistos.add(correo);
      const usuario = persona.usuarioId
        ? datos.usuarios.find((item) => item.id === persona.usuarioId)
        : datos.usuarios.find((item) => normalizarCorreo(item.correo) === correo);

      if (persona.usuarioId && !usuario) {
        throw new Error(`La referencia del usuario ${correo} es inconsistente.`);
      }

      if (!usuario) {
        throw new Error(`No existe una cuenta de usuario para ${correo}.`);
      }

      if (!persona.usuarioId) {
        persona.usuarioId = usuario.id;
        cambios = true;
      } else if (persona.usuarioId !== usuario.id) {
        throw new Error(`La referencia del usuario ${correo} es inconsistente.`);
      }

      if (persona.carrera && !usuario.carrera) {
        usuario.carrera = persona.carrera;
        cambios = true;
      }

      if (persona.especialidad && !usuario.especialidad) {
        usuario.especialidad = persona.especialidad;
        cambios = true;
      }
    }
  }

  return cambios;
};

module.exports = { protegerContrasena, comprobarContrasena, normalizarCorreo, inicializarUsuarios };
