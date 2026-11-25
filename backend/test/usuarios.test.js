const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { crearAlmacen } = require("../src/comun/almacen");
const app = require("../src/app");
const usuariosIniciales = require("../src/datos/datos-iniciales/usuarios.json");

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
  const usuarioInicial = usuariosIniciales.find((elemento) => elemento.id === 2);
  const usuarioPonenteInicial = usuariosIniciales.find((elemento) => elemento.id === 7);
  const usuario = await iniciar(usuarioInicial.correo, usuarioInicial.contrasena);
  assert.equal(usuario.sesion.rol, "USUARIO");
  const usuarioPonente = await iniciar(usuarioPonenteInicial.correo, usuarioPonenteInicial.contrasena);
  assert.equal(usuarioPonente.sesion.rol, "USUARIO");
  assert.equal(usuarioPonente.sesion.perfil.id, usuarioPonenteInicial.id);
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

  const rutaInscripcionPropia = `${base}/publico/eventos/${evento.id}/mi-inscripcion`;
  const consultarInscripcion = (cookie) => fetch(rutaInscripcionPropia, { headers: { Cookie: cookie } });
  const inscribir = (cookie) => fetch(rutaInscripcionPropia, {
    method: "POST",
    headers: { ...cabeceras, Cookie: cookie },
    body: "{}"
  });
  const comprobarConflictoPonente = async (respuesta) => {
    assert.equal(respuesta.status, 409);
    assert.deepEqual(await respuesta.json(), {
      codigo: "PONENTE_ASIGNADO",
      mensaje: "Eres el ponente de este evento. Tu participación ya está asignada."
    });
  };

  const antesDelRechazo = await fs.readFile(rutaDatos, "utf8");
  await comprobarConflictoPonente(await consultarInscripcion(cuentaPonente.cookie));
  await comprobarConflictoPonente(await inscribir(cuentaPonente.cookie));
  assert.equal(await fs.readFile(rutaDatos, "utf8"), antesDelRechazo);

  // La inscripción administrativa existente se conserva cuando el ponente intenta reactivarla.
  const altaParticipante = await fetch(`${base}/participantes`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ usuarioId: perfil.id })
  });
  assert.equal(altaParticipante.status, 201);
  const participante = await altaParticipante.json();
  const altaInscripcion = await fetch(`${base}/inscripciones`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ eventoId: evento.id, participanteId: participante.id })
  });
  assert.equal(altaInscripcion.status, 201);
  const inscripcionAdministrativa = await altaInscripcion.json();
  const cancelacion = await fetch(`${base}/inscripciones/${inscripcionAdministrativa.id}`, {
    method: "PATCH",
    headers: adminHeaders,
    body: JSON.stringify({ estado: "CANCELADA" })
  });
  assert.equal(cancelacion.status, 200);
  const antesDeReactivar = await fs.readFile(rutaDatos, "utf8");
  await comprobarConflictoPonente(await consultarInscripcion(cuentaPonente.cookie));
  await comprobarConflictoPonente(await inscribir(cuentaPonente.cookie));
  assert.equal(await fs.readFile(rutaDatos, "utf8"), antesDeReactivar);

  const cookies = [usuario.cookie, usuarioPonente.cookie];

  for (const cookie of cookies) {
    const consulta = await consultarInscripcion(cookie);
    assert.equal(consulta.status, 200);
    assert.equal(await consulta.json(), null);
  }

  const respuestas = await Promise.all(cookies.map(inscribir));
  assert.deepEqual(respuestas.map((item) => item.status).sort(), [201, 409]);
  const consultas = await Promise.all(cookies.map(consultarInscripcion));
  const inscripcionesPropias = await Promise.all(consultas.map((respuesta) => respuesta.json()));
  const ganador = respuestas.findIndex((respuesta) => respuesta.status === 201);
  const perdedor = respuestas.findIndex((respuesta) => respuesta.status === 409);

  assert.equal(inscripcionesPropias[ganador].estado, "CONFIRMADA");
  assert.equal(inscripcionesPropias[perdedor], null);
  const datos = await almacen.leer();
  const registrosEvento = datos.inscripciones.filter((item) => item.eventoId === evento.id);
  assert.equal(registrosEvento.length, 2);
  assert.equal(registrosEvento.find((item) => item.id === inscripcionAdministrativa.id).estado, "CANCELADA");
  const usuarioPerdedor = perdedor === 0 ? usuario.sesion.perfil.id : usuarioPonente.sesion.perfil.id;
  const perfilExistente = datos.participantes.some((participante) => participante.usuarioId === usuarioPerdedor);
  assert.equal(perfilExistente, perdedor === 0);
  const reabierto = crearAlmacen({ rutaDatos });
  const datosReabiertos = await reabierto.leer();
  assert.equal(datosReabiertos.usuarios.find((item) => item.id === perfil.id).correo, "nuevo@example.com");
  assert.equal(datosReabiertos.inscripciones.filter((item) => item.eventoId === evento.id && item.estado === "CONFIRMADA").length, 1);
});
