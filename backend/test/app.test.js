const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { crearApp } = require("../src/app");
const { requiereAdministrador } = require("../src/comun/acceso-administrativo");
const { crearAlmacen } = require("../src/comun/almacen");

const prepararAplicacion = async (contexto) => {
  const directorio = await fs.mkdtemp(path.join(os.tmpdir(), "eventify-app-"));
  const almacen = crearAlmacen({
    rutaDatos: path.join(directorio, "eventify.json"),
    rutaSemilla: path.resolve(__dirname, "../src/datos/data.json")
  });
  const app = crearApp({
    almacen,
    usuarioAdmin: "admin@eventify.test",
    contrasenaAdmin: "contraseña-de-prueba",
    secretoSesion: "secreto-de-prueba-con-longitud-suficiente"
  });
  const servidor = app.listen(0);

  await new Promise((resolver) => servidor.once("listening", resolver));
  contexto.after(async () => {
    await new Promise((resolver, rechazar) => {
      servidor.close((error) => error ? rechazar(error) : resolver());
    });
    await fs.rm(directorio, { recursive: true, force: true });
  });

  return { base: `http://127.0.0.1:${servidor.address().port}/api` };
};

const encabezadosOrigen = { Origin: "http://localhost:4200" };

test("responde al estado y devuelve JSON para rutas inexistentes", async (contexto) => {
  const { base } = await prepararAplicacion(contexto);
  const respuestaEstado = await fetch(`${base}/estado`);

  assert.equal(respuestaEstado.status, 200);
  assert.deepEqual(await respuestaEstado.json(), { estado: "ok" });
  assert.equal(respuestaEstado.headers.get("access-control-allow-credentials"), "true");

  const respuestaInexistente = await fetch(`${base}/ruta-inexistente`);

  assert.equal(respuestaInexistente.status, 404);
  assert.deepEqual(await respuestaInexistente.json(), { mensaje: "Ruta no encontrada." });
});

test("administra el inicio, las consultas protegidas y el cierre de sesión", async (contexto) => {
  const { base } = await prepararAplicacion(contexto);
  const sesionInactiva = await fetch(`${base}/sesion`);
  const eventoSinSesion = await fetch(`${base}/eventos`);
  const participanteSinSesion = await fetch(`${base}/participantes`);
  const inscripcionesSinSesion = await fetch(`${base}/inscripciones`);

  assert.equal(sesionInactiva.status, 401);
  assert.equal(eventoSinSesion.status, 401);
  assert.equal(participanteSinSesion.status, 401);
  assert.equal(inscripcionesSinSesion.status, 401);

  const credencialesInvalidas = await fetch(`${base}/sesion`, {
    method: "POST",
    headers: { ...encabezadosOrigen, "Content-Type": "application/json" },
    body: JSON.stringify({ usuario: "admin@eventify.test", contrasena: "incorrecta" })
  });

  assert.equal(credencialesInvalidas.status, 401);
  assert.deepEqual(await credencialesInvalidas.json(), {
    mensaje: "El usuario o la contraseña son incorrectos."
  });

  const inicioSesion = await fetch(`${base}/sesion`, {
    method: "POST",
    headers: { ...encabezadosOrigen, "Content-Type": "application/json" },
    body: JSON.stringify({
      usuario: "admin@eventify.test",
      contrasena: "contraseña-de-prueba"
    })
  });
  const cookie = inicioSesion.headers.get("set-cookie").match(/eventify\.sid=[^;]+/)[0];

  assert.equal(inicioSesion.status, 200);
  assert.deepEqual(await inicioSesion.json(), {
    usuario: "admin@eventify.test",
    rol: "ADMIN"
  });

  const sesionActiva = await fetch(`${base}/sesion`, { headers: { Cookie: cookie } });
  const respuestaEventos = await fetch(`${base}/eventos`, { headers: { Cookie: cookie } });
  const respuestaParticipantes = await fetch(`${base}/participantes`, { headers: { Cookie: cookie } });

  assert.equal(sesionActiva.status, 200);
  assert.deepEqual(await sesionActiva.json(), {
    usuario: "admin@eventify.test",
    rol: "ADMIN"
  });
  assert.equal(respuestaEventos.status, 200);
  assert.equal(respuestaParticipantes.status, 200);

  const eventos = await respuestaEventos.json();
  const participantes = await respuestaParticipantes.json();

  assert.equal(eventos.length, 3);
  assert.equal(eventos[0].inscripcionesConfirmadas, 0);
  assert.equal(eventos[0].cuposDisponibles, 1);
  assert.equal(participantes.length, 3);

  const cierreSesion = await fetch(`${base}/sesion`, {
    method: "DELETE",
    headers: { ...encabezadosOrigen, Cookie: cookie }
  });
  const sesionTrasCierre = await fetch(`${base}/sesion`, { headers: { Cookie: cookie } });

  assert.equal(cierreSesion.status, 204);
  assert.equal(sesionTrasCierre.status, 401);
});

test("rechaza el inicio y cierre de sesión desde otros orígenes", async (contexto) => {
  const { base } = await prepararAplicacion(contexto);
  const inicioNoAutorizado = await fetch(`${base}/sesion`, {
    method: "POST",
    headers: { Origin: "https://origen-no-autorizado.example", "Content-Type": "application/json" },
    body: JSON.stringify({ usuario: "admin@eventify.test", contrasena: "contraseña-de-prueba" })
  });
  const cierreNoAutorizado = await fetch(`${base}/sesion`, {
    method: "DELETE",
    headers: { Origin: "https://origen-no-autorizado.example" }
  });

  assert.equal(inicioNoAutorizado.status, 403);
  assert.equal(cierreNoAutorizado.status, 403);
});

test("limita los intentos fallidos de inicio de sesión por dirección de origen", async (contexto) => {
  const { base } = await prepararAplicacion(contexto);
  let ultimaRespuesta;

  for (let intento = 0; intento < 6; intento += 1) {
    ultimaRespuesta = await fetch(`${base}/sesion`, {
      method: "POST",
      headers: { ...encabezadosOrigen, "Content-Type": "application/json" },
      body: JSON.stringify({ usuario: "admin@eventify.test", contrasena: "incorrecta" })
    });
  }

  assert.equal(ultimaRespuesta.status, 429);
});

test("distingue la ausencia de sesión del rol insuficiente", async (contexto) => {
  const aplicacion = require("express")();

  aplicacion.use((solicitud, respuesta, siguiente) => {
    solicitud.session = { usuario: "usuario@example.com", rol: "USUARIO" };
    siguiente();
  });
  aplicacion.get("/recurso", requiereAdministrador, (solicitud, respuesta) => {
    respuesta.status(200).end();
  });

  const servidor = aplicacion.listen(0);
  contexto.after(() => servidor.close());
  await new Promise((resolver) => servidor.once("listening", resolver));

  const respuesta = await fetch(`http://127.0.0.1:${servidor.address().port}/recurso`);

  assert.equal(respuesta.status, 403);
  assert.deepEqual(await respuesta.json(), {
    mensaje: "No tienes permisos para acceder a este recurso."
  });
});
