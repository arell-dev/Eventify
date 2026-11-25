const app = require("./app");
const { almacen } = require("./comun/almacen");

const puerto = 3000;

// El almacén inicializa las cuentas locales antes de atender solicitudes.
almacen.leer().then(() => {
  app.listen(puerto, () => {
    console.log(`API disponible en http://localhost:${puerto}`);
  });
}).catch((error) => {
  console.error(`No se pudo preparar el almacén: ${error.message}`);
  process.exitCode = 1;
});
