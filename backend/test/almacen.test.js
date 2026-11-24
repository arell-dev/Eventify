const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { crearAlmacen } = require("../src/comun/almacen");

test("inicializa una sola semilla para varias lecturas simultáneas", async (contexto) => {
  const directorio = await fs.mkdtemp(path.join(os.tmpdir(), "eventify-almacen-"));
  const rutaDatos = path.join(directorio, "eventify.json");
  const rutaSemilla = path.resolve(__dirname, "../src/datos/data.json");
  const almacen = crearAlmacen({ rutaDatos, rutaSemilla });

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
