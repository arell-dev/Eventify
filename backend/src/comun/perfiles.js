const { normalizarCorreo } = require("./usuarios");

class ErrorPerfil extends Error {
  constructor(estado, mensaje) {
    super(mensaje);
    this.estado = estado;
  }
}

// Las dos rutas de alta y el padrón comparten los requisitos de cada perfil.
const reglas = {
  participantes: { nombre: "participante", campo: "carrera" },
  ponentes: { nombre: "ponente", campo: "especialidad" }
};

const leerId = (valor) => {
  if (!/^[1-9]\d*$/.test(valor) || !Number.isSafeInteger(Number(valor))) {
    throw new ErrorPerfil(400, "El identificador debe ser un entero positivo.");
  }

  return Number(valor);
};

const validarCuerpo = (cuerpo, campos) => {
  if (!cuerpo || typeof cuerpo !== "object" || Array.isArray(cuerpo)
    || Object.keys(cuerpo).length !== campos.length
    || campos.some((campo) => !Object.hasOwn(cuerpo, campo))) {
    throw new ErrorPerfil(400, "El cuerpo contiene campos faltantes o no permitidos.");
  }
};

const buscarPerfil = (datos, coleccion, id) => {
  const perfil = datos[coleccion].find((elemento) => elemento.id === id);

  if (!perfil) {
    throw new ErrorPerfil(404, `El ${reglas[coleccion].nombre} no existe.`);
  }

  return perfil;
};

const recortar = (valor) => typeof valor === "string" ? valor.trim() : "";

const obtenerDatosPerfil = (origen, coleccion) => {
  const { campo } = reglas[coleccion];

  return { nombre: recortar(origen.nombre), correo: recortar(origen.correo), [campo]: recortar(origen[campo]) };
};

const obtenerErrorPerfil = (perfil, { campo }) => {
  if (!perfil.nombre || !perfil.correo || !perfil[campo]) {
    return `Nombre, correo y ${campo} son obligatorios.`;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(perfil.correo)) {
    return "Ingresa un correo válido.";
  }

  return null;
};

const validarDatosPerfil = (origen, coleccion) => {
  const perfil = obtenerDatosPerfil(origen, coleccion);
  const mensaje = obtenerErrorPerfil(perfil, reglas[coleccion]);

  if (mensaje) {
    throw new ErrorPerfil(400, mensaje);
  }

  return perfil;
};

const correoPerfilOcupado = (perfiles, correo, idExcluir) => {
  const correoNormalizado = normalizarCorreo(correo);

  return perfiles.some((perfil) => perfil.id !== idExcluir && normalizarCorreo(perfil.correo) === correoNormalizado);
};

const representarUsuario = (usuario) => ({
  id: usuario.id,
  nombre: usuario.nombre,
  correo: usuario.correo,
  carrera: usuario.carrera,
  especialidad: usuario.especialidad,
  rol: usuario.rol
});

// Excluye cuentas incompletas y correos o usuarios ocupados en la colección solicitada.
const obtenerUsuariosDisponibles = (datos, coleccion) => {
  const perfiles = datos[coleccion];

  return datos.usuarios.filter((usuario) => {
    const perfil = obtenerDatosPerfil(usuario, coleccion);

    return usuario.rol === "USUARIO" && !obtenerErrorPerfil(perfil, reglas[coleccion])
      && !perfiles.some((elemento) => elemento.usuarioId === usuario.id)
      && !correoPerfilOcupado(perfiles, perfil.correo);
  }).map(representarUsuario);
};

// La validación y la asignación del ID se ejecutan en la misma transacción.
const registrarPerfil = (datos, coleccion, cuerpo) => {
  validarCuerpo(cuerpo, ["usuarioId"]);
  const { usuarioId } = cuerpo;

  if (!Number.isSafeInteger(usuarioId) || usuarioId < 1) {
    throw new ErrorPerfil(400, "Selecciona un usuario con un identificador entero positivo.");
  }

  const usuario = datos.usuarios.find((elemento) => elemento.id === usuarioId && elemento.rol === "USUARIO");

  if (!usuario) {
    throw new ErrorPerfil(404, "El usuario seleccionado no existe.");
  }

  const { nombre } = reglas[coleccion];
  const perfiles = datos[coleccion];

  if (perfiles.some((perfil) => perfil.usuarioId === usuarioId)) {
    throw new ErrorPerfil(409, `El usuario seleccionado ya está registrado como ${nombre}.`);
  }

  const entrada = validarDatosPerfil(usuario, coleccion);

  if (correoPerfilOcupado(perfiles, entrada.correo)) {
    throw new ErrorPerfil(409, `Ya existe un ${nombre} con ese correo.`);
  }

  const id = datos.siguientesIds[coleccion];

  if (!Number.isSafeInteger(id) || id < 1 || id === Number.MAX_SAFE_INTEGER) {
    throw new ErrorPerfil(500, `No se pudo asignar un ID de ${nombre}.`);
  }

  if (coleccion === "participantes") {
    entrada.correo = normalizarCorreo(entrada.correo);
  }

  const perfil = { id, usuarioId, ...entrada };

  datos.siguientesIds[coleccion] = id + 1;
  perfiles.push(perfil);

  return perfil;
};

const manejarPerfil = (accion) => async (solicitud, respuesta) => {
  try {
    await accion(solicitud, respuesta);
  } catch (error) {
    if (error instanceof ErrorPerfil) {
      respuesta.status(error.estado).json({ mensaje: error.message });
      return;
    }

    console.error("Error al administrar perfiles:", error);
    respuesta.status(500).json({ mensaje: "No se pudo completar la operación." });
  }
};

const limitarOrigenDeCambios = (solicitud, respuesta, siguiente) => {
  if (["POST", "PUT", "DELETE"].includes(solicitud.method)
    && solicitud.get("Origin") !== "http://localhost:4200") {
    respuesta.status(403).json({ mensaje: "El origen de la solicitud no está permitido." });
    return;
  }

  siguiente();
};

module.exports = {
  ErrorPerfil, leerId, validarCuerpo, buscarPerfil, validarDatosPerfil, correoPerfilOcupado,
  representarUsuario, obtenerUsuariosDisponibles, registrarPerfil, manejarPerfil, limitarOrigenDeCambios
};
