const test = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { crearApp } = require("../src/app");
const { crearAlmacen } = require("../src/comun/almacen");

const origen = "http://localhost:4200";
const contrasena = "pruebas-eventify";
const cuentaAdmin = { id: 1, nombre: "Admin", correo: "admin@example.test", rol: "ADMIN", contrasena };
const cuentaMixta = {
  id: 2, nombre: "Usuario combinado", correo: "mixto@example.test", carrera: "Sistemas",
  especialidad: "Datos", rol: "USUARIO", contrasena
};
const cuentaPonente = {
  id: 3, nombre: "Ponente de prueba", correo: "ponente@example.test", carrera: "",
  especialidad: "Investigación", rol: "USUARIO"
};
const cuentaSinCredencial = {
  id: 4, nombre: "Especialista disponible", correo: "especialista@example.test", carrera: "",
  especialidad: "Seguridad", rol: "USUARIO"
};

// Cada escenario usa una sesión real y un archivo de trabajo temporal.
const crearEntorno = async (contexto) => {
  const directorio = await fs.mkdtemp(path.join(os.tmpdir(), "eventify-perfiles-"));
  const rutaDatos = path.join(directorio, "eventify.json");
  const inicioEvento = Date.now() + 86_400_000;
  const datos = {
    usuarios: [cuentaAdmin, cuentaMixta, cuentaPonente, cuentaSinCredencial],
    participantes: [],
    ponentes: [{ id: 1, usuarioId: 3, nombre: cuentaPonente.nombre, correo: cuentaPonente.correo, especialidad: cuentaPonente.especialidad }],
    eventos: [{
      id: 1, titulo: "Taller de prueba", descripcion: "Datos de prueba", tipo: "TALLER",
      modalidad: "VIRTUAL", lugar: "", enlace: "https://example.test", ponenteId: 1, cupo: 4,
      inicio: new Date(inicioEvento).toISOString(), fin: new Date(inicioEvento + 3_600_000).toISOString()
    }],
    inscripciones: [],
    notificaciones: []
  };

  await fs.writeFile(rutaDatos, JSON.stringify(datos), "utf8");

  const servidor = crearApp({ almacen: crearAlmacen({ rutaDatos }) }).listen(0, "127.0.0.1");

  contexto.after(async () => {
    await new Promise((resolver) => servidor.close(resolver));
    await fs.rm(directorio, { recursive: true, force: true });
  });

  await once(servidor, "listening");

  const base = `http://127.0.0.1:${servidor.address().port}/api`;
  const pedir = (ruta, { metodo = "GET", cuerpo, cookie, origenSolicitud = origen } = {}) => {
    const headers = { Origin: origenSolicitud };

    if (cookie) {
      headers.Cookie = cookie;
    }

    if (cuerpo !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    return fetch(`${base}${ruta}`, { method: metodo, headers, body: JSON.stringify(cuerpo) });
  };

  const iniciar = async (cuenta) => {
    const respuesta = await pedir("/sesion", { metodo: "POST", cuerpo: { usuario: cuenta.correo, contrasena } });

    assert.equal(respuesta.status, 200);

    return respuesta.headers.get("set-cookie").split(";")[0];
  };

  const cookie = await iniciar(cuentaAdmin);
  const admin = (ruta, opciones = {}) => pedir(ruta, { cookie, ...opciones });

  return { admin, pedir, iniciar, rutaDatos };
};

test("mantiene el padrón compartido y protege las rutas de ambos perfiles", async (contexto) => {
  const { admin, pedir, iniciar } = await crearEntorno(contexto);
  const cookie = await iniciar(cuentaMixta);
  const rutas = ["/participantes/usuarios-disponibles", "/participantes/1/inscripciones", "/ponentes/1/eventos"];

  for (const ruta of rutas) {
    assert.equal((await pedir(ruta)).status, 401);
    assert.equal((await pedir(ruta, { cookie })).status, 403);
  }

  const cuentas = await (await admin("/usuarios")).json();
  assert.deepEqual(cuentas.map((cuenta) => cuenta.id), [1, 2, 3, 4]);
  assert.ok(cuentas.every((cuenta) => !Object.hasOwn(cuenta, "contrasenaHash") && !Object.hasOwn(cuenta, "contrasena")));

  const opcionParticipante = await (await admin("/participantes/usuarios-disponibles")).json();
  const padronParticipante = await (await admin("/usuarios?rol=participante")).json();
  assert.deepEqual(opcionParticipante, padronParticipante);
  assert.deepEqual(padronParticipante.map((cuenta) => cuenta.id), [2]);
  const padronPonente = await (await admin("/usuarios?rol=ponente")).json();
  assert.deepEqual(padronPonente.map((cuenta) => cuenta.id), [2, 4]);
  assert.equal((await admin("/usuarios?rol=inexistente")).status, 400);

  const accesoSinCredencial = await pedir("/sesion", {
    metodo: "POST", cuerpo: { usuario: cuentaSinCredencial.correo, contrasena }
  });
  assert.equal(accesoSinCredencial.status, 401);

  const altaSinCredencial = await admin("/ponentes", { metodo: "POST", cuerpo: { usuarioId: 4 } });
  assert.equal(altaSinCredencial.status, 201);
  assert.equal((await altaSinCredencial.json()).usuarioId, 4);

  const cambioSinOrigen = { metodo: "DELETE", origenSolicitud: "http://example.test" };
  assert.equal((await admin("/ponentes/1", cambioSinOrigen)).status, 403);
  assert.equal((await admin("/participantes/1", cambioSinOrigen)).status, 403);
});

test("registra al participante una vez y bloquea la baja hasta eliminar su inscripción cancelada", async (contexto) => {
  const { admin, rutaDatos } = await crearEntorno(contexto);
  const registrar = (usuarioId) => admin("/participantes", { metodo: "POST", cuerpo: { usuarioId } });
  const inicial = await Promise.all([registrar(2), registrar(2)]);

  assert.deepEqual(inicial.map((respuesta) => respuesta.status).sort(), [201, 409]);

  const participante = await inicial.find((respuesta) => respuesta.status === 201).json();
  const ruta = `/participantes/${participante.id}`;

  assert.equal(participante.usuarioId, 2);
  assert.deepEqual(await (await admin(ruta)).json(), participante);
  assert.deepEqual(await (await admin(`${ruta}/inscripciones`)).json(), []);
  assert.equal((await admin("/participantes/01")).status, 400);
  assert.equal((await registrar("2")).status, 400);
  assert.equal((await registrar(3)).status, 400);
  assert.equal((await registrar(99)).status, 404);

  const alta = await admin("/inscripciones", { metodo: "POST", cuerpo: { eventoId: 1, participanteId: participante.id } });
  assert.equal(alta.status, 201);

  const inscripcion = await alta.json();
  const historial = await (await admin(`${ruta}/inscripciones`)).json();
  assert.deepEqual(historial, [inscripcion]);
  assert.equal(historial[0].eventoTitulo, "Taller de prueba");
  assert.equal(historial[0].cuposDisponibles, 3);
  assert.equal(historial[0].participanteId, participante.id);
  assert.equal((await admin(ruta, { metodo: "DELETE" })).status, 409);

  const rutaInscripcion = `/inscripciones/${inscripcion.id}`;
  assert.equal((await admin(rutaInscripcion, { metodo: "PATCH", cuerpo: { estado: "CANCELADA" } })).status, 200);

  const bajaBloqueada = await admin(ruta, { metodo: "DELETE" });
  assert.equal(bajaBloqueada.status, 409);
  assert.match((await bajaBloqueada.json()).mensaje, new RegExp(`relacionadas: ${inscripcion.id}\\.`));
  assert.equal((await (await admin(`${ruta}/inscripciones`)).json())[0].cuposDisponibles, 4);

  assert.equal((await admin(rutaInscripcion, { metodo: "DELETE" })).status, 200);
  assert.deepEqual(await (await admin(ruta, { metodo: "DELETE" })).json(), participante);
  assert.equal((await admin(`${ruta}/inscripciones`)).status, 404);

  const disponibles = await (await admin("/participantes/usuarios-disponibles")).json();
  assert.deepEqual(disponibles.map((cuenta) => cuenta.id), [2]);

  const siguiente = await registrar(2);
  assert.equal(siguiente.status, 201);
  assert.equal((await siguiente.json()).id, participante.id + 1);

  const datosReabiertos = await crearAlmacen({ rutaDatos }).leer();
  assert.deepEqual(datosReabiertos.participantes.map((perfil) => perfil.id), [participante.id + 1]);
  assert.deepEqual(datosReabiertos.inscripciones, []);
});

test("edita el ponente sin cambiar su identidad y mantiene su agenda vinculada a Eventos", async (contexto) => {
  const { admin, rutaDatos } = await crearEntorno(contexto);
  const registrar = (usuarioId) => admin("/ponentes", { metodo: "POST", cuerpo: { usuarioId } });
  const editar = (id, cuerpo) => admin(`/ponentes/${id}`, { metodo: "PUT", cuerpo });

  const original = await (await admin("/ponentes/1")).json();
  const agenda = await (await admin("/ponentes/1/eventos")).json();
  assert.deepEqual(agenda, [await (await admin("/eventos/1")).json()]);
  assert.equal(agenda[0].ponenteId, original.id);
  assert.equal(agenda[0].cuposDisponibles, 4);
  assert.equal((await admin("/ponentes/99/eventos")).status, 404);
  assert.equal((await admin("/ponentes/1e0")).status, 400);

  const bloqueada = await admin("/ponentes/1", { metodo: "DELETE" });
  assert.equal(bloqueada.status, 409);
  assert.match((await bloqueada.json()).mensaje, /Taller de prueba/);

  const cuerpo = { nombre: " Ponente actualizado ", especialidad: " Sistemas ", correo: " MIXTO@EXAMPLE.TEST " };
  const cambio = await editar(1, cuerpo);
  assert.equal(cambio.status, 200);
  assert.deepEqual(await cambio.json(), {
    id: 1, usuarioId: 3, nombre: "Ponente actualizado", especialidad: "Sistemas", correo: "MIXTO@EXAMPLE.TEST"
  });
  assert.equal((await editar(1, { ...cuerpo, correo: "incorrecto" })).status, 400);
  assert.equal((await editar(1, { ...cuerpo, usuarioId: 2 })).status, 400);
  assert.equal((await registrar(2)).status, 409);
  const disponibles = await (await admin("/usuarios?rol=ponente")).json();
  assert.deepEqual(disponibles.map((cuenta) => cuenta.id), [4]);

  assert.equal((await editar(1, { ...cuerpo, correo: original.correo })).status, 200);

  const alta = await registrar(2);
  assert.equal(alta.status, 201);

  const ponente = await alta.json();
  assert.equal(ponente.usuarioId, 2);
  assert.equal((await registrar(2)).status, 409);
  assert.equal((await editar(ponente.id, { ...cuerpo, correo: original.correo.toUpperCase() })).status, 409);
  assert.deepEqual(await (await admin(`/ponentes/${ponente.id}/eventos`)).json(), []);
  assert.deepEqual(await (await admin(`/ponentes/${ponente.id}`, { metodo: "DELETE" })).json(), ponente);

  const reabierto = await crearAlmacen({ rutaDatos }).leer();
  assert.equal(reabierto.ponentes[0].usuarioId, original.usuarioId);
  assert.equal(reabierto.usuarios.find((usuario) => usuario.id === original.usuarioId).correo, original.correo);
  assert.equal(reabierto.siguientesIds.ponentes, ponente.id + 1);
});
