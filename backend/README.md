# Backend de Eventos UTP

La API requiere Node.js 24. Inicia el servidor desde esta carpeta con `npm start`.

Antes de iniciar, configura en el entorno local las variables `ADMIN_USUARIO`, `ADMIN_CONTRASENA` y `SESSION_SECRET`. El servidor no inicia si falta alguna. Mantén sus valores fuera del repositorio y de los archivos versionados.

La sesión administrativa usa una cookie HTTP-only con vigencia de una hora. `POST /api/sesion` recibe `{ "usuario": "...", "contrasena": "..." }`. La API acepta inicio y cierre de sesión desde `http://localhost:4200`. Inscripciones, eventos y participantes requieren sesión con rol `ADMIN`.

Los catálogos administrativos se leen del almacén compartido. El endpoint de eventos incluye los campos calculados `inscripcionesConfirmadas` y `cuposDisponibles`, que reflejan las inscripciones confirmadas actuales.
