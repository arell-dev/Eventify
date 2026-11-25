# Funciones compartidas del backend

Esta carpeta reúne la persistencia, las comprobaciones de datos y las funciones de acceso que utilizan los módulos de Eventify.

## Almacén de datos

`almacen.js` administra `src/datos/eventify.json`, el archivo de trabajo compartido. Cuando todavía no existe, reúne las colecciones de `src/datos/datos-iniciales/`. Al iniciar, prepara las cuentas mediante `usuarios.js` y comprueba los datos mediante `integridad.js` antes de guardarlos.

Los módulos usan `leer()` para consultar los datos y `transaccion()` para validarlos y modificarlos. Las transacciones se ejecutan en orden dentro del proceso y escriben un archivo temporal antes de reemplazar el archivo de trabajo. Así, una inscripción y el perfil de participante que necesita pueden guardarse juntos.

## Integridad de los datos

`integridad.js` actúa como comprobador de la base de datos al iniciar el almacén. Revisa que las colecciones tengan IDs válidos y únicos, ajusta sus contadores y comprueba las relaciones entre usuarios, perfiles, eventos, inscripciones y notificaciones. También revisa que las inscripciones no estén duplicadas y que el cupo cubra las confirmadas. Si encuentra un problema, informa el error antes de guardar los datos inicializados.

Las reglas de cada operación, como validar un horario o comprobar el cupo al inscribir, se aplican en los módulos durante la transacción.

## Usuarios y acceso administrativo

`usuarios.js` se ocupa de las cuentas. Prepara los vínculos con los perfiles, normaliza los correos y ofrece funciones para proteger y comprobar contraseñas. La ruta de sesión busca la cuenta en el almacén y usa estas funciones para autenticar a la persona.

`perfiles.js` comparte los requisitos de alta de Participantes y Ponentes con sus selectores de usuarios. Una cuenta puede pertenecer a ambos módulos si cumple los requisitos de cada uno. Los perfiles conservan la relación con el padrón por `usuarioId`.

Las contraseñas de demostración se editan en `datos-iniciales/usuarios.json`. Al crear el archivo de trabajo se combina cada contraseña con una **sal**, un valor aleatorio guardado junto al resultado de `scrypt`. En `eventify.json` se guarda el resultado como `contrasenaHash`. Dos cuentas con la misma contraseña tienen resultados distintos. Al iniciar sesión se vuelve a calcular el resultado con la sal guardada y se compara con el registrado. Las cuentas ya guardadas conservan sus contraseñas aunque se editen los datos iniciales.

Una cuenta del padrón sin credenciales sigue disponible para crear un perfil de participante o ponente si cumple los requisitos del módulo. El inicio de sesión requiere una credencial válida.

`acceso-administrativo.js` se ocupa de autorizar solicitudes. Su función `requiereAdministrador` consulta la sesión existente y deja pasar la solicitud cuando tiene el rol `ADMIN`. Responde 401 si falta la sesión y 403 si el rol es insuficiente.
