# Backend de Eventos UTP

La API requiere Node.js 24. Ejecuta `npm.cmd ci` y `npm.cmd start` desde esta carpeta. El servidor escucha en `http://localhost:3000`.

El archivo de trabajo `src/datos/eventify.json` conserva usuarios, perfiles, eventos, inscripciones y notificaciones entre reinicios. Al iniciar por primera vez se crea reuniendo los archivos de `src/datos/datos-iniciales/`. Si hay datos inconsistentes, se informa el error sin modificar el archivo.

Los datos iniciales tienen un archivo por colección. Los perfiles de ponentes y participantes apuntan a `usuarios` mediante `usuarioId`. Cada evento apunta a su ponente mediante `ponenteId`, y cada inscripción vincula `eventoId` con `participanteId`. Los cupos se calculan contando las inscripciones confirmadas. Los cambios se guardan juntos en el archivo de trabajo.

Al arrancar, `src/comun/almacen.js` lee el archivo de trabajo o reúne los datos iniciales. Después prepara las cuentas y comprueba las relaciones antes de guardar. Las rutas de cada módulo usan el mismo almacén. Las operaciones de escritura se ejecutan en orden y guardan primero un archivo temporal, de modo que evento, participante e inscripción se actualizan en conjunto.

La carpeta `src/comun/` contiene las funciones compartidas por los módulos.

- `almacen.js` inicializa, lee y guarda las colecciones. Su función `transaccion` permite validar y modificar datos relacionados antes de escribirlos juntos.
- `integridad.js` comprueba los identificadores, referencias y cupos al preparar el almacén.
- `usuarios.js` prepara las cuentas, normaliza correos y verifica o protege contraseñas.
- `acceso-administrativo.js` verifica la sesión y el rol antes de permitir el acceso administrativo.

La cuenta inicial del docente y las cuentas de ejemplo están en `src/datos/datos-iniciales/usuarios.json`. Su campo `contrasena` se puede editar para preparar una instalación nueva. Durante la inicialización se calcula un hash `scrypt` con una sal diferente para cada cuenta y se guarda como `contrasenaHash` en el archivo de trabajo. El inicio de sesión consulta ese archivo. Cambiar los datos iniciales no modifica las cuentas ya guardadas. Estas credenciales visibles son de demostración local.

La sesión utiliza una cookie HTTP-only que vence después de una hora. `POST /api/sesion` recibe `usuario` y `contrasena`. El rol `ADMIN` accede a recursos administrativos. El rol `USUARIO` consulta el catálogo, su inscripción y sus avisos. El inicio, cierre y las operaciones de modificación comprueban el origen `http://localhost:4200`.

Las notificaciones de asignación y cambios de eventos se guardan dentro del sistema y se consultan mediante `GET /api/notificaciones`. El backend no envía correos.

Las pruebas se ejecutan con `npm.cmd test`. El almacén JSON y la sesión en memoria están destinados a una demostración local de una sola instancia.
