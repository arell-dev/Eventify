# Eventify

Eventify es una aplicación académica para la consulta y gestión de eventos universitarios. Incluye un área administrativa con sesión y el módulo de Inscripciones, que consulta Eventos y Participantes desde la API. El catálogo público y los demás módulos continúan en desarrollo.

## Integrantes

- Barrutia Ojeda Mauricio
- Mendoza Sacsa Zamira Luana
- Guevara Guerrero Ashley
- Jimenez Chinchay Mateo Sebastian

## Tecnologías

- Angular 20.3, TypeScript y Bootstrap 5.3.9 para la interfaz.
- Node.js 24 y Express 5 para la API REST.
- Archivos JSON para la persistencia local de la API.

## Arquitectura

El proyecto contiene `frontend/` y `backend/`, cada uno con sus propias dependencias. Ambas aplicaciones se organizan por funcionalidades. La arquitectura contempla cuatro módulos administrativos: Eventos, Participantes, Inscripciones y Ponentes. En esta integración se incluyen Inscripciones, el acceso administrativo y la navegación compartida. El catálogo público aún no está implementado.

Las vistas administrativas están bajo `/admin`. El módulo de Inscripciones ofrece listado, búsqueda, filtros, alta, detalle, cambios de estado y eliminación de registros cancelados. Sus consultas de eventos, participantes y sesiones se protegen en la API. El almacén JSON compartido conserva los datos entre reinicios, y el proxy de Angular dirige las solicitudes `/api` al servidor local. Las rutas del catálogo público aún no están disponibles.

La sesión de demostración usa un administrador configurado en el entorno del backend. No guardes las credenciales ni la clave de sesión en archivos versionados.

## Requisitos

Instala Node.js 24 y npm. En Windows, los comandos siguientes usan `npm.cmd`.

## Inicio local

En una terminal, desde la raíz del repositorio:

```powershell
cd backend
npm.cmd ci
$env:ADMIN_USUARIO = 'admin@utp.edu.pe'
$env:ADMIN_CONTRASENA = 'cambia-esta-contrasena-local'
$env:SESSION_SECRET = 'clave-de-sesion-local'
npm.cmd start
```

En otra terminal:

```powershell
cd frontend
npm.cmd ci
npm.cmd start
```

La interfaz estará disponible en `http://localhost:4200` y la API en `http://localhost:3000`. El endpoint `GET /api/estado` permite comprobar el servidor y el proxy.

## Verificación

Ejecuta `npm.cmd test` en `backend/` y `npm.cmd run build` en `frontend/`. El archivo `backend/peticiones.http` contiene solicitudes para comprobar la API inicial.
