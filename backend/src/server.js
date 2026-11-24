const app = require("./app");

const puerto = 3000;
const variablesRequeridas = ["ADMIN_USUARIO", "ADMIN_CONTRASENA", "SESSION_SECRET"];
const variablesFaltantes = variablesRequeridas.filter((nombre) => {
  return !process.env[nombre] || process.env[nombre].trim().length === 0;
});

if (variablesFaltantes.length > 0) {
  console.error(`Faltan variables requeridas: ${variablesFaltantes.join(", ")}.`);
  process.exitCode = 1;
} else {
  app.listen(puerto, () => {
    console.log(`API disponible en http://localhost:${puerto}`);
  });
}
