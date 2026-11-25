const fs = require("node:fs/promises");
const path = require("node:path");
const { inicializarUsuarios } = require("./usuarios");
const { validarIntegridad } = require("./integridad");

// Gestiona el JSON compartido por los módulos y permite aislarlo en pruebas.
const crearAlmacen = (opciones = {}) => {
  const rutaDatos = opciones.rutaDatos || path.join(__dirname, "../datos/eventify.json");
  const rutaAnterior = path.join(__dirname, "../../datos/eventify.json");
  const directorioDatosIniciales = path.join(__dirname, "../datos/datos-iniciales");
  
  let colaOperaciones = Promise.resolve();
  let contadorTemporal = 0;
  let inicializacion;

  // Prepara los datos iniciales y conserva los cambios entre reinicios.
  const inicializar = () => {
    if (!inicializacion) {
      const preparar = async () => {
        await fs.mkdir(path.dirname(rutaDatos), { recursive: true });

        let contenido;
        
        try {
          contenido = await fs.readFile(rutaDatos, "utf8");
        } catch (error) {

          if (error.code !== "ENOENT") {
            throw error;
          }

          if (!opciones.rutaDatos) {
            try {
              contenido = await fs.readFile(rutaAnterior, "utf8");
            } catch (errorAnterior) {
              if (errorAnterior.code !== "ENOENT") {
                throw errorAnterior;
              }
            }
          }

          // Cuando falta el archivo de trabajo, prepara las colecciones iniciales.
          if (!contenido && opciones.rutaSemilla) {
            contenido = await fs.readFile(opciones.rutaSemilla, "utf8");
          } else if (!contenido) {
            const colecciones = ["usuarios", "ponentes", "participantes", "eventos", "inscripciones", "notificaciones"];
            const datosIniciales = { siguientesIds: {} };

            for (const coleccion of colecciones) {
              const archivo = await fs.readFile(path.join(directorioDatosIniciales, `${coleccion}.json`), "utf8");
              datosIniciales[coleccion] = JSON.parse(archivo);
              datosIniciales.siguientesIds[coleccion] = Math.max(0, ...datosIniciales[coleccion].map((elemento) => elemento.id)) + 1;
            }

            contenido = JSON.stringify(datosIniciales);
          }
        }

        // Prepara las cuentas y comprueba las relaciones antes de guardar.
        const datos = JSON.parse(contenido);
        inicializarUsuarios(datos);
        validarIntegridad(datos);
        
        // El reemplazo ocurre después de escribir el archivo completo.
        const rutaTemporal = `${rutaDatos}.${process.pid}.${contadorTemporal++}.tmp`;

        try {
          await fs.writeFile(rutaTemporal, `${JSON.stringify(datos, null, 2)}\n`, "utf8");
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

  // Ejecuta la validación y los cambios del módulo en una escritura compartida.
  // La cola evita perder cambios entre solicitudes simultáneas del mismo proceso.
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
