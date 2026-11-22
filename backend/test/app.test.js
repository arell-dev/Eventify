const test = require("node:test");
const assert = require("node:assert/strict");
const app = require("../src/app");

test("responde al estado y devuelve JSON para rutas inexistentes", async (contexto) => {
  const servidor = app.listen(0);
  contexto.after(() => servidor.close());

  const direccion = servidor.address();
  const base = `http://127.0.0.1:${direccion.port}`;
  const respuestaEstado = await fetch(`${base}/api/estado`);

  assert.equal(respuestaEstado.status, 200);
  assert.deepEqual(await respuestaEstado.json(), { estado: "ok" });

  const respuestaInexistente = await fetch(`${base}/api/eventos`);

  assert.equal(respuestaInexistente.status, 404);
  assert.deepEqual(await respuestaInexistente.json(), { mensaje: "Ruta no encontrada." });
});
