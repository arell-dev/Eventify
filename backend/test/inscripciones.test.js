const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const express = require("express");
const { crearAlmacen } = require("../src/comun/almacen");
const { crearRouter } = require("../src/modulos/inscripciones/inscripciones.rutas");

const crearSemillaPrueba = () => {
  const inicio = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
  const fin = new Date(new Date(inicio).getTime() + 2 * 60 * 60 * 1000).toISOString();

  return {
    usuarios: [
      {
        id: 1,
        nombre: "Ponente de prueba",
        correo: "ponente@example.com",
        carrera: "",
        especialidad: "Web",
        rol: "USUARIO",
        contrasena: "prueba123"
      },
      {
        id: 2,
        nombre: "Participante Uno",
        correo: "uno@example.com",
        carrera: "Sistemas",
        especialidad: "",
        rol: "USUARIO",
        contrasena: "prueba123"
      },
      {
        id: 3,
        nombre: "Participante Dos",
        correo: "dos@example.com",
        carrera: "Industrial",
        especialidad: "",
        rol: "USUARIO",
        contrasena: "prueba123"
      }
    ],
    ponentes: [
      {
        id: 1,
        nombre: "Ponente de prueba",
        correo: "ponente@example.com",
        especialidad: "Web"
      }
    ],
    participantes: [
      {
        id: 1,
        nombre: "Participante Uno",
        correo: "uno@example.com",
        carrera: "Sistemas"
      },
      {
        id: 2,
        nombre: "Participante Dos",
        correo: "dos@example.com",
        carrera: "Industrial"
      }
    ],
    eventos: [
      {
        id: 1,
        titulo: "Evento de prueba",
        descripcion: "Evento para pruebas automatizadas.",
        tipo: "TALLER",
        modalidad: "PRESENCIAL",
        lugar: "UTP Piura",
        enlace: "",
        inicio,
        fin,
        cupo: 1,
        ponenteId: 1
      }
    ],
    inscripciones: [],
    siguientesIds: {
      ponentes: 2,
      participantes: 3,
      eventos: 2,
      inscripciones: 1
    }
  };
};

const prepararAplicacion = async (contexto) => {
  const directorio = await fs.mkdtemp(path.join(os.tmpdir(), "eventify-inscripciones-"));
  const rutaSemilla = path.join(directorio, "data.json");
  const rutaDatos = path.join(directorio, "eventify.json");

  await fs.writeFile(rutaSemilla, JSON.stringify(crearSemillaPrueba(), null, 2));

  const almacen = crearAlmacen({ rutaDatos, rutaSemilla });
  const aplicacion = express();

  aplicacion.use(express.json());
  aplicacion.use("/api/inscripciones", crearRouter({
    almacen,
    requiereSesion: (solicitud, respuesta, siguiente) => siguiente()
  }));
  aplicacion.use((solicitud, respuesta) => respuesta.status(404).json({ mensaje: "No encontrado." }));

  const servidor = aplicacion.listen(0);
  await new Promise((resolver) => servidor.once("listening", resolver));
  const direccion = servidor.address();
  const baseUrl = `http://127.0.0.1:${direccion.port}/api/inscripciones`;

  contexto.after(async () => {
    await new Promise((resolver, rechazar) => {
      servidor.close((error) => error ? rechazar(error) : resolver());
    });
    await fs.rm(directorio, { recursive: true, force: true });
  });

  return { baseUrl, almacen };
};

const solicitar = async (url, metodo = "GET", cuerpo) => {
  const opciones = { method: metodo, headers: { Origin: "http://localhost:4200" } };

  if (cuerpo !== undefined) {
    opciones.headers["Content-Type"] = "application/json";
    opciones.body = JSON.stringify(cuerpo);
  }

  const respuesta = await fetch(url, opciones);
  const contenido = respuesta.status === 204 ? null : await respuesta.json();

  return { respuesta, contenido };
};

test("registra, cancela, reactiva y elimina una inscripción conservando su ID", async (contexto) => {
  const { baseUrl, almacen } = await prepararAplicacion(contexto);
  const registro = await solicitar(baseUrl, "POST", { eventoId: 1, participanteId: 1 });

  assert.equal(registro.respuesta.status, 201);
  assert.equal(registro.contenido.estado, "CONFIRMADA");
  assert.equal(registro.contenido.cuposDisponibles, 0);

  const listado = await solicitar(baseUrl);
  const detalle = await solicitar(`${baseUrl}/${registro.contenido.id}`);

  assert.equal(listado.respuesta.status, 200);
  assert.equal(listado.contenido.length, 1);
  assert.equal(detalle.respuesta.status, 200);
  assert.equal(detalle.contenido.participanteNombre, "Participante Uno");

  const duplicado = await solicitar(baseUrl, "POST", { eventoId: 1, participanteId: 1 });
  assert.equal(duplicado.respuesta.status, 409);

  const cancelar = await solicitar(`${baseUrl}/${registro.contenido.id}`, "PATCH", { estado: "CANCELADA" });
  assert.equal(cancelar.respuesta.status, 200);
  assert.equal(cancelar.contenido.cuposDisponibles, 1);

  const reactivar = await solicitar(baseUrl, "POST", { eventoId: 1, participanteId: 1 });
  assert.equal(reactivar.respuesta.status, 200);
  assert.equal(reactivar.contenido.id, registro.contenido.id);

  await solicitar(`${baseUrl}/${registro.contenido.id}`, "PATCH", { estado: "CANCELADA" });
  const eliminar = await solicitar(`${baseUrl}/${registro.contenido.id}`, "DELETE");
  assert.equal(eliminar.respuesta.status, 200);

  const datos = await almacen.leer();
  assert.equal(datos.inscripciones.length, 0);
});

test("no permite confirmar más inscripciones que los cupos disponibles", async (contexto) => {
  const { baseUrl } = await prepararAplicacion(contexto);
  const primera = await solicitar(baseUrl, "POST", { eventoId: 1, participanteId: 1 });
  const segunda = await solicitar(baseUrl, "POST", { eventoId: 1, participanteId: 2 });

  assert.equal(primera.respuesta.status, 201);
  assert.equal(segunda.respuesta.status, 409);
  assert.match(segunda.contenido.mensaje, /cupos disponibles/i);
});

test("rechaza IDs inválidos, referencias inexistentes y eliminación de confirmadas", async (contexto) => {
  const { baseUrl } = await prepararAplicacion(contexto);
  const idInvalido = await solicitar(`${baseUrl}/abc`);
  const participanteInexistente = await solicitar(baseUrl, "POST", { eventoId: 1, participanteId: 99 });
  const registro = await solicitar(baseUrl, "POST", { eventoId: 1, participanteId: 1 });
  const eliminarConfirmada = await solicitar(`${baseUrl}/${registro.contenido.id}`, "DELETE");

  assert.equal(idInvalido.respuesta.status, 400);
  assert.equal(participanteInexistente.respuesta.status, 404);
  assert.equal(eliminarConfirmada.respuesta.status, 409);
});


test("dos solicitudes simultáneas no ocupan el mismo último cupo", async (contexto) => {
  const { baseUrl } = await prepararAplicacion(contexto);
  const resultados = await Promise.all([
    solicitar(baseUrl, "POST", { eventoId: 1, participanteId: 1 }),
    solicitar(baseUrl, "POST", { eventoId: 1, participanteId: 2 })
  ]);
  const estados = resultados.map((resultado) => resultado.respuesta.status).sort();

  assert.deepEqual(estados, [201, 409]);
});

test("rechaza IDs de referencia enviados como texto", async (contexto) => {
  const { baseUrl } = await prepararAplicacion(contexto);
  const resultado = await solicitar(baseUrl, "POST", { eventoId: "1", participanteId: 1 });

  assert.equal(resultado.respuesta.status, 400);
});


test("rechaza una solicitud de modificación desde un origen distinto al frontend", async (contexto) => {
  const { baseUrl } = await prepararAplicacion(contexto);
  const respuesta = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://sitio-no-autorizado.example"
    },
    body: JSON.stringify({ eventoId: 1, participanteId: 1 })
  });

  assert.equal(respuesta.status, 403);
});

test("no permite cancelar una inscripción cuando el evento ya comenzó", async (contexto) => {
  const { baseUrl, almacen } = await prepararAplicacion(contexto);
  const registro = await solicitar(baseUrl, "POST", { eventoId: 1, participanteId: 1 });

  await almacen.transaccion((datos) => {
    datos.eventos[0].inicio = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  });

  const cancelacion = await solicitar(`${baseUrl}/${registro.contenido.id}`, "PATCH", { estado: "CANCELADA" });

  assert.equal(cancelacion.respuesta.status, 409);
  assert.match(cancelacion.contenido.mensaje, /ya comenzó/i);
});

test("no permite reactivar una inscripción cancelada si otro participante ocupó el cupo", async (contexto) => {
  const { baseUrl } = await prepararAplicacion(contexto);
  const primera = await solicitar(baseUrl, "POST", { eventoId: 1, participanteId: 1 });

  await solicitar(`${baseUrl}/${primera.contenido.id}`, "PATCH", { estado: "CANCELADA" });
  const segunda = await solicitar(baseUrl, "POST", { eventoId: 1, participanteId: 2 });
  const reactivacion = await solicitar(`${baseUrl}/${primera.contenido.id}`, "PATCH", { estado: "CONFIRMADA" });

  assert.equal(segunda.respuesta.status, 201);
  assert.equal(reactivacion.respuesta.status, 409);
});
