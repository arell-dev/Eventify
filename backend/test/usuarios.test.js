const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { crearAlmacen } = require("../src/comun/almacen");
const app = require("../src/app");

test("roles, identidad y reserva de cupo comparten el almacén", async (contexto) => {
  const directorio = await fs.mkdtemp(path.join(os.tmpdir(), "eventify-usuarios-"));
  const rutaDatos = path.join(directorio, "datos.json");
  const almacen = crearAlmacen({ rutaDatos });
  const servidor = app.crearApp({ almacen }).listen(0);

  contexto.after(async () => {
    await new Promise((resolver) => servidor.close(resolver));
    await fs.rm(directorio, { recursive: true, force: true });
  });

  const base = `http://127.0.0.1:${servidor.address().port}/api`;
  const cabeceras = { "Content-Type": "application/json", Origin: "http://localhost:4200" };
  const iniciar = async (usuario, contrasena) => {
    const respuesta = await fetch(`${base}/sesion`, {
      method: "POST",
      headers: cabeceras,
      body: JSON.stringify({ usuario, contrasena })
    });

    assert.equal(respuesta.status, 200);
    return { sesion: await respuesta.json(), cookie: respuesta.headers.get("set-cookie").split(";")[0] };
  };

  const admin = await iniciar("c25170@utp.edu.pe", "@Linux22");
  assert.equal(admin.sesion.rol, "ADMIN");
  const usuario = await iniciar("maria.lopez@utp.edu.pe", "Eventify2026!");
  assert.equal(usuario.sesion.rol, "USUARIO");
  const adminHeaders = { ...cabeceras, Cookie: admin.cookie };
  assert.equal((await fetch(`${base}/eventos`, { headers: { Cookie: usuario.cookie } })).status, 403);
  assert.equal((await fetch(`${base}/publico/eventos/1/mi-inscripcion`, { headers: adminHeaders })).status, 403);
  const alta = await fetch(`${base}/usuarios`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      nombre: "Ponente",
      correo: "nuevo@example.com",
      carrera: "Sistemas",
      especialidad: "Software",
      contrasena: "clave-larga"
    })
  });
  assert.equal(alta.status, 201);
  const perfil = await alta.json();
  assert.equal(Object.hasOwn(perfil, "contrasenaHash"), false);
  const altaPonente = await fetch(`${base}/ponentes`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ usuarioId: perfil.id })
  });
  const ponente = await altaPonente.json();
  assert.equal(altaPonente.status, 201);
  const crearEvento = await fetch(`${base}/eventos`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      titulo: "Evento",
      descripcion: "Contenido",
      tipo: "TALLER",
      modalidad: "PRESENCIAL",
      lugar: "UTP",
      enlace: "",
      inicio: new Date(Date.now() + 86400000).toISOString(),
      fin: new Date(Date.now() + 90000000).toISOString(),
      cupo: 1,
      ponenteId: ponente.id
    })
  });
  assert.equal(crearEvento.status, 201);
  const evento = await crearEvento.json();
  const cuentaPonente = await iniciar("nuevo@example.com", "clave-larga");
  const avisos = await fetch(`${base}/notificaciones`, { headers: { Cookie: cuentaPonente.cookie } });
  assert.equal((await avisos.json()).length, 1);
  const inscribir = (cookie) => fetch(`${base}/publico/eventos/${evento.id}/mi-inscripcion`, {
    method: "POST",
    headers: { ...cabeceras, Cookie: cookie },
    body: "{}"
  });
  const respuestas = await Promise.all([inscribir(usuario.cookie), inscribir(cuentaPonente.cookie)]);
  assert.deepEqual(respuestas.map((item) => item.status).sort(), [201, 409]);
  const cookies = [usuario.cookie, cuentaPonente.cookie];
  const consultas = await Promise.all(cookies.map((cookie) => {
    return fetch(`${base}/publico/eventos/${evento.id}/mi-inscripcion`, { headers: { Cookie: cookie } });
  }));
  const inscripcionesPropias = await Promise.all(consultas.map((respuesta) => respuesta.json()));
  const ganador = respuestas.findIndex((respuesta) => respuesta.status === 201);
  const perdedor = respuestas.findIndex((respuesta) => respuesta.status === 409);

  assert.equal(inscripcionesPropias[ganador].estado, "CONFIRMADA");
  assert.equal(inscripcionesPropias[perdedor], null);
  const datos = await almacen.leer();
  assert.equal(datos.inscripciones.filter((item) => item.eventoId === evento.id).length, 1);
  const usuarioPerdedor = perdedor === 0 ? usuario.sesion.perfil.id : cuentaPonente.sesion.perfil.id;
  const perfilExistente = datos.participantes.some((participante) => participante.usuarioId === usuarioPerdedor);
  assert.equal(perfilExistente, perdedor === 0);
  const reabierto = crearAlmacen({ rutaDatos });
  const datosReabiertos = await reabierto.leer();
  assert.equal(datosReabiertos.usuarios.find((item) => item.id === perfil.id).correo, "nuevo@example.com");
  assert.equal(datosReabiertos.inscripciones.filter((item) => item.eventoId === evento.id && item.estado === "CONFIRMADA").length, 1);
});
