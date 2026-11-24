const fs = require("node:fs/promises");
const path = require("node:path");

// Crea un almacén aislable por ruta para compartir datos y facilitar pruebas.
const crearAlmacen = (opciones = {}) => {
  const rutaDatos = opciones.rutaDatos || path.join(__dirname, "../../datos/eventify.json");
  const rutaSemilla = opciones.rutaSemilla || path.join(__dirname, "../datos/data.json");
  let colaOperaciones = Promise.resolve();
  let contadorTemporal = 0;
  let inicializacion;

  // Copia la semilla una sola vez y conserva los datos persistidos en reinicios.
  const inicializar = () => {
    if (!inicializacion) {
      const preparar = async () => {
        await fs.mkdir(path.dirname(rutaDatos), { recursive: true });

        try {
          await fs.access(rutaDatos);
          return;
        } catch (error) {
          if (error.code !== "ENOENT") {
            throw error;
          }
        }

        const semilla = await fs.readFile(rutaSemilla, "utf8");
        const rutaTemporal = `${rutaDatos}.${process.pid}.${contadorTemporal++}.tmp`;

        try {
          await fs.writeFile(rutaTemporal, semilla, "utf8");
          await fs.rename(rutaTemporal, rutaDatos);
        } catch (error) {
          await fs.rm(rutaTemporal, { force: true });
          throw error;
        }
      };

      inicializacion = preparar().catch((error) => {
        inicializacion = undefined;
        throw error;
      });
    }

    return inicializacion;
  };

  // Lee el estado persistido después de asegurar que el archivo exista.
  const leer = async () => {
    await inicializar();
    const contenido = await fs.readFile(rutaDatos, "utf8");

    return JSON.parse(contenido);
  };

  // Serializa escrituras para evitar perder cambios de solicitudes simultáneas.
  const transaccion = async (operacion) => {
    const ejecutar = async () => {
      await inicializar();
      const contenido = await fs.readFile(rutaDatos, "utf8");
      const datos = JSON.parse(contenido);
      const resultado = await operacion(datos);
      const rutaTemporal = `${rutaDatos}.${process.pid}.${contadorTemporal++}.tmp`;

      try {
        await fs.writeFile(rutaTemporal, `${JSON.stringify(datos, null, 2)}\n`, "utf8");
        await fs.rename(rutaTemporal, rutaDatos);
      } catch (error) {
        await fs.rm(rutaTemporal, { force: true });
        throw error;
      }

      return resultado;
    };

    const resultado = colaOperaciones.then(ejecutar);
    colaOperaciones = resultado.catch(() => undefined);

    return resultado;
  };

  return { leer, transaccion };
};

// Comparte el mismo estado persistido entre las rutas del proceso backend.
const almacen = crearAlmacen();

module.exports = { crearAlmacen, almacen };
