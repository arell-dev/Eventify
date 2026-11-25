const { contarConfirmadas, obtenerCuposDisponibles } = require("../inscripciones/inscripciones.datos");

class ErrorEvento extends Error {
  constructor(estado, mensaje) {
    super(mensaje);
    this.estado = estado;
  }
}

// Valida los identificadores que llegan en las rutas.
const obtenerId = (valor) => {
  const id = Number(valor);

  if (!Number.isInteger(id) || id < 1) {
    throw new ErrorEvento(400, "El identificador debe ser un entero positivo.");
  }

  return id;
};

const buscarEvento = (datos, id) => {
  const evento = datos.eventos.find((elemento) => elemento.id === id);

  if (!evento) {
    throw new ErrorEvento(404, "El evento no existe.");
  }

  return evento;
};

// Los cupos se calculan a partir de las inscripciones actuales.
const representarEvento = (datos, evento) => ({
  ...evento,
  inscripcionesConfirmadas: contarConfirmadas(datos, evento.id),
  cuposDisponibles: obtenerCuposDisponibles(datos, evento)
});

// Registra avisos internos junto con el cambio del evento.
const notificarPonente = (datos, evento, accion) => {
  const ponente = datos.ponentes.find((elemento) => elemento.id === evento.ponenteId);

  if (!ponente?.usuarioId) {
    return;
  }

  datos.notificaciones.push({
    id: datos.siguientesIds.notificaciones++,
    usuarioId: ponente.usuarioId,
    eventoId: evento.id,
    mensaje: `El evento ${evento.titulo} ${accion}.`,
    fecha: new Date().toISOString(),
    leida: false
  });
};

// Comprueba el contrato y las relaciones dentro de la transacción.
const validarEvento = (cuerpo, datos, id) => {
  const campos = [
    "titulo", "descripcion", "tipo", "modalidad", "lugar",
    "enlace", "inicio", "fin", "cupo", "ponenteId"
  ];

  if (!cuerpo || typeof cuerpo !== "object" || Array.isArray(cuerpo)
    || Object.keys(cuerpo).length !== campos.length
    || campos.some((campo) => !Object.hasOwn(cuerpo, campo))) {
    throw new ErrorEvento(400, "Envía todos los campos permitidos del evento.");
  }

  const textos = ["titulo", "descripcion", "tipo", "modalidad", "lugar", "enlace", "inicio", "fin"];

  if (textos.some((campo) => typeof cuerpo[campo] !== "string")) {
    throw new ErrorEvento(400, "Los campos de texto deben ser cadenas.");
  }

  const evento = { ...cuerpo };
  textos.forEach((campo) => {
    evento[campo] = evento[campo].trim();
  });

  if (!evento.titulo || !evento.descripcion || !evento.tipo
    || !["PRESENCIAL", "VIRTUAL", "HIBRIDO"].includes(evento.modalidad)) {
    throw new ErrorEvento(400, "Completa el título, descripción, tipo y modalidad.");
  }

  if ((evento.modalidad !== "VIRTUAL" && !evento.lugar)
    || (evento.modalidad === "VIRTUAL" && evento.lugar)
    || (evento.modalidad === "PRESENCIAL" && evento.enlace)) {
    throw new ErrorEvento(400, "El lugar y enlace deben corresponder a la modalidad.");
  }

  if (evento.modalidad !== "PRESENCIAL") {
    try {
      const enlace = new URL(evento.enlace);

      if (!["http:", "https:"].includes(enlace.protocol)) {
        throw new Error();
      }
    } catch {
      throw new ErrorEvento(400, "Ingresa un enlace HTTP o HTTPS válido.");
    }
  }

  const patronFecha = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
  const inicio = Date.parse(evento.inicio);
  const fin = Date.parse(evento.fin);
  const fechaValida = (valor, instante) => {
    return patronFecha.test(valor) && Number.isFinite(instante)
      && new Date(instante).toISOString().slice(0, 19) === valor.slice(0, 19);
  };

  if (!fechaValida(evento.inicio, inicio) || !fechaValida(evento.fin, fin) || fin <= inicio) {
    throw new ErrorEvento(400, "Las fechas deben ser UTC válidas y el fin posterior al inicio.");
  }

  if (!Number.isInteger(evento.cupo) || evento.cupo < 1
    || !Number.isInteger(evento.ponenteId) || evento.ponenteId < 1) {
    throw new ErrorEvento(400, "El cupo y el ponente deben ser números enteros positivos.");
  }

  if (!datos.ponentes.some((ponente) => ponente.id === evento.ponenteId)) {
    throw new ErrorEvento(404, "El ponente seleccionado no existe.");
  }

  // Los eventos contiguos no se consideran superpuestos.
  const horarioOcupado = datos.eventos.some((existente) => {
    return existente.id !== id && existente.ponenteId === evento.ponenteId
      && inicio < Date.parse(existente.fin) && fin > Date.parse(existente.inicio);
  });

  if (horarioOcupado) {
    throw new ErrorEvento(409, "El ponente tiene otro evento en ese horario.");
  }

  if (id && evento.cupo < contarConfirmadas(datos, id)) {
    throw new ErrorEvento(409, "El cupo no puede ser menor que las inscripciones confirmadas.");
  }

  return evento;
};


module.exports = { ErrorEvento, obtenerId, buscarEvento, representarEvento, notificarPonente, validarEvento };
