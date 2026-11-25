# Pruebas del backend

Desde `backend/`, ejecuta `npm.cmd test`. Node ejecuta los archivos `*.test.js` con su módulo de pruebas integrado. Las pruebas usan directorios temporales y servidores locales con puertos asignados automáticamente. Al terminar, cierran los servidores y eliminan sus datos temporales.

| Archivo | Qué comprueba |
| --- | --- |
| `almacen.test.js` | Inicialización de las colecciones, roles y vínculos de usuarios con participantes y ponentes, protección de contraseñas, cuentas de padrón sin credenciales, integridad y conservación del archivo ante datos inválidos. También comprueba lecturas simultáneas durante el inicio. |
| `app.test.js` | Estado de la API, inicio y cierre de sesión, restricciones por origen, límite de intentos y acceso administrativo según la sesión y el rol. |
| `eventos.test.js` | Creación y consulta de eventos, horarios, ponentes, cupos, inscripciones relacionadas y datos del catálogo público. |
| `inscripciones.test.js` | Creación, cancelación, reactivación y eliminación de inscripciones, validaciones, cupos y solicitudes simultáneas por el último cupo. |
| `perfiles.test.js` | Permisos, elegibilidad en el padrón, altas simultáneas, edición de ponentes, bajas, historial, agenda, cupos y persistencia de los perfiles. |
| `usuarios.test.js` | Sesión, perfiles, notificaciones, resumen y cancelación de inscripciones propias. Comprueba permisos, la regla del ponente, la competencia por el último cupo, el historial y la persistencia. Verifica los avisos en tiempo real tras la cancelación pública y la reactivación administrativa, incluidos un fallo de persistencia y un reintento idempotente. |

Las pruebas de concurrencia comprueban el comportamiento de una instancia del backend. Las rutas HTTP pueden revisarse adicionalmente con `backend/peticiones/` y la integración visual desde el navegador.
