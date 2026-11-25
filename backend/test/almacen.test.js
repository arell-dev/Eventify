const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { crearAlmacen } = require("../src/comun/almacen");
const { comprobarContrasena } = require("../src/comun/usuarios");
const usuariosIniciales = require("../src/datos/datos-iniciales/usuarios.json");

test("conserva el archivo original cuando una relación es inválida", async (contexto) => {
  const directorio = await fs.mkdtemp(path.join(os.tmpdir(), "eventify-invalido-"));
  const rutaDatos = path.join(directorio, "eventify.json");
  const almacenInicial = crearAlmacen({ rutaDatos });
  const datos = await almacenInicial.leer();
  datos.eventos[0].ponenteId = 999;
  const contenidoOriginal = JSON.stringify(datos);
  await fs.writeFile(rutaDatos, contenidoOriginal);

  contexto.after(async () => {
    await fs.rm(directorio, { recursive: true, force: true });
  });

  const almacen = crearAlmacen({ rutaDatos });

  await assert.rejects(almacen.leer(), /Ponente inexistente en eventos/);
  assert.equal(await fs.readFile(rutaDatos, "utf8"), contenidoOriginal);
});

test("reúne las semillas por colección al crear el archivo de trabajo", async (contexto) => {
  const directorio = await fs.mkdtemp(path.join(os.tmpdir(), "eventify-semillas-"));
  const rutaDatos = path.join(directorio, "eventify.json");
  const almacen = crearAlmacen({ rutaDatos });

  contexto.after(async () => {
    await fs.rm(directorio, { recursive: true, force: true });
  });

  const datos = await almacen.leer();
  const administradores = datos.usuarios.filter((usuario) => usuario.rol === "ADMIN");

  assert.equal(administradores.length, 1);
  assert.equal(datos.usuarios.length, usuariosIniciales.length);
  assert.equal(datos.usuarios.find((usuario) => usuario.id === 1).rol, "ADMIN");
  assert.ok(datos.usuarios.filter((usuario) => usuario.id !== 1).every((usuario) => usuario.rol === "USUARIO"));

  assert.deepEqual(datos.participantes.map((participante) => participante.usuarioId).sort((a, b) => a - b), [2, 3, 4]);
  assert.deepEqual(datos.ponentes.map((ponente) => ponente.usuarioId).sort((a, b) => a - b), [7, 8]);

  for (const cuentaInicial of usuariosIniciales) {
    const cuenta = datos.usuarios.find((elemento) => elemento.id === cuentaInicial.id);

    assert.equal(Object.hasOwn(cuenta, "contrasena"), false);
    assert.equal(Object.hasOwn(cuenta, "contrasenaHash"), Object.hasOwn(cuentaInicial, "contrasena"));
  }

  const cuentaDosInicial = usuariosIniciales.find((usuario) => usuario.id === 2);
  const cuentaTresInicial = usuariosIniciales.find((usuario) => usuario.id === 3);
  const cuentaSieteInicial = usuariosIniciales.find((usuario) => usuario.id === 7);
  const usuario = datos.usuarios.find((item) => item.id === cuentaDosInicial.id);
  const otroUsuario = datos.usuarios.find((item) => item.id === cuentaTresInicial.id);
  const usuarioPonente = datos.usuarios.find((item) => item.id === cuentaSieteInicial.id);

  assert.equal(comprobarContrasena(cuentaDosInicial.contrasena, usuario.contrasenaHash), true);
  assert.equal(comprobarContrasena("contraseña incorrecta", usuario.contrasenaHash), false);
  assert.notEqual(usuario.contrasenaHash, otroUsuario.contrasenaHash);
  assert.equal(comprobarContrasena(cuentaSieteInicial.contrasena, usuarioPonente.contrasenaHash), true);

  for (const perfil of [...datos.ponentes, ...datos.participantes]) {
    const cuenta = datos.usuarios.find((usuario) => usuario.id === perfil.usuarioId);

    assert.equal(perfil.nombre, cuenta.nombre);
    assert.equal(perfil.correo.toLowerCase(), cuenta.correo.toLowerCase());
  }

  assert.ok(datos.ponentes.every((ponente) => datos.usuarios.some((usuario) => usuario.id === ponente.usuarioId)));
  assert.ok(datos.participantes.every((participante) => datos.usuarios.some((usuario) => usuario.id === participante.usuarioId)));
  assert.ok(datos.eventos.every((evento) => datos.ponentes.some((ponente) => ponente.id === evento.ponenteId)));
  assert.deepEqual(JSON.parse(await fs.readFile(rutaDatos, "utf8")), datos);
});

test("inicializa una sola semilla para varias lecturas simultáneas", async (contexto) => {
  const directorio = await fs.mkdtemp(path.join(os.tmpdir(), "eventify-almacen-"));
  const rutaDatos = path.join(directorio, "eventify.json");
  const almacen = crearAlmacen({ rutaDatos });

  contexto.after(async () => {
    await fs.rm(directorio, { recursive: true, force: true });
  });

  const lecturas = await Promise.all(Array.from({ length: 20 }, () => almacen.leer()));
  const ids = await almacen.transaccion((datos) => {
    datos.siguientesIds.inscripciones = 2;

    return datos.siguientesIds.inscripciones;
  });
  const lecturaPosterior = await almacen.leer();

  assert.ok(lecturas.every((lectura) => lectura.eventos.length === lecturas[0].eventos.length));
  assert.equal(ids, 2);
  assert.equal(lecturaPosterior.siguientesIds.inscripciones, 2);
});
