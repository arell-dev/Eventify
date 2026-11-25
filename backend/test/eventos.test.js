const test = require("node:test");
const assert = require("node:assert/strict");
const { crearAlmacen } = require("../src/comun/almacen");
const app = require("../src/app");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

test("Eventos respeta relaciones, horarios, cupos y acceso público", async (contexto) => {
  const directorio = await fs.mkdtemp(path.join(os.tmpdir(), "eventify-eventos-"));
  const rutaDatos = path.join(directorio, "datos.json");
  const almacen = crearAlmacen({ rutaDatos });
  const datosIniciales = await almacen.leer();
  const perfilPonenteInicial = datosIniciales.ponentes.find((ponente) => ponente.id === 1);
  const usuarioPonenteInicial = datosIniciales.usuarios.find((usuario) => usuario.id === perfilPonenteInicial.usuarioId);
  const participanteInicial = datosIniciales.participantes.find((participante) => participante.id === 1);
  const aplicacion = app.crearApp({
    almacen,
    requiereAdministrador: (solicitud, respuesta, siguiente) => siguiente()
  });
  const servidor = aplicacion.listen(0);

  contexto.after(async () => {
    await new Promise((resolver) => servidor.close(resolver));
    await fs.rm(directorio, { recursive: true, force: true });
  });

  const base = `http://127.0.0.1:${servidor.address().port}/api`;
  const cabeceras = { "Content-Type": "application/json", Origin: "http://localhost:4200" };
  const entrada = {
    titulo: "Nuevo taller",
    descripcion: "Contenido",
    tipo: "TALLER",
    modalidad: "VIRTUAL",
    lugar: "",
    enlace: "https://example.com",
    inicio: "2028-01-01T15:00:00.000Z",
    fin: "2028-01-01T16:00:00.000Z",
    cupo: 1,
    ponenteId: 1
  };
  const crear = (evento) => fetch(`${base}/eventos`, {
    method: "POST",
    headers: cabeceras,
    body: JSON.stringify(evento)
  });

  const creado = await crear(entrada);
  assert.equal(creado.status, 201);
  const evento = await creado.json();
  assert.equal(evento.cuposDisponibles, 1);
  assert.equal((await crear(entrada)).status, 409);
  assert.equal((await crear({ ...entrada, inicio: entrada.fin, fin: "2028-01-01T17:00:00.000Z" })).status, 201);
  assert.equal((await crear({ ...entrada, ponenteId: 999 })).status, 404);
  const inscripcion = await fetch(`${base}/inscripciones`, {
    method: "POST",
    headers: cabeceras,
    body: JSON.stringify({ eventoId: evento.id, participanteId: 1 })
  });
  assert.equal(inscripcion.status, 201);
  const detalle = await (await fetch(`${base}/eventos/${evento.id}`)).json();
  assert.equal(detalle.cuposDisponibles, 0);
  assert.equal((await fetch(`${base}/eventos/${evento.id}`, { method: "DELETE", headers: cabeceras })).status, 409);
  const publico = await (await fetch(`${base}/publico/eventos/${evento.id}`)).json();
  assert.equal(publico.nombrePonente, usuarioPonenteInicial.nombre);
  assert.equal(publico.cuposDisponibles, 0);
  assert.equal(Object.hasOwn(publico, "correo"), false);
  const vinculos = await (await fetch(`${base}/eventos/${evento.id}/inscripciones`)).json();
  assert.equal(vinculos[0].participanteCarrera, participanteInicial.carrera);
  const solicitudSinOrigen = await fetch(`${base}/eventos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entrada)
  });

  assert.equal(solicitudSinOrigen.status, 403);
});
